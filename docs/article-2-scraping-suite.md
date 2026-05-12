# Scraping YouTube, Wiki & Reddit to Build a BattleBots Data Suite

I needed real fight data from YouTube, bot stats from a wiki that blocks scrapers, and media from Reddit. Three different sources, three different problems, one data suite.

This is the story of building three BattleBots web apps from scraped data: a YouTube fight ranker, a bot encyclopedia, and a media gallery. Each one taught me something different about web scraping in 2024.

## The YouTube Scraper

The YouTube Ranker needed real fight videos ranked by views, likes, and engagement. I could've used yt-dlp or the YouTube Data API, but both require managing quotas or local dependencies. I went with [Bright Data's YouTube Scraper](https://brightdata.com/products/web-scraper/youtube) because it handles the async collection and gives me structured data without quota management.

The YouTube Scraper works differently from the SERP API I used in the H2H project. It's asynchronous. You trigger a collection, poll for completion, then download results. Three steps:

```javascript
// Step 1: Trigger the collection
async function triggerCollection() {
  const url =
    `https://api.brightdata.com/datasets/v3/trigger` +
    `?dataset_id=${DATASET_ID}` +
    `&discover_by=keyword` +
    `&limit_per_input=40`;

  const body = [{ keyword: "BattleBots fight" }];
  const result = await request("POST", url, body);
  return result.snapshot_id;
}

// Step 2: Poll for completion
async function waitForCompletion(snapshotId) {
  for (let i = 0; i < MAX_POLLS; i++) {
    const progress = await request(
      "GET",
      `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`
    );
    if (progress.status === "ready") return true;
    if (progress.status === "failed") throw new Error("Collection failed");
    await new Promise((r) => setTimeout(r, 10_000)); // 10s between checks
  }
}

// Step 3: Download results
async function downloadResults(snapshotId) {
  const results = await request(
    "GET",
    `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`
  );
  return results;
}
```

The `discover_by=keyword` parameter tells the API to search YouTube for matching videos. I set `limit_per_input=40` to get a good sample size. The collection typically takes 30-90 seconds to complete, so the polling loop checks every 10 seconds.

What comes back is structured data: title, URL, thumbnail, views, likes, comment count, duration, upload date. No HTML parsing. No fighting with YouTube's constantly-changing DOM. The data just arrives clean.

I then transform it into my app's format, extracting bot names from titles (most BattleBots videos follow a "BotA vs BotB" pattern) and sorting by view count.

## Web Unlocker for the BattleBots Wiki

The encyclopedia project needed detailed bot stats: weapon type, team, weight class, win/loss records, season appearances. The best source is the BattleBots Fandom wiki.

Problem: Fandom sites use Cloudflare protection that blocks regular fetch requests. I tried a plain `fetch()` first and got 403s every time. You could try cheerio with a headless Puppeteer session, but fandom.com blocks headless browsers too.

[Bright Data's Web Unlocker](https://brightdata.com/products/web-unlocker) handles this. It manages browser fingerprinting, CAPTCHA solving, and IP rotation so you don't have to. The API is the same POST-to-`/request` pattern as the SERP API, just with a different zone:

```javascript
const API_URL = "https://api.brightdata.com/request";

for (const bot of BOTS) {
  const wikiUrl = `https://battlebots.fandom.com/wiki/${bot.slug}`;

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

  const markdown = await res.text();
  await writeFile(outPath, markdown, "utf-8");
}
```

The `data_format: "markdown"` option is worth calling out. Instead of getting raw HTML that I'd need to parse with cheerio or jsdom, I get clean markdown. For a wiki page, that's almost perfect as-is: headings, tables, lists, all preserved in a readable format.

I scraped 5 individual bot pages (Minotaur, Tombstone, Hydra, End Game, Witch Doctor) plus the main robots listing page, the wiki homepage, and the r/battlebots subreddit. The whole batch runs in about 15 seconds.

## Normalizing Scraped Data

Raw scraped data is messy. The YouTube API returns view counts as integers, but some are strings. Wiki markdown has inconsistent heading levels. Bot names appear differently across sources ("End Game" vs "End_Game" vs "EndGame").

I spent probably more time on data normalization than on the actual scraping. A few things I learned:

**Always filter before transforming.** The YouTube results include videos that have a title but no view count, or that are unrelated to actual fights. Filtering first (`results.filter(v => v.title && v.views)`) keeps the transform step clean.

**Parse defensively.** The "BotA vs BotB" title pattern works for 80% of videos. For the rest, I fall back to "Unknown" rather than crashing:

```javascript
function extractBotName(title, index) {
  const vsMatch = title.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s*[—–\-|]|$)/i);
  if (vsMatch) return vsMatch[index + 1].trim();
  return "Unknown";
}
```

**Normalize once, use everywhere.** Each scraper writes to a `data/` directory in its project folder. The frontends read from those JSON files at build time. If the data shape changes, I only need to update the scraper output, not every component that consumes it.

## The Data Quality Surprise

The messiest problem wasn't scraping. It was duplicate results. The YouTube API returns the same fight uploaded by different channels, sometimes with slightly different titles ("Tombstone vs Minotaur" vs "TOMBSTONE VS MINOTAUR — FULL FIGHT"). I ended up deduplicating on video ID, but for wiki data the problem was worse: the same bot appears under different names across sources ("End Game" vs "End_Game" vs "EndGame"). I had to normalize bot names before any cross-source joins worked. This is the kind of thing you only discover when you're working with real scraped data, never with mock fixtures.

## The Gallery: Reusing YouTube Thumbnails

The [Fight Gallery](https://battlebots-gallery.pages.dev) needed actual fight images. I didn't want to scrape and host images directly (copyright concerns, storage costs). Instead, I reused YouTube video thumbnails.

Every YouTube video has a predictable thumbnail URL:

```
https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg
```

The YouTube Scraper returns this in the `thumbnail` field, but even when it doesn't, I can construct it from the video URL. Free, always available, and the images actually show real fight moments. Good enough for a gallery.

## The Live Sites

All three projects are live:

- **[BattleBots YouTube Ranker](https://battlebots-youtube.pages.dev)** — fight videos ranked by engagement
- **[BattleBots Encyclopedia](https://battlebots-encyclopedia.pages.dev)** — bot profiles from wiki data
- **[BattleBots Fight Gallery](https://battlebots-gallery.pages.dev)** — fight media and thumbnails

**Markdown output is underrated.** Asking for `data_format: "markdown"` instead of raw HTML means no cheerio, no DOM traversal, no CSS selectors. For content-heavy pages like wiki articles, the markdown is almost ready to render directly.

**Async scraping is fine.** I was initially annoyed that the YouTube Scraper uses a trigger/poll/download flow instead of returning results immediately. But it makes sense for larger collections. The 30-90 second wait is a one-time cost during data collection, not something your users see.

The total scraping code across all four projects is about 650 lines of JavaScript. The data normalization and frontend code is 10x that. Which tells you where the actual work is.
