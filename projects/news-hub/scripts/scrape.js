#!/usr/bin/env node

/**
 * BattleBots News Scraper — Bright Data Crawl API
 *
 * Uses the Bright Data Crawl API to crawl battlebots.com for articles/news,
 * returning clean markdown content for downstream processing.
 *
 * Usage:
 *   BRIGHT_DATA_API_TOKEN=<your-token> node scripts/scrape.js
 *
 * API docs: https://docs.brightdata.com/scraping-automation/web-data-apis/web-scraper
 */

const fs = require("fs");
const path = require("path");

const API_URL = "https://api.brightdata.com/request";
const TOKEN = process.env.BRIGHT_DATA_API_TOKEN;

if (!TOKEN) {
  console.error(
    "Error: BRIGHT_DATA_API_TOKEN env var is required.\n" +
      "  export BRIGHT_DATA_API_TOKEN=<your-api-token>\n" +
      "  node scripts/scrape.js"
  );
  process.exit(1);
}

// URLs to crawl — battlebots.com news & article pages
const TARGETS = [
  "https://battlebots.com",
  "https://battlebots.com/news",
  "https://battlebots.com/blog",
  "https://battlebots.com/events",
];

const OUTPUT_DIR = path.join(__dirname, "..", "data", "crawled");

/**
 * Send a single crawl request to Bright Data Crawl API.
 *
 * POST https://api.brightdata.com/request
 * Headers:
 *   Authorization: Bearer <token>
 *   Content-Type: application/json
 * Body:
 *   {
 *     "zone": "<crawl-api-zone>",
 *     "url": "<target-url>",
 *     "format": "raw",
 *     "data_format": "markdown"
 *   }
 *
 * Returns markdown-formatted page content.
 */
async function crawlPage(url) {
  console.log(`  Crawling: ${url}`);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone: "crawl_api",
      url,
      format: "raw",
      data_format: "markdown",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Crawl API error ${res.status} for ${url}: ${body}`);
  }

  return res.text();
}

/**
 * Sanitize a URL into a safe filename.
 */
function urlToFilename(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/_$/, "");
}

async function main() {
  console.log("BattleBots News Scraper — Bright Data Crawl API\n");

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = [];

  for (const url of TARGETS) {
    try {
      const markdown = await crawlPage(url);
      const filename = `${urlToFilename(url)}.md`;
      const filepath = path.join(OUTPUT_DIR, filename);

      fs.writeFileSync(filepath, markdown, "utf-8");
      console.log(`  Saved: data/crawled/${filename} (${markdown.length} chars)`);

      results.push({ url, filename, chars: markdown.length, status: "ok" });
    } catch (err) {
      console.error(`  Failed: ${url} — ${err.message}`);
      results.push({ url, status: "error", error: err.message });
    }
  }

  // Write summary
  const summary = {
    crawled_at: new Date().toISOString(),
    targets: results,
    total: results.length,
    success: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "error").length,
  };

  const summaryPath = path.join(OUTPUT_DIR, "_crawl_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");

  console.log(
    `\nDone: ${summary.success}/${summary.total} pages crawled successfully.`
  );
  console.log(`Summary: data/crawled/_crawl_summary.json`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
