# I Built 5 BattleBots Apps for $6. Here's Every Scraping Pattern I Used.

> "Reddit leans toward Minotaur. Confidence: strong. Fans consistently cite its drum reliability and knockout power."

That's not me talking. That's an AI reading through dozens of Reddit threads and writing a sports-analyst-style verdict about a robot combat matchup. You pick two BattleBots, click a button, and 8 seconds later you get a cited, sourced opinion on who the internet thinks would win.

Total cost to build and run all five apps: about $6. Hosting is free forever.

I built this for the [Bright Data x BattleBots developer challenge](https://brightdata.com/lp/battelbots) (#battlebotsdev). Full disclosure: I'm a Bright Data DevRel ambassador. The code is open source and every site is live.

The BattleBots angle is just the excuse. The real question: what happens when you try to pull structured data from Google, YouTube, protected wikis, and Reddit, then turn it all into something useful?

## Five Apps, Four Bright Data Products, One Repo

| Project | What it does | Bright Data product | Try it |
|---------|-------------|---------------------|--------|
| **H2H Predictor** | Pick two robots, get a Reddit-powered verdict | SERP API | [Live](https://battlebots-h2h.pages.dev) |
| **Bot Encyclopedia** | 30 robots with stats, weapons, win rates | Web Unlocker | [Live](https://battlebots-encyclopedia.pages.dev) |
| **YouTube Ranker** | Real fight videos ranked by engagement | YouTube Scraper | [Live](https://battlebots-youtube.pages.dev) |
| **News Hub** | Latest BattleBots articles from across the web | Crawl API + SERP | [Live](https://battlebots-news.pages.dev) |
| **Fight Gallery** | Visual fight moments with real thumbnails | Built on YouTube Scraper data | [Live](https://battlebots-gallery.pages.dev) |

All the code: [github.com/yaronbeen/bright-data-x-battle-bots](https://github.com/yaronbeen/bright-data-x-battle-bots)

---

## How I Turned Reddit Arguments Into AI Verdicts

This is the project I'm most proud of. BattleBots fans argue constantly on Reddit about which robot would beat which. I wanted to turn those arguments into a structured, cited verdict.

**What Bright Data's SERP API does:** You give it a Google search URL, it gives you back structured JSON. The key is a parameter called `brd_json=1`. Append that to any Google search, and instead of raw HTML you get parsed results: titles, URLs, descriptions, ranking positions. One POST request, clean data back.

I chose this over Google's Custom Search API (which I've used before) because `brd_json=1` meant zero HTML parsing on my end. Google Custom Search would work too, especially at my volume (~200 predictions over a month, well within the free tier). But I wanted to focus time on the sentiment pipeline, not on parsing search results.

Here's the core of it:

```javascript
// One POST to Bright Data, structured Google results back
const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=us&hl=en&brd_json=1`;

const res = await fetch('https://api.brightdata.com/request', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ zone: 'web_unlocker1', url: searchUrl, format: 'raw' }),
});

const data = await res.json();
// data.organic[] = [{ title, url, description, position }, ...]
```

For each matchup I fire 6 of these in parallel (3 per bot), collect 40-80 Reddit results, run quick keyword scoring to give the LLM structured signal, then Claude Haiku 4.5 writes the actual verdict with cited quotes.

```javascript
function buildQueries(bot, opponent) {
  return [
    `site:reddit.com/r/battlebots ${bot.name} vs ${opponent.name}`,
    `site:reddit.com/r/battlebots ${bot.name} ${bot.weapon}`,
    `site:reddit.com battlebots ${bot.name} opinion`,
  ];
}
```

The keyword scoring is deliberately rough. 19 positive words, 19 negative words, `String.includes()`. It's a pre-filter, not a precision instrument. The LLM is what turns noisy counts into a coherent narrative. [Try a matchup yourself.](https://battlebots-h2h.pages.dev)

---

## How I Scraped a Wiki That Blocks Every Scraper

The encyclopedia needed detailed bot stats from the BattleBots Fandom wiki. Problem: try `fetch("https://battlebots.fandom.com/wiki/Minotaur")` and you get a 403. Every time. Fandom runs aggressive Cloudflare bot protection that detects headless browsers, blocks datacenter IPs, and serves CAPTCHAs.

**What Bright Data's Web Unlocker does:** It handles browser fingerprinting, CAPTCHA solving, and IP rotation behind a single API call. You send a URL, it returns the page content as if a real browser visited it. It's not just a proxy. It's a full request pipeline that manages cookies, TLS fingerprints, and challenge responses automatically.

The feature that sold me: `data_format: "markdown"`. Instead of raw HTML I'd need to parse with cheerio, I get clean markdown. For a wiki page, that's headings, tables, stats, all in a format I can work with directly.

```javascript
const res = await fetch("https://api.brightdata.com/request", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    zone: "web_unlocker1",
    url: "https://battlebots.fandom.com/wiki/Minotaur_(BattleBots)",
    format: "raw",
    data_format: "markdown",  // ← this is the trick
  }),
});
const markdown = await res.text(); // clean wiki content, no HTML parsing needed
```

Could I have used Puppeteer with stealth plugins? Maybe. I've done it on other sites. Fandom's detection has gotten aggressive enough that I chose not to fight it for this project. Your mileage may vary.

I scraped 8 pages total (5 bot profiles + 3 reference pages). The rest of the 30-bot roster was built from structured data I compiled from the scraped wiki content plus official BattleBots sources. [Browse the encyclopedia.](https://battlebots-encyclopedia.pages.dev)

---

## 16 Real Fight Videos, Zero YouTube API Quota Headaches

YouTube's official API gives you 10,000 quota units per day. A single search costs 100 units. That's 100 searches before you're locked out until tomorrow. For a one-time data collection, it works. For iteration during development, it's annoying.

**What Bright Data's YouTube Scraper does:** It's part of their [Web Scraper API](https://brightdata.com/products/web-scraper/youtube). You give it a keyword, it searches YouTube, collects video metadata (title, URL, thumbnail, views, likes, comments, duration, upload date), and returns structured JSON. The catch: it's async. You trigger a collection, poll for completion (30-90 seconds), then download results.

I could've used yt-dlp, which is free, has no quotas, and handles search + metadata in a single command. It's a legitimate alternative. I went with Bright Data's scraper because I was already using their other APIs and the structured output format was consistent with the rest of my pipeline.

The bonus: every YouTube video has a thumbnail at `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`. Those video IDs power both the YouTube Ranker and the Fight Gallery. Two apps, one data source, zero image hosting costs.

[See the rankings.](https://battlebots-youtube.pages.dev) | [Browse the gallery.](https://battlebots-gallery.pages.dev)

---

## Pulling News From 14 Sources Without 14 Scrapers

The News Hub needed articles from across the web: battlebots.com, Reddit, the Fandom wiki, Hollywood Reporter, TripAdvisor (people review the live Vegas show), and more.

I used two Bright Data products together. **SERP API** to discover articles (searching Google for "battlebots 2025 news" returns real articles from real publishers). Then **Crawl API** to extract content from the pages I found. The Crawl API works the same way as Web Unlocker (POST a URL, get content back) but is designed for fetching page content rather than bypassing bot protection. With `data_format: "markdown"`, I get clean text instead of HTML.

I used SERP to find the articles, then curated the results into the news feed manually. The scraper in the repo handles the 3 canonical sources (battlebots.com, wiki, Reddit). The broader article discovery was done via SERP queries during development.

[Read the latest.](https://battlebots-news.pages.dev)

---

## The Part Nobody Talks About: Why Data Cleanup Took Longer Than Scraping

Here's what nobody mentions in "I built X with Y API" posts. The scraping worked. Every API call returned data. The problem was making that data agree with itself.

YouTube returns the same fight uploaded by different channels. "Tombstone vs Minotaur" and "TOMBSTONE VS MINOTAUR — FULL FIGHT" are the same fight from different uploaders. Deduplicating on video ID handles that.

But across sources, the same robot appears as "End Game", "End_Game", and "EndGame." I wrote a normalizer, added a manual alias map for the worst offenders, and still spent more time on entity matching than on any single API call.

```javascript
// Normalize bot names across sources
function normalizeBot(name) {
  return name.toLowerCase().replace(/[-_\s]+/g, ' ').trim();
}
// "End_Game" → "end game"  ✓
// "EndGame"  → "endgame"   ✗ — still doesn't match
// Solution: manual alias map for the 5-6 bots where this breaks
```

The cache layer was the other piece that took real engineering. I didn't want to pay for the same SERP + LLM calls twice for the same matchup:

```javascript
// "minotaur vs tombstone" and "tombstone vs minotaur" → same cache key
export function matchupKey(botAId, botBId) {
  return [botAId, botBId].sort().join('::');
}
```

MongoDB Atlas free tier, 24-hour TTL, auto-expiring documents. If the database is down, the app still works. Just slower. First matchup: 8 seconds. Cached repeat: under a second.

If you're building anything that pulls data from multiple web sources, budget twice the time you think for normalization and caching. The APIs will work. The data won't agree with itself.

---

## What Five Live Apps Actually Cost Me

I tracked real spend over a month of development. About 200 matchup predictions, plus all the scraper runs:

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Pages (5 sites) | $0 | Free tier, stays free |
| MongoDB Atlas (caching) | $0 | Free M0 tier, 512MB |
| Bright Data SERP API | ~$3 | ~1,200 queries (200 predictions x 6 each) |
| Claude Haiku 4.5 via OpenRouter | ~$2 | ~200 LLM calls. Check [openrouter.ai](https://openrouter.ai) for current per-token rates |
| Bright Data YouTube Scraper + Web Unlocker | ~$1 | One-time scraper runs |
| **Total** | **~$6** | |

In production with caching, repeat matchups cost nothing. Hosting stays free. If nobody runs a new matchup, the monthly cost is $0.

---

## Go Break Something

Everything is live and open source. The H2H Predictor will give you a verdict on any matchup. The Encyclopedia has 30 bots you can search. The YouTube Ranker will show you which fights the internet watches most.

| | Live Site | Code |
|---|---|---|
| H2H Predictor | [battlebots-h2h.pages.dev](https://battlebots-h2h.pages.dev) | [GitHub](https://github.com/yaronbeen/bright-data-x-battle-bots) |
| Encyclopedia | [battlebots-encyclopedia.pages.dev](https://battlebots-encyclopedia.pages.dev) | [GitHub](https://github.com/yaronbeen/bright-data-x-battle-bots/tree/main/projects/bot-encyclopedia) |
| YouTube Ranker | [battlebots-youtube.pages.dev](https://battlebots-youtube.pages.dev) | [GitHub](https://github.com/yaronbeen/bright-data-x-battle-bots/tree/main/projects/youtube-ranker) |
| News Hub | [battlebots-news.pages.dev](https://battlebots-news.pages.dev) | [GitHub](https://github.com/yaronbeen/bright-data-x-battle-bots/tree/main/projects/news-hub) |
| Fight Gallery | [battlebots-gallery.pages.dev](https://battlebots-gallery.pages.dev) | [GitHub](https://github.com/yaronbeen/bright-data-x-battle-bots/tree/main/projects/fight-gallery) |

Built for the [#battlebotsdev challenge](https://brightdata.com/lp/battelbots). The patterns (SERP-to-sentiment, wiki scraping past bot protection, async dataset collection, crawl-to-markdown, caching with graceful degradation) work for any domain. Swap "BattleBots" for your brand, your competitors, or your niche.

Reddit has opinions about everything. Now you know how to turn them into structured data.
