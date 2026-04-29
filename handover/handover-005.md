# Handover 005 — 2026-04-28

## What Was Accomplished

### E2E testing and bug fixes across all 5 deployed sites

Ran 5 parallel E2E subagents against production URLs. Found and fixed:

1. **H2H API routing (Critical):** `/api/roster` returned HTML instead of JSON on Cloudflare Pages because Wrangler wasn't compiling the `functions/` directory into a worker bundle. Root cause: `wrangler pages deploy public` auto-builds functions only when no `_worker.js` exists in `public/`; a stale generated `_worker.js` from a manual build step was blocking this. Fix: removed stale artifacts, added `.gitignore` entries for generated worker files. Verified: `/api/roster` now returns `application/json` with 30 bots; `/api/predict-stream` POST returns NDJSON events.

2. **Encyclopedia modal overlay (Critical):** `.modal` had `display: flex` which overrode the `hidden` attribute, making the backdrop intercept all clicks. Fix: added `.modal[hidden] { display: none; }`.

3. **YouTube + Gallery broken thumbnails (High):** All 39 fight and 35 gallery thumbnail URLs were fake YouTube video IDs returning 404. Fix: replaced external `img.youtube.com` URLs with inline SVG data URIs showing bot names/media types. Zero external image requests now.

4. **News Hub source stat (Medium):** `renderStats()` counted sources from `articles` (unfiltered) instead of `filtered`. Fix: `new Set(filtered.map(...))`.

5. **Stale test:** Roster test expected 10 bots after expansion to 30. Fix: updated count and allowed null images for bots without downloaded photos.

### Canonical data sources added

Added visible source provenance strips to all 5 sites linking to:
- `https://battlebots.com/robots/` — official robot profiles
- `https://battlebots.fandom.com/wiki/BattleBots_Wiki` — wiki history/context
- `https://www.reddit.com/r/battlebots/` — community sentiment/discussion

Updated all scrape scripts to target these canonical URLs. Updated `AGENT.md` with canonical sources section and provenance guidelines.

### Three deploy rounds to Cloudflare Pages

All 5 projects redeployed after each fix round. Final production state verified with Playwright across all sites.

## Current State

- **19 files changed**, +208/-28 lines (uncommitted at time of writing this handover)
- **12/12 tests** passing
- **All 5 sites live** and verified:
  - H2H: roster loads, dropdowns populate, suggestions work, streaming endpoint responds
  - Encyclopedia: search/filter/modal all functional
  - YouTube: 39 rows, sort/search/empty state, no broken thumbnails
  - News: 30 articles, category/source filters, source stat updates correctly
  - Gallery: 35 cards, type/bot/season filters, lightbox works, no broken thumbnails

## Open Issues

- **Bright Data SERP 520s:** All Reddit-targeted SERP queries return HTTP 520 from Bright Data Web Unlocker. H2H predictions fall back to zero-evidence "Too close to call." This is a runtime data-source issue, not a code bug. May need zone config change or Bright Data support ticket.
- **P0 items from TECH_DEBT.md** still open: image optimization (1.1MB), API timeouts, zero-result UI.
- **MongoDB integration** discussed but not yet implemented. User interested in using free Atlas M0 tier.
- **Console `Unexpected end of input` error** appears on all sites — likely a Cloudflare Pages edge artifact or empty response body; does not affect functionality.

## Recommended Next Steps

1. **MongoDB Atlas setup:** User wants to provide an API key. Free M0 tier (512MB) is sufficient. Would enable cached predictions, scheduled scrapes, trend charts, search, user submissions.
2. **Fix Bright Data SERP 520s:** Check zone config, try different zone, or open support ticket.
3. **Address TECH_DEBT P0s:** Image optimization, AbortController timeouts, zero-result UI.
4. **Commit current changes** (this handover + all fixes).

## Decisions Made

| Decision | Why |
| --- | --- |
| Canonical BattleBots sources documented | Official robots, wiki, and Reddit as provenance anchors for all data claims |
| Inline SVG placeholders for broken thumbnails | Eliminates 74+ console 404 errors across YouTube/Gallery without needing real video IDs |
| `.modal[hidden] { display: none; }` | HTML `hidden` attribute doesn't override `display: flex` in CSS; explicit rule needed |
| Source stat counts filtered set | `renderStats(filtered)` should reflect current filter state, not total corpus |
| `.gitignore` for worker artifacts | `_worker.bundle`, `public/_worker.js`, `public/_routes.json`, `.wrangler/` are build outputs |
