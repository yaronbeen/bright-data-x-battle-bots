# AGENT.md

## Start Here

1. Read `handover/handover-004.md` — latest session context
2. Review P0 items in `TECH_DEBT.md`
3. Skim `LEARNINGS.md` for API quirks and UX decisions

## Purpose & Context

**Bright Data x BattleBots Head-to-Head Predictor.** A Bright Data showcase product: pick two BattleBots from a dropdown, the app searches Reddit via Bright Data SERP API, scores sentiment, and uses Claude Haiku to write a curated verdict with cited evidence.

**Live at:** https://battlebots-h2h.pages.dev

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

Stack: vanilla Node.js server for local dev, Cloudflare Pages + Functions for production. No frameworks, no build step. Tests use Node built-in test runner.

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

**Cloudflare** secrets are set via `wrangler pages secret put`.

**Redeploying:** `npm run deploy` (requires `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` env vars).

## API References

- Bright Data: `POST https://api.brightdata.com/request` with Bearer auth, `brd_json=1` for structured Google SERP
- OpenRouter: `POST https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible)
- Cloudflare Pages Functions: ESM exports with `onRequestGet`/`onRequestPost`

## Project File Structure

```
src/
  server.js        — Local Node HTTP server + static files + API routes
  copilot.js       — Pipeline orchestrator + streaming callbacks + suggested matchups
  bright-data.js   — Bright Data SERP API client (fetchSerp, fetchSerpFanOut)
  sentiment.js     — Keyword sentiment scoring (scoreText, analyzeResults)
  llm.js           — Claude Haiku verdict synthesis (structured JSON output)
  roster.js        — 10 BattleBots with metadata + local image paths
public/
  index.html       — UI: selector with photos, early sentiment, verdict card, evidence
  styles.css       — Neo-brutalist styling with animations
  app.js           — Frontend: NDJSON streaming, progressive reveal, crossfade, dramatic verdict
  img/             — 10 bot photos (downloaded from BattleBots wiki)
functions/
  api/roster.js    — Cloudflare Pages Function: GET /api/roster
  api/predict.js   — Cloudflare Pages Function: POST /api/predict
  api/predict-stream.js — Cloudflare Pages Function: POST /api/predict-stream (NDJSON)
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
