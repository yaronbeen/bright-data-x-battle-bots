# Bright Data x BattleBots

**Who does Reddit think wins?** Pick two BattleBots, we scrape live Reddit discussion via Bright Data, and tell you who the fans favor — with receipts.

## How It Works

1. Pick Bot A and Bot B from a dropdown of 10 iconic BattleBots
2. The app builds 6 Reddit-targeted Google search queries (3 per bot)
3. Bright Data SERP API fetches live search results
4. Sentiment scoring runs on titles + descriptions
5. An LLM writes an analytical verdict citing the evidence
6. Results: verdict card → side-by-side sentiment → cited Reddit mentions

## Setup

```sh
cp .env.example .env
# Fill in BRIGHT_DATA_API_TOKEN (required)
# Fill in LLM_API_KEY for AI verdicts (optional)
npm test     # 12 tests
npm run dev  # http://localhost:3000
```

## Environment Variables

**Required:**
- `BRIGHT_DATA_API_TOKEN` — Bright Data API token
- `BRIGHT_DATA_SERP_ZONE` — zone name (use `web_unlocker1`)

**Optional:**
- `LLM_API_KEY` — OpenRouter API key for LLM verdicts
- `LLM_MODEL` — model name (default: `moonshotai/kimi-k2.6`)
- `LLM_BASE_URL` — chat completions endpoint (default: OpenRouter)
- `PORT` — server port (default: `3000`)

## Bot Roster

Minotaur · Hydra · Witch Doctor · Bite Force · Tombstone · End Game · SawBlaze · Cobalt · HyperShock · Whiplash

## Pipeline

```
Bot A + Bot B
    ↓
6 Reddit-targeted Google queries (parallel)
    ↓
Bright Data Web Unlocker SERP (brd_json=1)
    ↓
Sentiment scoring (positive/negative/neutral)
    ↓
LLM analytical verdict (optional)
    ↓
VS screen → verdict → comparison → evidence
```

## Need a custom scraper?

If you want to adapt this approach to a different domain or data source, you can build your own scraper with [Bright Data's Scraper Studio](https://brightdata.com/products/scraper-studio). Describe the data you need in plain English, and Scraper Studio generates a production-ready scraper with your exact output schema. It includes self-healing, so when the target site changes its layout, you describe the fix and ship a patch in minutes instead of rewriting code.

## Free tier

Every Bright Data account comes with 5,000 free credits per month (roughly $7.50 in value). Credits reset on the first of each month, and you can start without a credit card. That is enough to run several BattleBots matchups, test the SERP and sentiment pipeline, and decide whether Bright Data fits your project.

## Powered By

- [Bright Data](https://brightdata.com) SERP API - same pattern as [unfancy-search](https://github.com/yaronbeen/unfancy-search)
- [OpenRouter](https://openrouter.ai) - LLM routing (Kimi K2.6)
