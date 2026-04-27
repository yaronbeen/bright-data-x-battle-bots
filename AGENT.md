# AGENT.md

## Start Here

1. Read `handover/handover-002.md` — latest session context
2. Review P0 items in `TECH_DEBT.md` — **start with discovery, not code**
3. Skim `LEARNINGS.md` for API quirks and UX feedback

## Purpose & Context

Bright Data x BattleBots Head-to-Head Predictor. Pick two bots from a dropdown, the app searches Reddit via Bright Data, scores sentiment, and shows who Reddit thinks wins.

**Critical:** The user explicitly said the next session must start with a proper discovery before any code. The current UX has issues: evidence feels disconnected from the verdict, information hierarchy is wrong, images don't show until after results.

## Architecture

```
Two bot dropdowns → "Who wins?"
    → 3 Reddit queries per bot (6 total, parallel)
    → Bright Data Web Unlocker SERP (brd_json=1)
    → Sentiment scoring on titles + descriptions
    → Optional LLM verdict synthesis (Kimi K2.6 via OpenRouter)
    → VS loading screen → verdict card → comparison → evidence
```

Stack: vanilla Node.js, no frameworks, no build step. Tests use Node built-in test runner.

## Decisions Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-04-27 | BattleBots sponsorship angle | Bright Data sponsors BattleBots |
| 2026-04-27 | Reddit sentiment focus | User wanted sentiment analysis on Reddit |
| 2026-04-27 | Dropped Three.js | "forget three.js, build something functioning" |
| 2026-04-27 | Adopted unfancy-search SERP pattern | Same Bright Data API call shape |
| 2026-04-27 | Head-to-head predictor with 10 bots | More meaningful than generic search box |
| 2026-04-27 | Fan product first, trace secondary | Bright Data trace collapsed by default |
| 2026-04-27 | Kimi K2.6 via OpenRouter for LLM | Nemotron leaks reasoning, Gemma/Llama rate-limited |
| 2026-04-27 | web_unlocker1 zone (not serp_api2) | serp_api2 has IP blocklist on this machine |
| 2026-04-27 | **Next session: discovery first** | User said current UX needs more design thinking |

## Runbook

```sh
npm test          # 12 tests, no external calls
npm run dev       # starts on PORT or 3000
```

Requires in `.env`:
- `BRIGHT_DATA_API_TOKEN` + `BRIGHT_DATA_SERP_ZONE=web_unlocker1`
- Optional: `LLM_API_KEY`, `LLM_MODEL=moonshotai/kimi-k2.6`, `LLM_BASE_URL=https://openrouter.ai/api/v1/chat/completions`

## API References

- Bright Data: `POST https://api.brightdata.com/request` with Bearer auth, `brd_json=1` for structured Google SERP
- OpenRouter: `POST https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible)
- Same pattern as unfancy-search: `src/lib/bright-data.ts`

## Project File Structure

```
src/
  server.js        — HTTP server + static files + API routes
  copilot.js       — Pipeline orchestrator (query → SERP → sentiment → LLM → response)
  bright-data.js   — Bright Data SERP API client
  sentiment.js     — Sentiment scoring
  llm.js           — LLM verdict synthesis (OpenRouter/Kimi K2.6)
  roster.js        — 10 BattleBots with metadata + local image paths
public/
  index.html       — UI with VS screen, verdict, comparison, evidence
  styles.css       — Neo-brutalist styling
  app.js           — Frontend logic + progress steps
  img/             — 10 downloaded bot photos from BattleBots wiki
test/
  copilot.test.js  — 12 tests
```
