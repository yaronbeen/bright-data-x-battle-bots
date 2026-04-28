# Build Specs — 4 New BattleBots x Bright Data Projects

Each project: different BD product, same visual language as the reference (battle-bot-intel-hub.vercel.app), deployable to Cloudflare Pages.

---

## Project 1: Bot Encyclopedia (Scraper Studio)

**One sentence:** Searchable encyclopedia of 500+ BattleBots scraped from the wiki using Bright Data Scraper Studio.

**What the user sees:**
- Landing: grid of bot cards (photo, name, weapon type, win/loss badge)
- Search/filter bar: by name, weapon type, season
- Click a bot → detail panel: full stats, fight history, team info, seasons
- "Powered by Bright Data Scraper Studio" badge

**What Bright Data does:**
- Scraper Studio auto-generates a scraper for battlebots.fandom.com
- Extracts: name, weapon, team, seasons, wins, losses, image URL, weight class
- Runs once, stores results as JSON (no live scraping needed per visit)

**Data source:** battlebots.fandom.com/wiki/Category:Robots
**Stack:** Static JSON data file + vanilla HTML/CSS/JS. Pre-scraped data committed to repo.
**Build time:** 1 day

---

## Project 2: YouTube Fight Ranker (YouTube Scraper API)

**One sentence:** "Most Watched BattleBots Fights of All Time" — a ranked leaderboard of fight videos scraped from YouTube.

**What the user sees:**
- Landing: leaderboard table — rank, video thumbnail, title, views, likes, comments, upload date
- Sort by: views, likes, comments, controversy score (comments ÷ likes ratio)
- Click a row → video embed or YouTube link
- Stats at top: total fights analyzed, total views, most popular bot
- "Data collected via Bright Data YouTube Scraper API"

**What Bright Data does:**
- YouTube Scraper API searches "BattleBots" + "fight" + bot names
- Returns structured data: title, URL, views, likes, comments, duration, thumbnail, upload date
- Discover endpoint: search by keyword, collect video metadata

**Data source:** YouTube (via BD YouTube Scraper API)
**Stack:** Pre-scraped JSON + sortable table UI. Could add live refresh button.
**Build time:** 2 days

---

## Project 4: BattleBots News Hub (Crawl API)

**One sentence:** Aggregated news feed from 8+ BattleBots sources, crawled and structured by Bright Data Crawl API.

**What the user sees:**
- Landing: clean news feed — headline, 2-line summary, source logo, date, category tag
- Filter by: source, category (Team News, Events, Rule Changes, Build Logs, Recaps)
- LLM auto-categorizes and summarizes each article
- "Crawled by Bright Data Crawl API" with source count

**What Bright Data does:**
- Crawl API maps each domain's structure and extracts articles as markdown
- Sources: battlebots.com, builders' blogs, robotcombatevents.com, fan sites
- Returns: URL, title, full text (markdown), date, domain

**Data source:** Multiple BattleBots-related domains
**Stack:** Pre-crawled JSON + news feed UI with filters.
**Build time:** 1 day

---

## Project 7: Fight Media Gallery (Browser API)

**One sentence:** Visual gallery of BattleBots fight photos and video moments, scraped from JS-heavy pages via Browser API.

**What the user sees:**
- Landing: masonry grid of fight images/thumbnails
- Filter by: bot name, season, media type (photo, GIF, video thumbnail)
- Click → full-size view with caption, source link, tagged bots
- "Collected via Bright Data Browser API (Playwright)"

**What Bright Data does:**
- Browser API runs Playwright scripts on Bright Data's cloud browsers
- Handles: Reddit image galleries (infinite scroll), YouTube thumbnails (JS-rendered), Instagram embeds
- Extracts: image URL, caption/title, source page URL, tagged bot names

**Data source:** Reddit r/battlebots, YouTube thumbnails, team Instagram
**Stack:** Pre-scraped image URLs + masonry gallery UI. Images hotlinked from source.
**Build time:** 1-2 days

---

## Shared Design Language

All 4 projects should match the reference site's aesthetic:
- **Clean white background**, purple/dark accents
- **Card-based layouts** with subtle shadows and borders
- **"Powered by Bright Data [Product]"** in footer/badge
- **Same header structure**: logo + nav + hero section
- **Responsive**, screenshot-worthy
- **Deployed to Cloudflare Pages** (free)

## Build Order

1. **#1 Bot Encyclopedia** — fastest, establishes the visual template
2. **#4 News Hub** — second fastest, different BD product (Crawl API)
3. **#2 YouTube Ranker** — medium complexity, high visual impact
4. **#7 Fight Gallery** — needs Browser API setup, build last
