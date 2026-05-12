# AGENT.md

## Start Here

1. Read `handover/handover-006.md` — latest session context
2. Review P0 items in `TECH_DEBT.md`
3. Skim `LEARNINGS.md` for API quirks and UX decisions

## Purpose & Context

**Bright Data x BattleBots Head-to-Head Predictor.** A Bright Data showcase product: pick two BattleBots from a dropdown, the app searches Reddit via Bright Data SERP API, scores sentiment, and uses Claude Haiku to write a curated verdict with cited evidence.

**Live at:** https://battlebots-h2h.pages.dev

**Project suite:**
- H2H Predictor: https://battlebots-h2h.pages.dev
- Bot Encyclopedia: https://battlebots-encyclopedia.pages.dev
- YouTube Fight Ranker: https://battlebots-youtube.pages.dev
- News Hub: https://battlebots-news.pages.dev
- Fight Gallery: https://battlebots-gallery.pages.dev

## Canonical Data Sources

Use these sources when adding or refreshing BattleBots data. Do not invent bot records, fight metadata, sources, or claims that cannot be traced back to one of these or to a scrape output generated from them.

| Source | URL | Use For |
| --- | --- | --- |
| BattleBots Wiki | https://battlebots.fandom.com/wiki/BattleBots_Wiki | Bot history, seasons, weapons, team context, historical fight references |
| r/battlebots | https://www.reddit.com/r/battlebots/ | Community sentiment, fan discussion, media posts, controversy/context |
| Official robots directory | https://battlebots.com/robots/ | Current official robot roster, team names, official profile links |

Page copy should be explicit about provenance:
- Official roster/profile claims should point to `battlebots.com/robots/`.
- Historical encyclopedia data should point to the BattleBots Wiki.
- Sentiment, discussion, and fan/media claims should point to `reddit.com/r/battlebots/`.
- Bright Data should be described as the collection/enrichment layer, not as the original authority on BattleBots facts.

**Primary audience:** Bright Data marketing team. Secondary: BattleBots fans sharing screenshots.

## Architecture

```
Two bot dropdowns (with live photo previews)
    → "Who wins?" button
    → 3 Reddit-targeted Google queries per bot (6 total, parallel)
    → Bright Data Web Unlocker SERP (brd_json=1 for structured JSON)
    → Deterministic sentiment scoring on titles + descriptions
    → Claude Haiku (via OpenRouter) curates 3-5 best quotes + writes verdict
    → NDJSON streaming: early sentiment card → then full verdict with animations
    → Screenshot-worthy verdict card with in-card Bright Data branding
```

Stack: vanilla Node.js server for local dev, Cloudflare Pages + Functions for production. MongoDB Atlas (M0 free) for prediction caching. No frameworks, no build step. Tests use Node built-in test runner.

## Decisions Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-04-27 | BattleBots sponsorship angle | Bright Data sponsors BattleBots |
| 2026-04-27 | Reddit sentiment focus | User wanted sentiment analysis on Reddit specifically |
| 2026-04-27 | Dropped Three.js | User: "forget three.js, build something functioning" |
| 2026-04-27 | Adopted unfancy-search SERP pattern | Same Bright Data API call shape, proven approach |
| 2026-04-27 | Head-to-head predictor with 10 bots | More meaningful than generic search box |
| 2026-04-27 | Bright Data showcase, not fan tool | Primary audience is BD marketing, screenshots are the artifact |
| 2026-04-27 | Claude Haiku via OpenRouter | Nemotron leaks reasoning, Gemma/Llama rate-limited, Kimi sometimes null |
| 2026-04-27 | LLM curates evidence (not just summarizes) | User feedback: evidence felt random/disconnected from verdict |
| 2026-04-27 | Structured JSON from LLM | `{winner, confidence, narrative, curated_evidence[]}` — we control rendering |
| 2026-04-27 | Progressive streaming (NDJSON) | Early sentiment card shows BEFORE LLM finishes |
| 2026-04-27 | Deployed to Cloudflare Pages | Free tier, functions for API routes, secrets for API keys |
| 2026-04-27 | web_unlocker1 zone (not serp_api2) | serp_api2 has IP blocklist |
| 2026-04-28 | Canonical BattleBots sources documented | Use official robot directory, BattleBots Wiki, and r/battlebots as provenance anchors |
| 2026-04-29 | MongoDB Atlas M0 for prediction caching | Free 512MB, graceful degradation if unavailable, 24h TTL with auto-expiry |
| 2026-04-29 | mongodb driver on Cloudflare Workers via nodejs_compat | Atlas Data API deprecated; driver works with compatibility flag |
| 2026-04-29 | Stay on Cloudflare Pages (not Render/Vercel) | Vercel 10s timeout kills pipeline; Render cold starts bad for demo; CF has zero cold starts |

