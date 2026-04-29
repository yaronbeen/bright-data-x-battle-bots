/**
 * Scrape BattleBots wiki pages using Bright Data Web Unlocker API.
 *
 * Usage:
 *   BRIGHT_DATA_API_TOKEN=<your-token> node scripts/scrape.js
 *
 * Fetches canonical BattleBots pages from battlebots.com, battlebots.fandom.com,
 * and r/battlebots,
 * converts them to markdown via Web Unlocker, and saves
 * raw responses to data/scraped/.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRAPED_DIR = join(__dirname, "..", "data", "scraped");

const API_URL = "https://api.brightdata.com/request";

const BOTS = [
  { name: "Minotaur", slug: "Minotaur_(BattleBots)" },
  { name: "Tombstone", slug: "Tombstone" },
  { name: "Hydra", slug: "Hydra_(BattleBots)" },
  { name: "End Game", slug: "End_Game" },
  { name: "Witch Doctor", slug: "Witch_Doctor" },
];

const CANONICAL_SOURCES = [
  { name: "official-robots", url: "https://battlebots.com/robots/" },
  { name: "battlebots-wiki-home", url: "https://battlebots.fandom.com/wiki/BattleBots_Wiki" },
  { name: "reddit-battlebots", url: "https://www.reddit.com/r/battlebots/" },
];

async function scrape() {
  const token = process.env.BRIGHT_DATA_API_TOKEN;
  if (!token) {
    console.error("Error: BRIGHT_DATA_API_TOKEN env var is required.");
    console.error("  export BRIGHT_DATA_API_TOKEN=<your-token>");
    process.exit(1);
  }

  await mkdir(SCRAPED_DIR, { recursive: true });

  console.log(`Scraping ${BOTS.length} bot wiki pages via Bright Data Web Unlocker...\n`);

  for (const source of CANONICAL_SOURCES) {
    const outPath = join(SCRAPED_DIR, `${source.name}.md`);
    console.log(`  [source] Fetching ${source.url}`);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          zone: "web_unlocker1",
          url: source.url,
          format: "raw",
          data_format: "markdown",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`  [source] HTTP ${res.status}: ${body.slice(0, 200)}`);
        continue;
      }

      const markdown = await res.text();
      await writeFile(outPath, markdown, "utf-8");
      console.log(`  [source] Saved ${source.name}.md (${(markdown.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  [source] Failed: ${err.message}`);
    }
  }

  for (const bot of BOTS) {
    const wikiUrl = `https://battlebots.fandom.com/wiki/${bot.slug}`;
    const filename = `${bot.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    const outPath = join(SCRAPED_DIR, filename);

    console.log(`  [${bot.name}] Fetching ${wikiUrl}`);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          zone: "web_unlocker1",
          url: wikiUrl,
          format: "raw",
          data_format: "markdown",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`  [${bot.name}] HTTP ${res.status}: ${body.slice(0, 200)}`);
        continue;
      }

      const markdown = await res.text();
      await writeFile(outPath, markdown, "utf-8");
      console.log(`  [${bot.name}] Saved ${filename} (${(markdown.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  [${bot.name}] Failed: ${err.message}`);
    }
  }

  console.log("\nDone. Raw markdown saved to data/scraped/");
}

scrape();
