# Handover 004 — 2026-04-27

## What Was Accomplished

### This was a marathon session. Here's everything that happened:

**Discovery + planning:**
- Ran a proper discovery session with structured questions about audience, purpose, share format, LLM provider, evidence curation, landing page friction
- Produced a brief at `docs/BRIEF.md` with all requirements resolved
- Created a 5-phase implementation plan (approved)

**Phase 1 — LLM rewrite:**
- Switched from Nemotron (free, leaked reasoning) → Claude Haiku via OpenRouter
- LLM now returns structured JSON: `{winner, confidence, narrative, curated_evidence[]}`
- Each curated evidence item has: `quote`, `source_title`, `source_url`, `bot`, `why` (why this matters)
- Clean output every time, no chain-of-thought cleanup needed

**Phase 2 — Bot photos + matchup cards:**
- Bot photos visible from page load (hardcoded default in HTML)
- Crossfade animation on dropdown change
- 4 suggested matchup cards ("TRY A MATCHUP" label, subtle pill style)

**Phase 3 — NDJSON streaming:**
- `/api/predict-stream` endpoint sends events as they happen
- Frontend reads with `response.body.getReader()` + TextDecoder
- Early sentiment card (dark panel with both bots + bars) appears BEFORE LLM finishes

**Phase 4 — Verdict card redesign:**
- Both bot photos (120px), winner gets gold glow border
- Winner name 2.2rem with gold text-shadow + pop animation
- Staggered reveal: card bounces → winner pops → confidence fades → narrative slides → evidence staggers
- "Analyzed with Bright Data SERP API" inside card (visible in screenshots)
- Collapsible "All Reddit mentions" + "Bright Data SERP trace" below

**Stress testing (3 parallel agents):**
- Performance review: 27 findings (images unoptimized, no timeouts, no caching, redundant queries)
- UX teardown: 40 findings (no share button, wimpy VS badge, 30s wait needs more feedback, no mobile optimization)
- Full stress test: 5 failure scenarios + contradiction hunt
- Fixed critical items: progressive reveal, animations, branding, URL sanitization, same-bot validation

**UI polish from user screenshots:**
- Stripped "Read more" SERP artifacts from evidence descriptions
- Suggestion pills shrunk and made subtle
- Verdict dark panel bigger (36px padding, 120px images)
- Text contrast improved across curated evidence + all mentions

**Cloudflare Pages deployment:**
- Live at https://battlebots-h2h.pages.dev
- 3 Pages Functions for API routes (roster, predict, predict-stream)
- All 5 secrets configured
- Free tier, zero cost

## Current State

- **7 commits** on `main`
- **12/12 tests** passing
- **Live** at https://battlebots-h2h.pages.dev
- Local dev works with `npm run dev` + `.env`
- Deploy with `npm run deploy` + Cloudflare env vars

## Open Issues

- Images are 1.1MB total (should be ~100KB optimized)
- No request timeouts — slow API = infinite hang
- No zero-result UI (shows "Too close to call" with empty bars)
- Redundant "A vs B" / "B vs A" SERP queries
- Keyword sentiment is context-free
- Mobile verdict card loses side-by-side layout
- No share button on verdict card

## Recommended Next Steps

1. Optimize images (WebP, 240px max) — biggest quick win for page load
2. Add AbortController timeouts on SERP + LLM calls
3. Build a zero-result state with helpful suggestions
4. Add a share button to the verdict card
5. Deduplicate SERP queries + results

## Decisions Made

| Decision | Why |
| --- | --- |
| Claude Haiku via OpenRouter ($0.01/query) | Free models are unreliable. This is a showcase, not a cost optimization. |
| Structured JSON from LLM | We control rendering. Model returns `{winner, narrative, curated_evidence[]}`. |
| One LLM call (verdict + curation together) | Cheaper, faster, simpler than two calls. |
| Cloudflare Pages (free) | Zero cost hosting. Functions handle API routes. Wrangler deploys in seconds. |
| Subtle suggestion pills with label | Full-width pills were too prominent. Centered chips with "TRY A MATCHUP" are better. |
| Strip "Read more" client-side | SERP descriptions contain truncated "Read more" text. `cleanDesc()` handles it. |
