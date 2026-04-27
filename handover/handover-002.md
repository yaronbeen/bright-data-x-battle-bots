# Handover 002 — 2026-04-27

## What Was Done

### Built the head-to-head predictor MVP
- Two dropdowns with 10 real BattleBots (Minotaur, Hydra, Witch Doctor, Bite Force, Tombstone, End Game, SawBlaze, Cobalt, HyperShock, Whiplash)
- Pipeline: 3 Reddit-targeted Google queries per bot → Bright Data Web Unlocker SERP → sentiment scoring → optional LLM verdict
- VS loading screen with bot images and step-by-step progress text
- Verdict card, side-by-side sentiment bars, cited evidence, collapsible SERP trace
- 12 passing tests covering roster, validation, sentiment, full pipeline, LLM

### Bright Data integration working
- Using `web_unlocker1` zone (not `serp_api2` — that zone has an IP blocklist issue)
- `brd_json=1` param in Google URL → Bright Data returns structured JSON with `organic[]` results
- 6 parallel SERP queries per matchup, ~25s total

### LLM integration
- Tried Nemotron (free, reasoning model) — total failure, leaks chain-of-thought into output
- Tried Gemma, Llama, others — all rate-limited on free tier
- Landed on **Kimi K2.6** via OpenRouter — works cleanly, keeps reasoning separate from content
- JSON extraction approach: ask for `{p1, p2, p3}` keys, parse into paragraphs
- BUT: Kimi sometimes returns null content when it uses all tokens on reasoning. Needs more max_tokens or a fallback.

### Bot images
- Downloaded 10 real bot photos from BattleBots wiki to `public/img/`
- Served locally (wiki blocks hotlinking)

## Critical User Feedback for Next Session

**"We need to do a better discovery."** The user explicitly said:

1. **The evidence shown doesn't feel connected to the verdict.** The cited Reddit snippets feel random, not like they support the conclusion. The UX should be: verdict first → then "based on X mentions" → collapsible pool of mentions if you want to dig in.

2. **Less transparency, not more.** Don't show raw evidence upfront. Show the verdict prominently. Then say "extrapolated from N Reddit mentions using an LLM." Make the evidence collapsible/secondary.

3. **Images should show from the start.** Bot photos should appear in the dropdown or next to the selectors, not only after the verdict is revealed.

4. **The overall flow needs more design thinking.** The current build was too code-first. Next session should START with a proper discovery about: what does a fan actually want to see? What's the information hierarchy? What makes this feel like a real product vs a tech demo?

## Current State

- App runs at `npm run dev` on port 3100
- Requires: `BRIGHT_DATA_API_TOKEN`, `BRIGHT_DATA_SERP_ZONE=web_unlocker1`
- Optional: `LLM_API_KEY`, `LLM_MODEL=moonshotai/kimi-k2.6`, `LLM_BASE_URL=https://openrouter.ai/api/v1/chat/completions`
- 12/12 tests pass
- `.env` has live credentials (gitignored)

## Open Issues

- LLM sometimes returns null (Kimi uses all tokens on reasoning, leaves content empty)
- Evidence display needs complete redesign per user feedback
- Bot images not visible in initial dropdown state
- No error handling UI for SERP timeouts
- `serp_api2` zone has IP blocklist — using `web_unlocker1` as workaround

## Next Steps

1. **Run a proper discovery session** before any more code. Ask about: information hierarchy, what a fan wants to see first, how prominent Bright Data branding should be, whether the VS screen timing/flow feels right
2. Redesign the results page: verdict hero → "based on N mentions" → collapsible evidence
3. Show bot images in the selector area from the start
4. Fix LLM reliability (increase max_tokens, add retry, or switch model)
5. Consider whether the deterministic summary is good enough without LLM

## Decisions Made

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-04-27 | Dropped Three.js | User said "forget three.js, build something functioning" |
| 2026-04-27 | Adopted unfancy-search SERP pattern | User pointed to yaronbeen/unfancy-search as inspiration |
| 2026-04-27 | Pivoted to head-to-head predictor | More meaningful than generic search box |
| 2026-04-27 | 10 iconic bots in roster | User chose "nice to have" roster, ~10 bots |
| 2026-04-27 | Two dropdowns → "Who wins?" flow | User selected this over auto-rivals or matchup grid |
| 2026-04-27 | Winner pick + why verdict style | User chose sports-style verdict |
| 2026-04-27 | Fan product first | Bright Data trace secondary, collapsed by default |
| 2026-04-27 | Switched from Nemotron to Kimi K2.6 | Nemotron leaks reasoning into output, unfixable |
| 2026-04-27 | Using web_unlocker1 not serp_api2 | serp_api2 has IP blocklist on this machine |
