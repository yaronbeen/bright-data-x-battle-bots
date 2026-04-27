# Brief: BattleBots Head-to-Head — Bright Data Showcase

## Problem
The current MVP shows a verdict + a flat list of Reddit snippets that feel random and disconnected. The evidence doesn't clearly support the verdict, bot photos don't appear until after results, and the LLM is unreliable (free reasoning model leaks chain-of-thought). It feels like a tech demo, not a product Bright Data marketing would proudly show.

## Users
**Primary:** Bright Data marketing team — they need a polished sponsor showcase to put on their website, post on social, and send to the BattleBots partnership team.
**Secondary:** BattleBots fans who'd share screenshots of verdict cards on Twitter/Reddit/Discord.

## Solution Summary
A BattleBots head-to-head matchup tool where you pick two robots and get a screenshot-worthy verdict card showing who Reddit thinks wins. The LLM curates the 3-5 most relevant Reddit quotes and weaves them into a short analytical narrative. Results stream in progressively (sentiment bars first, LLM verdict after). Bot photos are visible from the moment you land on the page.

## Scope

**In:**
- Two-bot selector with photos visible next to dropdowns from the start
- First impression: two robots facing off (photos, names, weapons)
- VS loading screen with progressive results (sentiment bars appear as SERP data arrives, LLM verdict streams in after)
- Screenshot-friendly verdict card: both bot photos side-by-side, sentiment bars, verdict in the middle
- LLM-curated evidence: the 3-5 most relevant Reddit quotes, chosen and explained by the LLM — interesting to read, not random noise
- Below-the-fold: bot stat profiles (weapon, team, sentiment breakdown) + collapsible full evidence
- Reliable paid LLM (Claude Haiku via Anthropic or OpenRouter, ~$0.01/query)
- Bright Data branding: subtle footer ("Powered by Bright Data"), not the hero
- SERP trace: collapsed by default, available for developers who want to look under the hood
- Local demo deployment (not public URL for now)

**Out:**
- Public deployment / custom domain
- User accounts or saved matchups
- Result caching / pre-computation (live SERP every time for now)
- More than 10 bots in roster (expand later)
- Downloadable image generation or OG preview URLs (later phase)
- Betting language or official BattleBots partnership claims

## Constraints
- Budget: showcase project, a few dollars in API costs is fine
- Bright Data `web_unlocker1` zone for SERP (serp_api2 has IP blocklist)
- Paid LLM required — free models are unreliable. Claude Haiku recommended.
- ~30s total latency acceptable if results stream progressively
- Must look good as a screenshot (verdict card is the shareable artifact)
- No framework — vanilla Node.js, no build step

## Success Criteria
- Bright Data marketing looks at it and says "put this on our website" or "post this on social"
- Verdict card is screenshot-worthy: someone would naturally screengrab it for Twitter
- LLM curated evidence feels connected to the verdict — not random snippets
- Bot photos visible on first page load, not hidden until after results
- 100% LLM reliability — no garbage output, no leaked reasoning
- Works in under 30 seconds with progressive reveal (sentiment first, narrative after)

## Edge Cases & Risks
- LLM returns garbage → hard fallback to deterministic summary with sentiment counts
- SERP returns zero Reddit results for a matchup → show "Not enough Reddit discussion" with suggestion to try a different matchup
- Both bots have identical sentiment → "Too close to call" verdict, still show the evidence
- Bot photos fail to load → CSS fallback with bot name initial
- SERP API rate limits or outage → clear error message, not a broken page

## Dependencies
- Bright Data API token + web_unlocker1 zone
- Anthropic API key (or OpenRouter with Claude Haiku)
- 10 bot photos already downloaded to public/img/
- unfancy-search SERP pattern (already implemented in bright-data.js)

## Open Questions
1. Should we use Anthropic directly (cheaper, simpler) or keep OpenRouter as the LLM router?
2. Should the LLM return the curated evidence as structured data (JSON with quote + explanation) or as inline citations in prose?
3. How many matchups should the LLM handle in a single prompt — just the verdict, or verdict + evidence curation in one call?
4. Should we add a "random matchup" or "popular matchups" section to the landing page to reduce friction?
