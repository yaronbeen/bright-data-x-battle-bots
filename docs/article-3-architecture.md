# From Scraped Data to 5 Live Apps on Cloudflare (Free Tier)

Five websites. Total monthly cost: under $10. All powered by scraped data.

That's the BattleBots data suite I built over a few weeks. A head-to-head predictor, a news hub, a YouTube fight ranker, a bot encyclopedia, and a fight gallery. Each one is a standalone Cloudflare Pages site. Hosting is free on Cloudflare Pages and MongoDB Atlas. The costs come from API usage: SERP queries and LLM calls.

Here's the full architecture.

## The Stack

No React. No Next.js. No build step for most of the projects.

The suite is vanilla JavaScript with server-side rendering through Cloudflare Pages Functions. Each project is its own directory with its own `functions/` folder, `public/` folder, and data. They share a common `src/` library for the Bright Data client, sentiment scoring, LLM integration, and database access.

I went with this approach because I wanted zero cold start latency and I didn't want to debug framework issues on Cloudflare's runtime. Pages Functions run on the edge, start instantly, and have a 10ms CPU time limit on the free tier. Sounds tiny, but these functions spend almost all their time waiting on fetch() calls, which doesn't count against CPU time.

## Streaming with NDJSON

The H2H predictor does 6 SERP queries, sentiment analysis, and an LLM call. That's 5-10 seconds of processing. So I stream the results as NDJSON (newline-delimited JSON):

```javascript
// functions/api/predict-stream.js
export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const { env } = context;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const emit = (event) => {
    writer.write(encoder.encode(JSON.stringify(event) + '\n'));
  };

  context.waitUntil((async () => {
    try {
      await predict(body.botA, body.botB, {
        apiToken: env.BRIGHT_DATA_API_TOKEN,
        zone: env.BRIGHT_DATA_SERP_ZONE || 'web_unlocker1', // overrides fetchSerp's default 'serp_api1'
        llmApiKey: env.LLM_API_KEY,
        llmModel: env.LLM_MODEL || 'anthropic/claude-3.5-haiku',
        llmBaseUrl: env.LLM_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
        mongodbUri: env.MONGODB_URI || undefined,
      }, emit);
    } catch (err) {
      emit({ type: 'error', error: err.message });
    } finally {
      writer.close();
    }
  })());

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
```

The `predict` function accepts an `onProgress` callback. Each stage of the pipeline calls `emit()` with a typed event: `start`, `cache_hit`, `serp_done`, `sentiment`, `done`. If MongoDB has a cached result, the pipeline short-circuits with a `cache_hit` event and skips the SERP and LLM calls entirely. The frontend reads the stream line by line and updates the UI after each event.

The user sees: bot names appear instantly, then either an immediate cached result, or "Searching Reddit..." with a trace of each query completing, then sentiment bars filling in, then the final verdict with curated quotes. It feels fast even when the total processing time is 8 seconds.

## MongoDB Caching: Why and How

SERP queries cost money and LLM calls cost money. Running the same matchup twice is wasteful. So I added a MongoDB Atlas cache with a 24-hour TTL.

The cache design is simple. Matchup keys are deterministic: "minotaur::tombstone" is the same whether you picked Minotaur first or Tombstone first. I sort the bot IDs alphabetically to normalize:

```javascript
export function matchupKey(botAId, botBId) {
  return [botAId, botBId].sort().join('::');
}

export async function getCachedPrediction(uri, botAId, botBId) {
  const client = await getClient(uri);
  if (!client) return null;

  const db = client.db('battlebots');
  const key = matchupKey(botAId, botBId);
  const doc = await db.collection('predictions').findOne(
    { key, expiresAt: { $gt: new Date() } },
    { sort: { createdAt: -1 } }
  );
  return doc?.result || null;
}
```

A few design decisions worth noting:

**Graceful degradation.** If MongoDB is down or the URI isn't configured, the app works fine. It's just slower because every request hits the live pipeline. The `getClient` function returns `null` on connection failure instead of throwing.

