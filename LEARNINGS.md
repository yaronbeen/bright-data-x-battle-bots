# LEARNINGS.md

## 2026-04-27 — Session 3 (UI polish + deployment)

### Cloudflare Pages deployment
- Cloudflare Pages Functions work perfectly for our use case: static files served from `/public`, API functions in `/functions/api/`
- Functions import our `src/` business logic directly — no bundler needed, Wrangler handles it
- Streaming works via `TransformStream` + `context.waitUntil()` — the Workers runtime supports NDJSON natively
- Secrets set via `wrangler pages secret put` — need a fresh deploy after setting them
- Auth: Global API Key works (`CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`), API Tokens need the "Edit Cloudflare Workers" template
- Free tier: 100k requests/day, 10ms CPU (I/O wait doesn't count), 30s wall clock timeout — fine for our 25-30s pipeline

### SERP descriptions contain "Read more" artifacts
- Bright Data SERP returns Google snippet text that often ends with "Read more", "Read mor", "...Re" (truncated)
- Must strip these client-side before rendering — they look like broken clickable links
- `cleanDesc()` function handles all truncation variants

### Stress test findings that matter
- **70+ findings from 3 parallel agents** (performance, UX, full stress test)
- Most impactful: progressive reveal was fake (just status text), no animations, evidence disconnected from verdict, no branding in screenshots
- Lower priority but real: 1.1MB unoptimized images, no Cache-Control, no timeouts, redundant SERP queries, context-free sentiment

## 2026-04-27 — Session 2

### Discovery matters more than code speed
- User explicitly said "we need to do a better discovery" — jumped into building without thinking through UX
- The evidence display felt disconnected from the verdict. Design the information flow BEFORE coding

### Bright Data SERP via Web Unlocker
- `serp_api2` zone has IP blocklist. Use `web_unlocker1` instead — works identically with `brd_json=1`
- `brd_json=1` in Google URL → Bright Data returns structured JSON with `organic[]`
- Web Unlocker calls take ~4-25s per query. 6 parallel queries = ~25s total

### Free LLM models on OpenRouter are unreliable
- **Nemotron**: dumps chain-of-thought into `content`. Unfixable. Wasted hours.
- **Gemma, Llama, Hermes, Dolphin**: rate-limited on free tier during peak
- **Claude Haiku** (paid, ~$0.01/query): clean structured JSON every time. Worth it.
- Lesson: don't fight a model's architecture. Switch models instead.

### Bot images
- Wiki blocks hotlinking. Download to `public/img/` and serve locally.
- Add proper MIME types for `.png`/`.jpg` in the server.

## 2026-04-27 — Session 1

- Bright Data is a BattleBots sponsor. App ties to fandom.
- Reddit sentiment analysis is the preferred direction.
- unfancy-search repo uses the same Bright Data API call shape.
- `format: "raw"` is correct for Google with `brd_json=1`.
