# How I Used Bright Data's SERP API to Build a Reddit Sentiment Engine

"Reddit leans toward Minotaur. Confidence: strong. Fans consistently cite its drum reliability and knockout power."

That's a real verdict from the tool I built. You pick two BattleBots, it searches Reddit for what fans actually say about each one, scores the sentiment, and runs the results through an LLM to write an analyst-style verdict.

I'm using BattleBots as the example, but this same SERP-to-sentiment pattern works for any brand, product, or topic you want to track.

The hosting is free on Cloudflare Pages, though the APIs (SERP, LLM) have usage costs. More on that later. Here's how the pipeline works.

## The Idea

Pick two BattleBots. Search Reddit for what fans say about each one. Count the positive and negative mentions. Run the results through an LLM to write a proper analyst verdict.

Simple enough on paper. The hard part is getting clean, structured search results at scale without getting blocked by Google.

## Bright Data's SERP API

I used [Bright Data's SERP API](https://brightdata.com/products/serp-api) as the foundation. You could use Google's Custom Search API or scrape Google directly, but Bright Data's `brd_json=1` parameter was faster to ship. You append it to your Google search URL, and instead of getting raw HTML that you'd need to scrape and parse yourself, you get structured JSON with titles, URLs, descriptions, and positions already extracted.

Here's the core function (from `src/bright-data.js`):

```javascript
const API_BASE = 'https://api.brightdata.com/request';

export async function fetchSerp({ query, country = 'us', apiToken, zone = 'serp_api1', fetchImpl = fetch }) {
  // brd_json=1 tells Bright Data to parse the HTML into structured JSON
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=${country}&hl=en&pws=0&brd_json=1`;

  const res = await fetchImpl(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zone,
      url: searchUrl,
      format: 'raw',
    }),
  });

  const data = await res.json();

  const results = [];
  if (data.organic && Array.isArray(data.organic)) {
    for (const item of data.organic) {
      const url = item.url || item.link || '';
      if (!url) continue;
      results.push({
        title: item.title || '',
        url,
        description: item.description || item.snippet || '',
        position: item.position ?? item.rank ?? results.length + 1,
      });
    }
  }

  // Also returns statusCode, durationMs for tracing — omitted for brevity
  return { ok: true, statusCode: res.status, durationMs, results, query };
}
```

The `if (!url) continue` filter is important. Bright Data occasionally returns organic results with empty URLs (featured snippets, knowledge panels). Skipping those keeps the downstream sentiment scoring clean.

One POST request, structured data back. No Puppeteer. No headless browser. No HTML parsing.

## Fan-Out: 6 Parallel Searches Per Matchup

A single search query doesn't give you enough signal. "Minotaur vs Tombstone reddit" might return 10 results, but you're missing threads about each bot's weapon, reliability, and general fan opinion.

So for each matchup, I build 6 queries (3 per bot) and run them all in parallel:

```javascript
function buildQueries(bot, opponent) {
  return [
    `site:reddit.com/r/battlebots ${bot.name} vs ${opponent.name}`,
    `site:reddit.com/r/battlebots ${bot.name} ${bot.weapon}`,
    `site:reddit.com battlebots ${bot.name} opinion`,
  ];
}

// Both bots searched simultaneously
const [serpA, serpB] = await Promise.all([
  fetchSerpFanOut(queriesA, options),
  fetchSerpFanOut(queriesB, options),
]);
```

`fetchSerpFanOut` uses `Promise.allSettled` under the hood, so if one query fails or times out, you still get results from the other five. In practice, I get 40-80 search results per matchup. That's enough signal to work with.

## Sentiment Scoring

Once I had the search results, I needed to figure out whether each mention was positive or negative. I went with a keyword-based approach instead of an LLM call for this step. It's faster and cheaper, and for BattleBots discussion, the vocabulary is pretty predictable.

```javascript
const POSITIVE = ['win', 'wins', 'won', 'strong', 'dominant', 'favorite', 'reliable',
  'improved', 'durable', 'knockout', 'love', 'great', 'impressive', 'excited',
  'amazing', 'beast', 'unstoppable', 'upgrade', 'champion'];

const NEGATIVE = ['loss', 'lost', 'damage', 'damaged', 'weak', 'struggle', 'struggled',
  'unreliable', 'concern', 'controversy', 'hate', 'bad', 'boring', 'overrated',
  'broke', 'broken', 'fail', 'failed', 'disappointing'];

