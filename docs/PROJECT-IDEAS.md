# Bright Data x BattleBots — 10 Project Ideas

Pick 3. Each uses a **different** Bright Data product. All BattleBots-themed.

---

| # | Name | BD Product | Complexity | Build Time | Fun Factor | Showcase Value |
|---|------|-----------|------------|------------|------------|----------------|
| 1 | Bot Wiki Scraper | **Scraper API** | Low | 1 day | ★★★ | ★★★★ |
| 2 | YouTube Fight Analyzer | **Scraper API** (YouTube) | Medium | 2 days | ★★★★ | ★★★★★ |
| 3 | Fight Night Live Tracker | **Browser API** | High | 3 days | ★★★★★ | ★★★★★ |
| 4 | BattleBots News Aggregator | **Crawl API** | Low | 1 day | ★★ | ★★★ |
| 5 | Builder Social Monitor | **Scraper API** (Social) | Medium | 2 days | ★★★★ | ★★★★ |
| 6 | Bot Part Price Tracker | **Scraper API** (eCommerce) | Medium | 2 days | ★★★ | ★★★★ |
| 7 | Fan Art Gallery | **Browser API** | Low | 1 day | ★★★★ | ★★★ |
| 8 | Reddit Deep Thread Analyzer | **Web Unlocker** | Medium | 2 days | ★★★★ | ★★★★ |
| 9 | BattleBots SEO Dashboard | **SERP API** | Medium | 2 days | ★★ | ★★★★★ |
| 10 | Match History Database | **Scraper API** + **Crawl API** | High | 3 days | ★★★★★ | ★★★★★ |

---

## 1. Bot Wiki Scraper
**BD Product:** Scraper API (AI Scraper Studio)

Scrape the entire BattleBots wiki (500+ bots) into a structured database. Display a searchable bot encyclopedia with stats, fight history, weapon types, and team info. Shows Scraper Studio turning messy wiki pages into clean JSON.

**What it proves:** Scraper Studio can auto-generate a scraper for any domain. Zero custom code for extraction.

---

## 2. YouTube Fight Analyzer
**BD Product:** Scraper API (YouTube endpoint)

Scrape YouTube for every BattleBots fight video — views, likes, comments, upload date. Rank fights by popularity. Show "Most Watched Fights of All Time", "Most Controversial" (high comment/like ratio), and trending clips. LLM summarizes top comments.

**What it proves:** YouTube Scraper API returns structured data (views, comments, metadata) that powers real analytics.

---

## 3. Fight Night Live Tracker
**BD Product:** Browser API (Playwright/Puppeteer on Bright Data)

During a live BattleBots event, the app monitors social media in real-time via Browser API — scraping live Twitter/X feeds, Reddit threads, and Discord reactions as fights happen. Shows a live sentiment dashboard with spikes during knockouts and upsets.

**What it proves:** Browser API handles dynamic, JS-heavy pages (Twitter feeds, live Reddit threads) that static scraping can't touch.

---

## 4. BattleBots News Aggregator
**BD Product:** Crawl API

Crawl 10+ BattleBots news sources, blogs, and forums. Extract articles into a clean feed with headlines, summaries, dates, and source links. LLM categorizes each article (team news, rule changes, event schedule, build logs). Markdown-ready for AI/LLM consumption.

**What it proves:** Crawl API maps full domains and extracts content as Markdown/JSON — built for AI training data and content workflows.

---

## 5. Builder Social Monitor
**BD Product:** Scraper API (Instagram, X/Twitter, TikTok endpoints)

Track the social media presence of top BattleBots builders. Scrape their Instagram, X, and TikTok for post counts, engagement rates, follower growth, and latest content. Show a "Builder Influence Leaderboard" — who has the biggest following, who's posting the most, who gets the most engagement.

**What it proves:** Social Scraper APIs (Instagram profiles, X posts, TikTok profiles) return structured engagement data across platforms in one pipeline.

---

## 6. Bot Part Price Tracker
**BD Product:** Scraper API (Amazon, eBay/eCommerce endpoints)

Track prices of common BattleBots components — motors, batteries, ESCs, armor materials, spinners — across Amazon and other retailers. Show a "Build Cost Calculator" where you pick a weapon type (spinner, flipper, crusher) and see estimated build costs with live prices. Price history charts.

**What it proves:** eCommerce Scraper APIs (Amazon products) return structured pricing data that powers real business tools.

---

## 7. Fan Art Gallery
**BD Product:** Browser API

Use Browser API with Playwright to scrape BattleBots fan art from DeviantArt, Reddit, and Instagram. Renders JS-heavy gallery pages, extracts image URLs and metadata, and displays a curated gallery. Fans can browse by bot name.

**What it proves:** Browser API handles image-heavy, JS-rendered pages that require full browser interaction (infinite scroll, lazy loading).

---

## 8. Reddit Deep Thread Analyzer
**BD Product:** Web Unlocker API

Go deeper than our current SERP-based approach. Use Web Unlocker to fetch full Reddit thread pages (not just Google snippets), extract all comments and replies, and run deep sentiment analysis on actual fan discussions. Show opinion shift over time.

**What it proves:** Web Unlocker reliably fetches protected pages (Reddit's anti-bot defenses) and returns clean HTML for parsing. Goes beyond SERP snippets.

---

## 9. BattleBots SEO Dashboard
**BD Product:** SERP API

Track how BattleBots-related keywords rank on Google over time. Which bots trend in search? Which teams dominate search visibility? Compare "Minotaur BattleBots" vs "Tombstone BattleBots" search presence. Show Google Trends-style charts built from SERP data.

**What it proves:** SERP API delivers structured search engine data for competitive intelligence and SEO monitoring.

---

## 10. Match History Database
**BD Product:** Scraper API + Crawl API

Build the definitive BattleBots match database. Crawl API maps battlebots.com and the wiki for full site structure. Scraper API extracts structured fight data: bot A, bot B, winner, method (KO/JD/TKO), season, episode. Searchable, filterable, with win/loss records per bot.

**What it proves:** Crawl API + Scraper API together handle both domain discovery and structured extraction at scale.

---

## Recommendation

For 3 projects with maximum **product diversity** and **build speed**:

| Pick | Why |
|------|-----|
| **#2 YouTube Fight Analyzer** | Uses YouTube Scraper API. High fun factor. Visual (video thumbnails, view counts). Fast to build. |
| **#8 Reddit Deep Thread Analyzer** | Uses Web Unlocker. Directly extends the existing H2H project. Shows deeper data vs SERP snippets. |
| **#5 Builder Social Monitor** | Uses Social Scraper APIs (Instagram + X + TikTok). Multi-platform. Leaderboard format is shareable. |

Alternative set (if you want Crawl API + Browser API instead):

| Pick | Why |
|------|-----|
| **#10 Match History Database** | Crawl API + Scraper API. Most comprehensive. The "serious" project. |
| **#3 Fight Night Live Tracker** | Browser API. Most impressive demo. Real-time feel. |
| **#1 Bot Wiki Scraper** | Scraper Studio. Fastest to build. Shows AI-generated scraper. |
