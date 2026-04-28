#!/usr/bin/env node
/**
 * BattleBots Fight Gallery — Bright Data Browser API Scraper
 *
 * Scrapes Reddit r/battlebots image posts and YouTube fight thumbnails
 * using Bright Data's Web Unlocker API, then saves results to data/scraped/.
 *
 * HOW IT WORKS
 * ────────────
 * Bright Data's Browser API lets you run a full Playwright browser on their
 * infrastructure so JS-heavy pages (Reddit galleries, YouTube) render fully
 * before you extract content. This script uses the simpler Web Unlocker
 * endpoint (POST https://api.brightdata.com/request) which returns rendered
 * page content as markdown — perfect for pulling image URLs from Reddit
 * galleries and YouTube thumbnails without running a local browser.
 *
 * SETUP
 * ─────
 * 1. Sign up at https://brightdata.com and create a Web Unlocker zone
 *    (zone name: "web_unlocker1" by default).
 * 2. Copy your API token from the dashboard.
 * 3. Export it:  export BRIGHT_DATA_API_TOKEN="your-token-here"
 * 4. Run:       npm run scrape
 *
 * FOR FULL BROWSER API (Playwright)
 * ──────────────────────────────────
 * If you need to interact with pages (click "load more", scroll infinite
 * feeds, bypass anti-bot), use Bright Data's Scraping Browser instead:
 *
 *   const { chromium } = require('playwright');
 *   const browser = await chromium.connectOverCDP(
 *     'wss://brd-customer-CUSTOMER_ID-zone-scraping_browser1:PASSWORD@brd.superproxy.io:9222'
 *   );
 *   const page = await browser.newPage();
 *   await page.goto('https://www.reddit.com/r/battlebots/top/?t=week');
 *   // ... interact, screenshot, extract ...
 *
 * See https://docs.brightdata.com/scraping-automation/scraping-browser
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN;
const API_URL = 'https://api.brightdata.com/request';
const ZONE = 'web_unlocker1';
const OUT_DIR = path.join(__dirname, '..', 'data', 'scraped');

const TARGETS = [
  {
    name: 'reddit-battlebots-top-week',
    url: 'https://www.reddit.com/r/battlebots/top/?t=week',
    description: 'Top posts this week from r/battlebots',
  },
  {
    name: 'reddit-battlebots-fights',
    url: 'https://www.reddit.com/r/battlebots/search/?q=fight+KO&restrict_sr=1&sort=new',
    description: 'Recent fight KO posts from r/battlebots',
  },
  {
    name: 'reddit-battlebots-photos',
    url: 'https://www.reddit.com/r/battlebots/search/?q=flair%3APhoto&restrict_sr=1&sort=new',
    description: 'Photo-flaired posts from r/battlebots',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * POST a URL to Bright Data Web Unlocker and get back rendered markdown.
 */
function fetchViaWebUnlocker(targetUrl) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      zone: ZONE,
      url: targetUrl,
      format: 'raw',
    });

    const urlObj = new URL(API_URL);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        } else {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_TOKEN) {
    console.error(
      '\n  Missing BRIGHT_DATA_API_TOKEN.\n' +
      '  Export it first:\n\n' +
      '    export BRIGHT_DATA_API_TOKEN="your-token"\n' +
      '    npm run scrape\n'
    );
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ts = timestamp();
  const results = [];

  for (const target of TARGETS) {
    console.log(`  Scraping: ${target.description}`);
    console.log(`  URL:      ${target.url}`);

    try {
      const markdown = await fetchViaWebUnlocker(target.url);
      const filename = `${target.name}_${ts}.md`;
      const filepath = path.join(OUT_DIR, filename);
      fs.writeFileSync(filepath, markdown, 'utf-8');
      console.log(`  Saved:    data/scraped/${filename}  (${(markdown.length / 1024).toFixed(1)} KB)`);
      results.push({ name: target.name, file: filename, size: markdown.length, ok: true });
    } catch (err) {
      console.error(`  Error:    ${err.message}`);
      results.push({ name: target.name, error: err.message, ok: false });
    }

    console.log();
  }

  // Write a manifest so downstream code knows what was scraped
  const manifest = {
    scrapedAt: new Date().toISOString(),
    zone: ZONE,
    results,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, `manifest_${ts}.json`),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`  Done. ${ok} succeeded, ${fail} failed.`);
  console.log(`  Output:  data/scraped/\n`);
}

main();
