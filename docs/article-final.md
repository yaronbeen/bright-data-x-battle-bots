# I Built 5 BattleBots Apps with Bright Data. Here's What Actually Worked.

> "Reddit leans toward Minotaur. Confidence: strong. Fans consistently cite its drum reliability and knockout power."

That's a real verdict from one of the tools. You pick two BattleBots from a dropdown, the system searches Reddit via Google, scores the sentiment of every result, and Claude Haiku 4.5 writes an analyst-style verdict with cited evidence. First request takes about 8 seconds. Repeat requests skip the pipeline entirely and load from cache.

I built this as part of the [Bright Data x BattleBots developer challenge](https://brightdata.com/lp/battelbots) (#battlebotsdev). Full disclosure: I'm a Bright Data DevRel ambassador, so I'm not a neutral party here. But the code is real, the sites are live, and I'll be honest about what worked and what didn't. It turned into five separate apps, all deployed for free on Cloudflare Pages. I'm using BattleBots as the example, but the scraping patterns here transfer to any brand, product, or topic you want to track.

Here's what I built, how the scraping works, and what it actually costs.

## The Five Projects

All live, all connected via a shared nav bar:

- **[H2H Predictor](https://battlebots-h2h.pages.dev)** — pick two bots, get a Reddit-powered verdict with cited evidence
- **[Bot Encyclopedia](https://battlebots-encyclopedia.pages.dev)** — 30 bots with stats, weapons, win rates, searchable and filterable
- **[YouTube Ranker](https://battlebots-youtube.pages.dev)** — real fight videos ranked by views, likes, and engagement
- **[News Hub](https://battlebots-news.pages.dev)** — articles from 14 sources, collected via Bright Data Crawl API and SERP
- **[Fight Gallery](https://battlebots-gallery.pages.dev)** — fight media with real YouTube thumbnails

I ended up using a different Bright Data product for each one, which makes a decent tour of their API surface. Different data sources genuinely need different scraping approaches.

---

## Part 1: SERP API for Reddit Sentiment

The H2H Predictor is the most interesting project technically. The pipeline: search Google for Reddit discussions about each bot, score the sentiment, then have an LLM write a verdict.

### Getting Structured SERP Data

I used [Bright Data's SERP API](https://brightdata.com/products/serp-api). The key parameter is `brd_json=1` appended to the Google search URL. Instead of getting raw HTML, you get structured JSON with titles, URLs, descriptions, and positions already extracted.

Here's the core function (simplified from `src/bright-data.js`. The production version adds a 30-second AbortController timeout, input validation, and error handling for non-JSON responses):

```javascript
const API_BASE = 'https://api.brightdata.com/request';

export async function fetchSerp({ query, apiToken, zone = 'serp_api1' }) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=us&hl=en&pws=0&brd_json=1`;

  const started = Date.now();
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ zone, url: searchUrl, format: 'raw' }),
  });

  const durationMs = Date.now() - started;
  const data = await res.json();

  const results = [];
  if (data.organic && Array.isArray(data.organic)) {
    for (const item of data.organic) {
      const url = item.url || item.link || '';
      if (!url) continue; // skip featured snippets, knowledge panels
      results.push({
        title: item.title || '',
        url,
        description: item.description || item.snippet || '',
        position: item.position ?? item.rank ?? results.length + 1,
      });
    }
  }

  return { ok: true, statusCode: res.status, durationMs, results, query };
}
```

The `if (!url) continue` filter matters. Bright Data occasionally returns organic results with empty URLs (featured snippets, knowledge panels). Skipping those keeps downstream scoring clean.

Could you use Google's Custom Search API instead? Yes. Or scrape Google directly with proxies. The `brd_json=1` parameter saved me from writing any HTML parsing code, which is why I went this route.

### Fan-Out: 6 Parallel Queries

A single search doesn't give enough signal. So for each matchup, I build 3 queries per bot and run all 6 in parallel:

```javascript
function buildQueries(bot, opponent) {
  return [
    `site:reddit.com/r/battlebots ${bot.name} vs ${opponent.name}`,
    `site:reddit.com/r/battlebots ${bot.name} ${bot.weapon}`,
    `site:reddit.com battlebots ${bot.name} opinion`,
  ];
}

const [serpA, serpB] = await Promise.all([
  fetchSerpFanOut(queriesA, options),
  fetchSerpFanOut(queriesB, options),
]);
```

`fetchSerpFanOut` uses `Promise.allSettled` internally, so one failed query doesn't kill the rest. In practice I get 40-80 raw results per matchup, though after filtering for relevance (does the result actually mention the bot name?) the usable count is lower.

### Sentiment Scoring

Before the LLM runs, I do a fast keyword-scoring pass to give it structured signal. This isn't meant to be the final answer. It's a pre-filter that turns raw SERP results into positive/negative/neutral counts the LLM can work with:

```javascript
const POSITIVE = ['win', 'wins', 'won', 'knockout', 'dominant', 'champion', ...]; // 19 words total
const NEGATIVE = ['loss', 'lost', 'broke', 'broken', 'overrated', 'failed', ...]; // 19 words total

export function scoreText(text) {
  const lower = text.toLowerCase();
  const pos = POSITIVE.reduce((n, t) => n + (lower.includes(t) ? 1 : 0), 0);
  const neg = NEGATIVE.reduce((n, t) => n + (lower.includes(t) ? 1 : 0), 0);
  return pos - neg;
}
```

Full word lists are in `src/sentiment.js` in the repo. Fair warning: this uses `String.includes()`, so "win" matches "winter." A production version should use word-boundary regex (`/\bwin\b/i`). The point of this step isn't precision. It's giving the LLM structured signal to work with instead of dumping raw text and hoping for the best.

### The LLM Verdict

Raw sentiment counts give you a winner, but they don't tell a story. Claude Haiku 4.5 (via OpenRouter) reads all the evidence and writes a proper analyst verdict:

```javascript
const prompt = `You are a BattleBots analyst. Analyze the Reddit evidence and produce a JSON verdict.

MATCHUP: ${botA.name} (${botA.weapon}, ${botA.team}) vs ${botB.name} (${botB.weapon}, ${botB.team})

SENTIMENT COUNTS:
- ${botA.name}: ${analysisA.sentiment.positive} positive, ${analysisA.sentiment.negative} negative, ${analysisA.sentiment.neutral} neutral
- ${botB.name}: ${analysisB.sentiment.positive} positive, ${analysisB.sentiment.negative} negative, ${analysisB.sentiment.neutral} neutral

RAW REDDIT EVIDENCE:
${evidenceBlock}

Return ONLY JSON: { "winner", "confidence", "narrative", "curated_evidence": [{ "quote", "source_title", "source_url", "bot", "why" }] }

Pick 3-5 of the MOST relevant quotes. Only use facts from the evidence. Never invent match results.`;
```

The "only use facts from the evidence" constraint is important. I don't want the LLM making up fight outcomes. It's there to synthesize what Reddit already said.

---

## Part 2: Scraping YouTube, Wiki, and Reddit

The other three apps needed different data from different sources.

### YouTube: Async Dataset Collection

The YouTube Ranker needed real fight videos with engagement metrics. I used [Bright Data's YouTube Scraper](https://brightdata.com/products/web-scraper/youtube). It works differently from the SERP API. You trigger a collection, poll for completion, then download:

```javascript
// Trigger
const url = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}&discover_by=keyword&limit_per_input=40`;
const result = await request("POST", url, [{ keyword: "BattleBots fight" }]);
const snapshotId = result.snapshot_id;

// Poll (10s intervals)
let ready = false;
while (!ready) {
  const progress = await request("GET", `.../progress/${snapshotId}`);
  if (progress.status === "ready") ready = true;
  else await new Promise(r => setTimeout(r, 10_000));
}

// Download
const videos = await request("GET", `.../snapshot/${snapshotId}?format=json`);
```

You could use yt-dlp (no quotas, free) or the YouTube Data API (10K daily quota units). I went with Bright Data's scraper because it returns structured metadata without managing OAuth or local dependencies. Tradeoff: it's async (30-90 seconds for a collection) and costs money.

### Wiki: Getting Past Bot Protection

The Encyclopedia needed detailed bot stats from the BattleBots Fandom wiki. Problem: Fandom uses Cloudflare protection that blocks regular `fetch()` requests. Returns 403 every time.

[Bright Data's Web Unlocker](https://brightdata.com/products/web-unlocker) handles the fingerprinting and CAPTCHA solving. Same API pattern, different zone:

```javascript
const res = await fetch("https://api.brightdata.com/request", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    zone: "web_unlocker1",
    url: "https://battlebots.fandom.com/wiki/Minotaur_(BattleBots)",
    format: "raw",
    data_format: "markdown",
  }),
});
const markdown = await res.text();
```

The `data_format: "markdown"` option is the trick here. Instead of raw HTML you'd need to parse with cheerio, you get clean markdown. For a wiki page, that's headings, tables, and lists in a format you can work with directly.

Could you use Puppeteer with stealth plugins? Maybe. Fandom's bot detection has gotten aggressive enough that I didn't want to fight it. Web Unlocker was the path of least resistance.

### Gallery: Reusing YouTube Thumbnails

The Fight Gallery needed images but I didn't want to scrape and host media files. Every YouTube video has a predictable thumbnail URL: `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`. Free, always available, and the images show actual fight moments.

### Data Quality: The Hard Part

The messiest problem wasn't scraping. It was deduplication. YouTube returns the same fight uploaded by different channels with slightly different titles ("Tombstone vs Minotaur" vs "TOMBSTONE VS MINOTAUR — FULL FIGHT"). Deduplicating on video ID handled that.

But across sources, the same bot appears as "End Game", "End_Game", and "EndGame." I ended up writing a normalizer that lowercases, strips hyphens and underscores, and collapses whitespace:

```javascript
function normalizeBot(name) {
  return name.toLowerCase().replace(/[-_\s]+/g, ' ').trim();
}
// "End_Game" → "end game", "EndGame" → "endgame" ... still not perfect
```

Even that isn't perfect. "EndGame" becomes "endgame" (one word) while "End Game" becomes "end game" (two words). I ended up adding a manual alias map for the 5-6 bots where this mattered. Not glamorous, but it's where I spent more time than on any single API call.

---

## Part 3: Architecture and Deployment

### Streaming with NDJSON

The H2H prediction pipeline takes 5-10 seconds (6 SERP calls + sentiment + LLM). Nobody wants to stare at a spinner that long. So I stream results as NDJSON. Each pipeline stage emits an event, and the frontend renders them as they arrive:

```javascript
// functions/api/predict-stream.js (from actual source)
export async function onRequestPost(context) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const emit = (event) => writer.write(encoder.encode(JSON.stringify(event) + '\n'));

  context.waitUntil((async () => {
    try {
      await predict(body.botA, body.botB, { /* env vars */ }, emit);
    } catch (err) {
      emit({ type: 'error', error: err.message });
    } finally {
      writer.close();
    }
  })());

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
```

The pipeline emits typed events: `start`, `cache_hit`, `serp_done`, `sentiment`, `done`. If MongoDB has a cached result, it short-circuits with `cache_hit` and skips the SERP and LLM calls entirely.

### MongoDB Caching

SERP queries and LLM calls cost money. Running the same matchup twice is wasteful. MongoDB Atlas (free M0 tier) with a 24-hour TTL:

```javascript
export function matchupKey(botAId, botBId) {
  return [botAId, botBId].sort().join('::');
}

export async function getCachedPrediction(uri, botAId, botBId) {
  const client = await getClient(uri);
  if (!client) return null; // graceful degradation — app works without DB

  const db = client.db('battlebots');
  const key = matchupKey(botAId, botBId);
  const doc = await db.collection('predictions').findOne(
    { key, expiresAt: { $gt: new Date() } },
    { sort: { createdAt: -1 } }
  );
  return doc?.result || null;
}
```

The `matchupKey` sort means "minotaur::tombstone" and "tombstone::minotaur" hit the same cache entry. If MongoDB is down, the app still works. Just slower. Cache writes use `.catch(() => {})` so database issues never break the user experience.

MongoDB also auto-deletes expired docs via a TTL index, so the 512MB free tier doesn't fill up:

```javascript
await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

The `mongodb` driver works on Cloudflare Workers with the `nodejs_compat` compatibility flag in `wrangler.toml`. Connection config is optimized for serverless: `maxPoolSize: 1`, 5-second connect timeout, 10-second socket timeout.

### Why Cloudflare Pages

I went with Cloudflare Pages because the prediction pipeline needs long wall-clock time (5-10 seconds of I/O wait) and streaming support. Cloudflare's edge runtime doesn't charge for I/O wait time. The 10ms CPU time limit on the free tier sounds restrictive, but these functions spend almost all their time waiting on `fetch()` calls, which doesn't count.

Render's free tier sleeps after 15 minutes and cold starts take 30+ seconds. For a demo project, that first impression matters.

All five projects deploy as separate Cloudflare Pages sites with independent builds. If the news scraper breaks, the encyclopedia still works.

### What This Actually Costs

I tracked costs over a month of development and testing. About 200 matchup predictions, plus scraper runs:

| Service | Cost | Details |
|---------|------|---------|
| Cloudflare Pages (5 sites) | $0 | Free tier: 500 builds/mo, 100K invocations/day |
| MongoDB Atlas | $0 | Free M0 tier: 512MB storage |
| Bright Data SERP API | ~$3 | ~200 predictions x 6 queries each. Pay per request |
| OpenRouter (Claude Haiku 4.5) | ~$2 | ~200 LLM calls at $1/M input, $5/M output. Check [openrouter.ai](https://openrouter.ai) for current pricing |
| Bright Data YouTube/Unlocker | ~$1 | One-time scraper runs during development |
| **Total** | **~$6** | Cache keeps repeat costs near zero |

That ~$6 was the total during development and testing. In production with caching enabled, most matchups hit cache and ongoing API costs are near zero. The hosting (Cloudflare + MongoDB) stays free indefinitely.

---

## The Live Suite

All five projects, all connected:

| Project | URL | Bright Data Product |
|---------|-----|---------------------|
| H2H Predictor | [battlebots-h2h.pages.dev](https://battlebots-h2h.pages.dev) | SERP API |
| Encyclopedia | [battlebots-encyclopedia.pages.dev](https://battlebots-encyclopedia.pages.dev) | Web Unlocker |
| YouTube Ranker | [battlebots-youtube.pages.dev](https://battlebots-youtube.pages.dev) | YouTube Scraper |
| News Hub | [battlebots-news.pages.dev](https://battlebots-news.pages.dev) | Crawl API + SERP |
| Fight Gallery | [battlebots-gallery.pages.dev](https://battlebots-gallery.pages.dev) | YouTube thumbnails |

All the code is open source: [github.com/yaronbeen/bright-data-x-battle-bots](https://github.com/yaronbeen/bright-data-x-battle-bots). Built for the [#battlebotsdev challenge](https://brightdata.com/lp/battelbots).

Five different scraping patterns, five live apps, ~$6 total during development. The scraping was the easy part. Data normalization and deduplication took longer than everything else combined.
