# LEARNINGS.md

## 2026-04-27 — Session 2

### Discovery matters more than code speed
- User explicitly said "we need to do a better discovery" — we jumped into building without properly thinking through UX, information hierarchy, and what makes sense to a fan
- The evidence display felt disconnected from the verdict. Next time: design the information flow BEFORE coding the pipeline

### Bright Data SERP via Web Unlocker
- `serp_api2` zone has an IP blocklist on this machine. Use `web_unlocker1` zone instead — it works identically for Google SERP with `brd_json=1`
- `brd_json=1` in the Google URL tells Bright Data to parse HTML into structured JSON. Returns `organic[]` with `url`/`link`, `title`, `description`/`snippet`
- Web Unlocker calls take ~4-25s per query (variable). 6 parallel queries = ~25s total wall time
- Same `POST https://api.brightdata.com/request` pattern as unfancy-search

### Free LLM models on OpenRouter are unreliable
- **Nemotron** (reasoning model): dumps chain-of-thought into `content` field. No prompt engineering fixes this. Wasted significant time trying.
- **Gemma, Llama, Hermes, Dolphin**: all rate-limited on free tier during peak hours
- **Kimi K2.6** (paid, cheap): works cleanly. Keeps reasoning in `reasoning` field, content in `content`. But sometimes uses all tokens on reasoning and returns null content — need higher max_tokens
- Lesson: don't fight a model's architecture. If it leaks reasoning, switch models.

### JSON extraction from LLMs
- Asking for `{p1, p2, p3}` JSON keys works well for structured multi-paragraph output
- Need to handle: JSON in markdown fences, JSON buried in reasoning text, null content fields
- The `extractJson()` function that scans for `{ ... }` blocks containing target keys is robust

### Bot images
- Wiki images work when downloaded locally. Hotlinking is blocked.
- Images stored in `public/img/` and served by the Node static file server
- Need to add proper MIME types for `.png` and `.jpg` in the server

### UX feedback
- "Evidence doesn't feel connected to the verdict" — the raw Reddit snippets shown as citations feel random
- Better approach: verdict first → "based on N mentions" → collapsible evidence pool
- Bot images should be visible from the start (in selectors), not only after verdict
- The VS loading screen with progress steps works well — keep it

## 2026-04-27 — Session 1

- Bright Data is a BattleBots sponsor. The app should tie directly to BattleBots fandom.
- The preferred direction is Reddit sentiment analysis — concrete, fan-centric, demonstrates fresh public web data.
- The unfancy-search repo uses the same Bright Data API call shape we adopted.
- `format: "raw"` is correct for Google with `brd_json=1`.