**Fire-and-forget writes.** Cache writes happen with `.catch(() => {})`. If the write fails, the user still gets their result. I don't want a database issue to break the user experience.

**TTL via MongoDB.** I use MongoDB's built-in TTL index (`expireAfterSeconds: 0` on the `expiresAt` field). MongoDB automatically deletes expired documents. No cron job needed.

**Serverless-optimized connection pool.** `maxPoolSize: 1` with 5-second timeouts. On Cloudflare's edge runtime, you want connections to be fast and cheap, not pooled for high throughput.

The cache hit rate in practice is around 60-70% for popular matchups. Minotaur vs Tombstone gets requested a lot.

## Why Cloudflare Pages Over Vercel or Render

I tried Vercel first. Two problems killed it for my use case:

1. **Function timeouts.** Vercel's free tier has a 10-second function timeout. My prediction pipeline takes 5-10 seconds, and if the LLM is slow, it can hit 12-15 seconds. Cloudflare Pages Functions don't have a wall-clock timeout in the same way. The 10ms CPU limit doesn't count time spent waiting on fetch calls.

2. **Cold starts.** Vercel serverless functions cold start in 200-500ms. Cloudflare Workers start in under 5ms. For a streaming response where the user is watching each event arrive, that initial 500ms delay is noticeable.

Render is great for always-on services but overkill for static sites with occasional dynamic endpoints. The free tier sleeps after 15 minutes of inactivity and cold starts take 30+ seconds.

Cloudflare Pages gave me: instant cold starts, generous free tier (500 builds/month, 100K function invocations/day), and edge deployment in 300+ cities. For a project that's 90% static and 10% dynamic, it's the obvious choice.

## Cross-Site Navigation

Five independent sites need to feel like one suite. I solved this with a shared navigation component. Each site includes a nav bar with links to all five projects:

- [H2H Predictor](https://battlebots-h2h.pages.dev)
- [Encyclopedia](https://battlebots-encyclopedia.pages.dev)
- [YouTube Ranker](https://battlebots-youtube.pages.dev)
- [News Hub](https://battlebots-news.pages.dev)
- [Fight Gallery](https://battlebots-gallery.pages.dev)

They're separate Cloudflare Pages projects with separate builds and separate domains. But the shared nav and consistent styling make them feel connected. A user clicking from the Encyclopedia to the YouTube Ranker doesn't feel like they've left the site.

The alternative would be a monorepo with a single Cloudflare Pages deployment and path-based routing (`/encyclopedia`, `/youtube`, etc.). I went with separate projects because it keeps deploys independent. If I break the news scraper, the encyclopedia still works.

## The Full Cost Breakdown

Here's what this actually costs to run per month:

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Pages (5 sites) | $0 | Free tier: 500 builds/mo, 100K invocations/day |
| MongoDB Atlas | $0 | Free tier: 512MB storage, shared cluster |
| Bright Data SERP API | ~$2-5 | Pay per request, cached results reduce calls |
| OpenRouter (Claude Haiku) | ~$1-3 | $0.25/M input tokens, $1.25/M output |
| Domains | $0 | Using .pages.dev subdomains |

Total: somewhere around $3-8/month depending on traffic. Most of that is the SERP API and LLM calls, and the MongoDB cache keeps those numbers low.

If I removed the LLM layer entirely (just using deterministic sentiment scoring), the cost would drop to under $2/month. The LLM verdict is nice but not essential.

## What I'd Build Next

A stats tracker that monitors how sentiment shifts over time. Run the same matchups weekly, store the results, and chart the trend. Fan opinion changes after every new fight episode, and it would be interesting to see that mapped out.

Also, a Slack bot. The prediction pipeline is already a function call. Wrapping it in a Slack command (`/predict minotaur tombstone`) would take maybe an afternoon.

The five projects show different patterns: real-time SERP-to-verdict (H2H predictor), async dataset collection (YouTube ranker), anti-bot scraping (encyclopedia), crawl-to-markdown (news hub), and image reuse from thumbnails (gallery). All the code is at [github.com/yaronbeen/bright-data-x-battle-bots](https://github.com/yaronbeen/bright-data-x-battle-bots).