export function scoreText(text) {
  const lower = text.toLowerCase();
  const pos = POSITIVE.reduce((n, t) => n + (lower.includes(t) ? 1 : 0), 0);
  const neg = NEGATIVE.reduce((n, t) => n + (lower.includes(t) ? 1 : 0), 0);
  return pos - neg;
}
```

19 words in each list. The scoring runs against combined title + description text from each SERP result. Then I filter for relevance (does it actually mention the bot name?) and sort by relevance plus sentiment strength. A result that mentions the bot 3 times and has strong sentiment gets ranked higher than a passing mention.

Is this perfect? No. "Tombstone broke apart" versus "Tombstone broke Minotaur apart" mean very different things, and keyword matching misses that. But it's a rough signal, not a measurement. I spot-checked 10 matchups against r/battlebots poll results and the sentiment direction matched 7 out of 10 times. The LLM layer is what makes the final verdict useful. It reads the actual Reddit quotes and writes a nuanced take that the word lists can't.

## The LLM Verdict Layer

Raw sentiment counts give you a winner, but they don't tell a story. So I added a second layer: Claude Haiku (via OpenRouter) reads all the evidence and writes an actual verdict.

The prompt is structured to return JSON with a winner, confidence level, narrative, and 3-5 curated Reddit quotes with explanations of why each matters:

```javascript
const prompt = `You are a BattleBots analyst. Analyze the Reddit evidence below and produce a JSON verdict.

MATCHUP: ${botA.name} (${botA.weapon}, ${botA.team}) vs ${botB.name} (${botB.weapon}, ${botB.team})

SENTIMENT COUNTS:
- ${botA.name}: ${analysisA.sentiment.positive} positive, ${analysisA.sentiment.negative} negative, ${analysisA.sentiment.neutral} neutral
- ${botB.name}: ${analysisB.sentiment.positive} positive, ${analysisB.sentiment.negative} negative, ${analysisB.sentiment.neutral} neutral

RAW REDDIT EVIDENCE:
${evidenceBlock}

Return ONLY a JSON object with this exact schema:
{
  "winner": "${botA.name}" or "${botB.name}" or "Too close to call",
  "confidence": "strong" or "lean" or "toss-up",
  "narrative": "2-3 sentence analytical verdict. Write like a sports analyst.",
  "curated_evidence": [{ "quote", "source_title", "source_url", "bot", "why" }]
}

Pick 3-5 of the MOST relevant quotes. Only use facts from the evidence. Never invent match results.`;
```

The key constraint: "only use facts from the evidence." I don't want the LLM making up fight outcomes. It's there to synthesize and narrate what Reddit already said, not to hallucinate new opinions.

## Reusing the Pattern: News Hub via Crawl API

The SERP API handles search results. For the [BattleBots News Hub](https://battlebots-news.pages.dev), I needed actual page content. That's where Bright Data's Crawl API comes in. Same POST-to-`/request` endpoint, different zone and an extra `data_format` parameter:

```javascript
const res = await fetch("https://api.brightdata.com/request", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    zone: "crawl_api",
    url: "https://battlebots.com/robots/",
    format: "raw",
    data_format: "markdown",
  }),
});

const markdown = await res.text();
```

The `data_format: "markdown"` option returns clean markdown instead of raw HTML. I crawl three targets: battlebots.com/robots/, the fandom wiki, and r/battlebots. The scraped markdown feeds the news hub frontend directly.

## The Live Results

You can try both projects right now:

- **[BattleBots H2H Predictor](https://battlebots-h2h.pages.dev)** — pick two bots, get a Reddit-powered verdict
- **[BattleBots News Hub](https://battlebots-news.pages.dev)** — latest BattleBots content from across the web

## What I'd Do Differently

**More query variations.** Three queries per bot covers the basics, but I'd add queries for specific seasons ("Tombstone season 5 performance reddit") and matchup types ("spinner vs flipper battlebots reddit").

**Weighted sentiment.** Right now, "unstoppable champion knockout" and "won a fight" both count as 1 positive. A weighting system would be more accurate.

**Cache warming.** The first query for a new matchup takes 4-8 seconds because of all the SERP calls. I could pre-warm the cache for popular matchups and cut that to under 100ms.

The SERP API was the right call for this project. Trying to scrape Google directly would've meant CAPTCHA solving and IP rotation. The `brd_json=1` parameter gives you structured JSON with titles, URLs, descriptions, and positions already extracted, so there's zero HTML parsing in the codebase.
