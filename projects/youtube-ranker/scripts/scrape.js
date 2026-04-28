#!/usr/bin/env node

/**
 * BattleBots YouTube Scraper — Bright Data YouTube Scraper API
 *
 * Uses Bright Data's Dataset API to trigger a YouTube video search collection.
 *
 * API docs: https://docs.brightdata.com/scraping-automation/web-data-apis/web-scraper-api/overview
 *
 * ── How it works ──
 * 1. POST to /datasets/v3/trigger to start a collection run
 *    - dataset_id: the YouTube Videos dataset (see Bright Data dashboard)
 *    - The body contains an array of input objects with search queries
 *    - discover_by: "keyword" tells the API to search YouTube for matching videos
 * 2. The API returns a snapshot_id — the collection runs asynchronously
 * 3. Poll GET /datasets/v3/progress/{snapshot_id} until status is "ready"
 * 4. Download results from GET /datasets/v3/snapshot/{snapshot_id}?format=json
 *
 * ── Environment ──
 *   BRIGHT_DATA_API_TOKEN  — your Bright Data API token (required)
 *   BD_DATASET_ID          — YouTube Videos dataset ID (default: gd_lk50hbr313mx6214x3)
 *
 * ── Usage ──
 *   BRIGHT_DATA_API_TOKEN=your_token node scripts/scrape.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ── Config ──
const API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN;
const DATASET_ID = process.env.BD_DATASET_ID || "gd_lk50hbr313mx6214x3";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "videos.json");
const POLL_INTERVAL_MS = 10_000; // 10 seconds between status checks
const MAX_POLLS = 60; // give up after 10 minutes

if (!API_TOKEN) {
  console.error("Error: BRIGHT_DATA_API_TOKEN environment variable is required.");
  console.error("Get your token from: https://brightdata.com/cp/setting/api_token");
  process.exit(1);
}

// ── Helper: make HTTPS request ──
function request(method, urlStr, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Step 1: Trigger the collection ──
async function triggerCollection() {
  console.log("Triggering YouTube search collection via Bright Data...");
  console.log(`  Dataset ID: ${DATASET_ID}`);
  console.log(`  Search query: "BattleBots fight"\n`);

  // The trigger endpoint expects:
  //   POST https://api.brightdata.com/datasets/v3/trigger
  //     ?dataset_id=<id>
  //     &discover_by=keyword
  //     &limit_per_input=40
  //
  // Body: array of input objects, each with a "keyword" field
  const url =
    `https://api.brightdata.com/datasets/v3/trigger` +
    `?dataset_id=${DATASET_ID}` +
    `&discover_by=keyword` +
    `&limit_per_input=40`;

  const body = [
    { keyword: "BattleBots fight" },
  ];

  const result = await request("POST", url, body);
  console.log("Collection triggered:", result);
  return result.snapshot_id;
}

// ── Step 2: Poll for completion ──
async function waitForCompletion(snapshotId) {
  console.log(`\nPolling for snapshot ${snapshotId}...`);

  for (let i = 0; i < MAX_POLLS; i++) {
    const progress = await request(
      "GET",
      `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`
    );

    console.log(`  [${i + 1}/${MAX_POLLS}] Status: ${progress.status}`);

    if (progress.status === "ready") {
      return true;
    }

    if (progress.status === "failed") {
      throw new Error(`Collection failed: ${JSON.stringify(progress)}`);
    }

    // Wait before next poll
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Timed out waiting for collection to complete");
}

// ── Step 3: Download results ──
async function downloadResults(snapshotId) {
  console.log(`\nDownloading results for snapshot ${snapshotId}...`);

  const results = await request(
    "GET",
    `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`
  );

  // Transform Bright Data YouTube results into our app's format
  const videos = results
    .filter((v) => v.title && v.views)
    .map((v) => ({
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnail || `https://img.youtube.com/vi/${extractVideoId(v.url)}/hqdefault.jpg`,
      views: v.views || 0,
      likes: v.likes || 0,
      comments: v.num_comments || 0,
      duration: v.duration || "0:00",
      uploadDate: v.date_posted || new Date().toISOString().split("T")[0],
      botA: extractBotName(v.title, 0),
      botB: extractBotName(v.title, 1),
      season: extractSeason(v.title, v.description),
    }))
    .sort((a, b) => b.views - a.views);

  return videos;
}

// ── Helpers for transforming results ──

function extractVideoId(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get("v") || url.split("/").pop();
  } catch {
    return "";
  }
}

function extractBotName(title, index) {
  // Attempt to parse "BotA vs BotB" from title
  const vsMatch = title.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s*[—–\-|]|$)/i);
  if (vsMatch) {
    return vsMatch[index + 1].trim();
  }
  return index === 0 ? "Unknown" : "Unknown";
}

function extractSeason(title, description = "") {
  const text = `${title} ${description}`;
  const match = text.match(/season\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

// ── Main ──
async function main() {
  try {
    const snapshotId = await triggerCollection();
    await waitForCompletion(snapshotId);
    const videos = await downloadResults(snapshotId);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(videos, null, 2));
    console.log(`\nDone! Saved ${videos.length} videos to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("\nScrape failed:", err.message);
    process.exit(1);
  }
}

main();
