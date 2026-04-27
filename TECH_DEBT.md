# TECH_DEBT.md

## P0 — Next Session (Start Here)

- **Run a proper discovery session before any more code.** Ask about: information hierarchy, what a fan sees first, how the verdict connects to evidence, how prominent Bright Data branding should be, VS screen timing
- **Redesign results page:** verdict hero card → "based on N Reddit mentions" label → collapsible evidence pool. Current flat list of evidence feels disconnected.
- **Show bot images from the start** — in the dropdown area or as preview cards, not only after the verdict
- **Fix LLM null responses** — Kimi K2.6 sometimes uses all tokens on reasoning, returns null content. Increase `max_tokens` or add retry logic with a simpler prompt

## P1 — This Week

- Add proper error handling UI for SERP timeouts (currently silent)
- Add deduplication for Reddit results appearing in multiple queries
- Fix `serp_api2` zone IP blocklist or permanently switch to `web_unlocker1` in docs
- Make the deterministic fallback summary better so it works well even without LLM

## P2 — When Convenient

- Add cost transparency per matchup (like unfancy-search does)
- Consider Dockerizing with docker-compose
- Add URL sharing via query params (`?a=minotaur&b=tombstone`)
- Add more bots to roster (currently 10, could be 20+)

## P3 — Nice To Have

- Add historical comparison: "Last month Reddit favored X, now they favor Y"
- Add shareable verdict cards (OG image generation)
- Add a "random matchup" button

## Resolved Items

- 2026-04-27: Removed Three.js — user wanted functional over fancy
- 2026-04-27: Switched from Web Unlocker to SERP-via-Web-Unlocker pattern
- 2026-04-27: Switched from Nemotron to Kimi K2.6 — reasoning model leakage unfixable
- 2026-04-27: Downloaded bot images locally — wiki blocks hotlinking
