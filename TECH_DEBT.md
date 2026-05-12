# TECH_DEBT.md

## P0 — Next Session

- **Images**: 1.1MB for 10 thumbnails displayed at 120px. Convert to WebP, resize to 240px max. Should be ~100KB total.

## P1 — This Week

- **History UI**: `/api/history` endpoint exists but no frontend page yet. Add a "Recent Matchups" section to the landing page showing cached predictions.
- **DB connection pooling in Workers**: Current setup creates a new connection per request in Workers (no persistent pool). For high traffic, consider connection caching or a proxy.
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
- **More bots**: Roster expanded to 30 but only 10 have local images. Download images for remaining 20.
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
- 2026-04-28: Fixed H2H API routing (functions not compiling into worker bundle)
- 2026-04-28: Fixed encyclopedia modal overlay blocking clicks
- 2026-04-28: Fixed YouTube + Gallery broken thumbnail 404s (inline SVG placeholders)
- 2026-04-28: Fixed News Hub source stat counting unfiltered set
- 2026-04-28: Updated roster test for 30-bot expansion
- 2026-04-28: Added canonical source provenance strips to all 5 sites
- 2026-04-28: Updated scrape scripts to target canonical BattleBots URLs
- 2026-04-29: MongoDB Atlas M0 integration — prediction caching with 24h TTL
- 2026-04-29: Bright Data SERP 520s resolved (working again as of this session)
- 2026-04-29: Added AbortController timeouts (30s SERP, 45s LLM)
- 2026-04-29: Added zero-result UI when SERP returns 0 Reddit results
- 2026-04-29: Cross-site navigation bar added to all 5 sites
- 2026-04-29: Deploy scripts added to all sub-projects
- 2026-04-29: All 5 sites redeployed to Cloudflare Pages