## Runbook

```sh
npm test            # 12 tests, no external calls
npm run dev         # local server on PORT or 3000
npm run deploy      # deploy to Cloudflare Pages
npm run preview     # local Cloudflare preview on port 3200
```

**Local dev** requires `.env`:
- `BRIGHT_DATA_API_TOKEN` + `BRIGHT_DATA_SERP_ZONE=web_unlocker1`
- `LLM_API_KEY` (OpenRouter key) + `LLM_MODEL=anthropic/claude-3.5-haiku`
- `LLM_BASE_URL=https://openrouter.ai/api/v1/chat/completions`
- `MONGODB_URI` (Atlas connection string — optional, enables caching)

**Cloudflare** secrets are set via `wrangler pages secret put`.

**Redeploying:** `npm run deploy` (requires `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` env vars).

## API References

- Bright Data: `POST https://api.brightdata.com/request` with Bearer auth, `brd_json=1` for structured Google SERP
- OpenRouter: `POST https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible)
- Cloudflare Pages Functions: ESM exports with `onRequestGet`/`onRequestPost`
- MongoDB Atlas: `mongodb+srv://` connection via `mongodb` driver (M0 free tier, `battlebots` database, `predictions` collection)
- BattleBots Wiki: `https://battlebots.fandom.com/wiki/BattleBots_Wiki`
- r/battlebots: `https://www.reddit.com/r/battlebots/`
- Official BattleBots robots: `https://battlebots.com/robots/`

## Project File Structure

```
src/
  server.js        — Local Node HTTP server + static files + API routes
  copilot.js       — Pipeline orchestrator + streaming callbacks + suggested matchups + cache integration
  bright-data.js   — Bright Data SERP API client (fetchSerp, fetchSerpFanOut)
  sentiment.js     — Keyword sentiment scoring (scoreText, analyzeResults)
  llm.js           — Claude Haiku verdict synthesis (structured JSON output)
  db.js            — MongoDB Atlas client: prediction cache, history, popular matchups
  roster.js        — 30 BattleBots with metadata + local image paths/fallbacks
public/
  index.html       — UI: selector with photos, early sentiment, verdict card, evidence
  styles.css       — Neo-brutalist styling with animations
  app.js           — Frontend: NDJSON streaming, progressive reveal, crossfade, dramatic verdict
  img/             — 10 bot photos (downloaded from BattleBots wiki)
functions/
  api/roster.js    — Cloudflare Pages Function: GET /api/roster
  api/predict.js   — Cloudflare Pages Function: POST /api/predict
  api/predict-stream.js — Cloudflare Pages Function: POST /api/predict-stream (NDJSON)
  api/history.js   — Cloudflare Pages Function: GET /api/history (recent + popular matchups)
test/
  copilot.test.js  — 12 tests (roster, validation, sentiment, LLM, pipeline, streaming)
docs/
  BRIEF.md         — Discovery brief from user feedback session
wrangler.toml      — Cloudflare Pages config
```

## References

- `LEARNINGS.md` — API quirks, LLM model experiences, UX lessons
- `TECH_DEBT.md` — Prioritized issues from stress testing
- `handover/` — Session handovers (004 is latest)
- `docs/BRIEF.md` — Product requirements from discovery
