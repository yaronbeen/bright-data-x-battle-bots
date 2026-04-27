# TECH_DEBT.md

## P0 — Next Session

- **Images**: 1.1MB for 10 thumbnails displayed at 120px. Convert to WebP, resize to 240px max. Should be ~100KB total.
- **Timeouts**: No AbortController on SERP or LLM fetch. A slow API hangs forever. Add 30s timeout on SERP, 45s on LLM.
- **Zero-result UI**: When SERP returns 0 Reddit results, show "Not enough Reddit discussion" with a suggested matchup. Currently shows "Too close to call" with no evidence.

## P1 — This Week

- **SERP dedup**: "Minotaur vs Tombstone" and "Tombstone vs Minotaur" return near-identical results. Drop the reversed query, save an API call.
- **Result deduplication**: Same Reddit URL from multiple queries counted multiple times in sentiment.
- **Cache-Control headers**: Static assets have no caching. Add `max-age=3600` on images, `max-age=60` on HTML.
- **Sentiment context**: Keyword scoring is context-free. "Tombstone won" credits "won" to whichever bot's query returned it. At minimum check if bot name appears near the keyword.

## P2 — When Convenient

- **LLM guardrail**: LLM can override deterministic winner. Add a check: if LLM disagrees with sentiment, display "AI sees it differently" rather than contradicting the bars.
- **Mobile verdict card**: Stacks vertically, loses side-by-side screenshot appeal. Consider a compact horizontal layout even on mobile.
- **Share button**: "Copy image" or "Share to Twitter" on the verdict card. The viral mechanic is currently screenshot-only.
- **Path traversal**: `serveStatic` doesn't prevent `..` in URLs. Add path normalization.

## P3 — Nice To Have

- **Image generation**: Render verdict card as a PNG for download/OG preview.
- **URL sharing**: `/matchup/minotaur-vs-tombstone` with OG metadata.
- **Deploy to Cloudflare Workers** like unfancy-search.
- **More bots**: Expand roster beyond 10.

## Resolved Items

- 2026-04-27: Removed Three.js
- 2026-04-27: Switched from Nemotron to Claude Haiku (reasoning leakage unfixable)
- 2026-04-27: Implemented progressive reveal (sentiment before LLM)
- 2026-04-27: Added animations (verdict pop, staggered evidence, crossfade previews)
- 2026-04-27: Added branding inside verdict card for screenshots
- 2026-04-27: Fixed XSS via URL sanitization
- 2026-04-27: Added same-bot validation in frontend
