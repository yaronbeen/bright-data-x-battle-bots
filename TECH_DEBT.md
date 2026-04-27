# TECH_DEBT.md

## P0 — Next Session

- **Images**: 1.1MB for 10 thumbnails displayed at 120px. Convert to WebP, resize to 240px max. Should be ~100KB total.
- **Timeouts**: No AbortController on SERP or LLM fetch. A slow API hangs forever. Add 30s timeout on SERP, 45s on LLM.
- **Zero-result UI**: When SERP returns 0 Reddit results, show "Not enough Reddit discussion" with a suggested matchup instead of "Too close to call" with empty bars.

## P1 — This Week

- **SERP dedup**: "Minotaur vs Tombstone" and "Tombstone vs Minotaur" return near-identical results. Drop the reversed query, save an API call.
- **Result deduplication**: Same Reddit URL from multiple queries counted multiple times in sentiment.
- **Cache-Control headers**: Static assets have no caching. Add `max-age=3600` on images, `max-age=60` on HTML.
- **Sentiment context**: Keyword scoring is context-free. "Tombstone won" credits "won" to whichever bot's query returned it.

## P2 — When Convenient

- **LLM guardrail**: LLM can override deterministic winner. Add a check: if LLM disagrees with sentiment, display "AI sees it differently".
- **Mobile verdict card**: Stacks vertically, loses side-by-side screenshot appeal.
- **Share button**: "Copy image" or "Share to Twitter" on the verdict card.
- **Path traversal**: `serveStatic` doesn't prevent `..` in URLs (local dev only, not an issue on Cloudflare Pages).

## P3 — Nice To Have

- **Image generation**: Render verdict card as a PNG for download/OG preview.
- **URL sharing**: `/matchup/minotaur-vs-tombstone` with OG metadata.
- **More bots**: Expand roster beyond 10.
- **Custom domain**: Point a subdomain at battlebots-h2h.pages.dev.

## Resolved Items

- 2026-04-27: Removed Three.js
- 2026-04-27: Switched from Nemotron to Claude Haiku (reasoning leakage unfixable)
- 2026-04-27: Implemented progressive reveal (sentiment before LLM)
- 2026-04-27: Added animations (verdict pop, staggered evidence, crossfade previews)
- 2026-04-27: Added branding inside verdict card for screenshots
- 2026-04-27: Fixed XSS via URL sanitization
- 2026-04-27: Added same-bot validation in frontend
- 2026-04-27: Stripped "Read more" SERP artifacts from evidence descriptions
- 2026-04-27: Deployed to Cloudflare Pages (free tier)
