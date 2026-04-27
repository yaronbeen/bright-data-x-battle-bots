# Handover 003 — 2026-04-27

## What Was Done

### Full v2 rebuild based on discovery brief
- **Phase 1**: Switched LLM to Claude Haiku via OpenRouter. Structured JSON output with curated evidence. No more chain-of-thought leakage.
- **Phase 2**: Bot photos visible from page load. Crossfade animation on dropdown change. 4 suggested matchup cards with staggered entrance.
- **Phase 3**: NDJSON streaming endpoint. Progressive reveal: early sentiment card shows BEFORE LLM finishes.
- **Phase 4**: Screenshot-worthy verdict card with both bot photos, gold winner name (2.2rem), sentiment bars, narrative, curated quotes with "why it matters".

### Stress test (3 agents) + fixes
- Ran adversarial performance review (27 findings), UX teardown (40 findings), full stress test (5 failure scenarios + contradiction hunt)
- Fixed the critical issues:
  - **Progressive reveal actually works now** — sentiment bars appear mid-stream
  - **Dramatic verdict reveal** — card bounces in, winner name pops, confidence fades, narrative slides, evidence staggers
  - **Branding inside verdict card** — "Analyzed with Bright Data SERP API" visible in screenshots
  - **Winner bot gets gold glow** — border highlight on the winning bot's image
  - **VS badge pulses** during analysis
  - **Bot preview crossfade** on dropdown change
  - **Same-bot validation** in frontend
  - **URL sanitization** on LLM-generated links (XSS fix)
  - **aria-live** on status bar

### LLM saga
- Nemotron (free reasoning model): total failure, leaks chain-of-thought. Wasted hours.
- Kimi K2.6: works but expensive, sometimes null content when reasoning uses all tokens.
- Claude Haiku: clean structured JSON every time. Worth the $0.01/query.

## Current State
- 12/12 tests passing
- 4 commits on `main`
- Live-tested with real Bright Data SERP + Claude Haiku
- `.env` has credentials (gitignored)

## What Works Well
- The verdict card is genuinely screenshot-worthy
- Claude Haiku curates evidence intelligently — picks relevant quotes and explains why they matter
- The animation sequence (early sentiment → drumroll → winner pop → staggered evidence) feels like a reveal
- Bot photos from first load, crossfade on change

## Known Issues (from stress test, not yet fixed)
- Images unoptimized (1.1MB total for thumbnails, should be ~100KB as WebP)
- No Cache-Control headers on static assets
- No timeouts on SERP or LLM fetch calls
- Redundant SERP query ("A vs B" and "B vs A" return same results)
- Keyword sentiment is context-free (no negation handling)
- No zero-result UI handling
- Mobile verdict card stacks vertically (loses side-by-side effect)

## Next Steps
1. Image optimization (WebP, smaller dimensions)
2. Add request timeouts + error UI
3. Deduplicate SERP results across queries
4. Consider deploying to Cloudflare Workers (like unfancy-search)
