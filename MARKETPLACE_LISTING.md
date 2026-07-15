# X-Trend Intelligence MCP — Marketplace Listing

## Product Name

X-Trend Intelligence

## Tagline

Ask your AI agent what the world thinks about your competitors.

## Short Description (140 chars)

MCP server exposing 8 social intelligence tools for X/Twitter — competitor sentiment, brand monitoring, trend detection, and share-of-voice.

## Long Description

X-Trend Intelligence is an MCP (Model Context Protocol) server that gives AI agents real-time social intelligence from X/Twitter. Instead of a dashboard, it exposes deterministic tools that Claude, Cursor, ChatGPT, and other MCP-compatible clients can call directly.

**What it does:** Your AI agent calls our tools to analyze competitor sentiment, track brand mentions, detect trending topics, compare share of voice, identify customer complaints, monitor keyword frequency, analyze influencer reach, and export combined intelligence reports — all from X/Twitter data.

**How it's different:**
- **MCP-native:** No dashboard, no exports, no copy-paste. Your AI agent calls tools directly.
- **Deterministic sentiment:** Keyword lexicon scoring — no LLM API costs, no hallucinated sentiment labels.
- **BYO X API token:** You control your data and costs. X API charges ~$0.005/post read directly.
- **Zero-latency intelligence:** Ask a question in natural language, get structured JSON back instantly.

**Who it's for:** Marketing teams, competitive intelligence analysts, brand managers, social media strategists, and founders who want to ask their AI agent "What are people saying about my competitor?" and get an immediate, data-backed answer.

**How to connect:** Add one URL to your AI tool's MCP configuration with your X API bearer token. No installation, no server to run. Works with Claude Desktop, Cursor, ChatGPT, and any MCP-compatible client.

## Category

- **Primary:** Social Media & Analytics
- **Secondary:** Marketing & Brand Intelligence

## Tags

`x` `twitter` `sentiment` `social-intelligence` `competitor-analysis` `brand-monitoring` `trend-analysis` `share-of-voice` `mcp` `market-intelligence` `social-listening`

---

## Tools (8)

### 1. `analyze_competitor_sentiment`
Search recent X posts mentioning a competitor and score sentiment using a deterministic keyword lexicon (100 terms). Returns a sentiment score from −1 to +1, percentage breakdowns (positive/negative/neutral), engagement stats, and the top 5 positive and negative posts with author handles and engagement metrics.

**Parameters:** `competitor_name` (required), `days_back` (1–7, default 7), `max_results` (10–500, default 100)

### 2. `track_brand_mentions`
Track brand mention volume and engagement over time on X. Returns total mentions, unique authors, daily counts with engagement, trend direction and percentage change, and top posts by engagement score. Supports 24h, 7d, and 30d time windows.

**Parameters:** `brand_name` (required), `time_window` (24h/7d/30d, default 7d), `max_results` (10–500, default 100)

### 3. `detect_trending_topics`
Get X/Twitter trending topics for a location and cross-reference with post search to verify volume. Returns trending topic names, tweet volumes, and rising topics identified by post-volume verification.

**Parameters:** `location_id` (WOEID, default worldwide), `top_n` (1–50, default 10), `verify_volume` (default true)

### 4. `compare_share_of_voice`
Compare mention counts and engagement for 2–5 competitors over a time window. Returns share-of-voice percentages, total engagement, average engagement per post, and sentiment label/score for each competitor in a single structured result.

**Parameters:** `competitors` (array of 2–5 names, required), `days_back` (1–7, default 7), `max_results_per_competitor` (10–300, default 100)

### 5. `identify_complaints`
Search for X posts mentioning a brand alongside negative keywords (broken, worst, terrible, etc.) and categorize them. Returns total complaints found, category breakdown with counts and percentages, and top complaints by engagement with direct links to the original posts.

**Parameters:** `brand_name` (required), `days_back` (1–7, default 7), `max_results` (10–500, default 200)

### 6. `monitor_keyword_frequency`
Track how often a keyword or phrase appears in X posts over time. Returns daily counts, peak day identification, related hashtags with frequency, and sample posts. Useful for tracking campaign hashtags, product launches, or industry terms.

**Parameters:** `keyword` (required), `days_back` (1–7, default 7), `max_results` (10–1000, default 500)

### 7. `analyze_influencer_reach`
Look up an X user profile and analyze their reach. Returns follower count, following count, tweet count, verified status, recent post engagement rates, top-performing content by engagement, and estimated reach based on impressions and engagement metrics.

**Parameters:** `username` (required, without @), `max_tweets` (10–3200, default 100)

### 8. `export_intelligence_report`
Generate a comprehensive markdown intelligence report combining brand mentions, competitor sentiment, share of voice, and complaints into one deliverable. Configurable sections, custom report title, and includes a methodology section documenting the sentiment scoring approach.

**Parameters:** `brand_name` (required), `competitors` (array, optional), `days_back` (1–7, default 7), `include_complaints` (default true), `include_share_of_voice` (default true), `report_title` (optional)

---

## Pricing

### Starter — $29/month
- 1,000 tool calls per month
- All 8 tools included
- BYO X API bearer token
- Email support
- Community Discord access

**What you supply:** Your own X API bearer token (available at [developer.x.com](https://developer.x.com)). X API costs (~$0.005/post read) are billed by X directly and are separate from this subscription.

### Pro — $99/month
- 5,000 tool calls per month
- All 8 tools included
- BYO X API bearer token
- Priority email support
- Community Discord access
- Custom sentiment lexicon support (early access)

**What you supply:** Your own X API bearer token (available at [developer.x.com](https://developer.x.com)). X API costs (~$0.005/post read) are billed by X directly and are separate from this subscription.

### Enterprise — Custom
- Unlimited tool calls
- Custom sentiment lexicon
- Dedicated support
- SLA and uptime guarantees
- On-premise deployment option

---

## Support & Contact

- **Documentation:** [GitHub README](https://github.com/mwaxman1/x-trend-intelligence-mcp#readme)
- **Live endpoint:** https://x-trend-intelligence-mcp.vercel.app/api/mcp
- **Health check:** https://x-trend-intelligence-mcp.vercel.app/api/health
- **Landing page:** https://x-trend-intelligence-mcp.vercel.app/
- **Issues:** [GitHub Issues](https://github.com/mwaxman1/x-trend-intelligence-mcp/issues)
- **Email:** support@x-trend-intelligence.com
- **Response time:** Starter — 48 hours; Pro — 24 hours; Enterprise — 4 hours

---

## Privacy & Data Handling

### What we collect
- **Nothing.** X-Trend Intelligence does not store, log, or retain any user data, search queries, or API results. Each request is processed in a stateless serverless function and discarded immediately after the response is sent.

### How authentication works
- Users provide their own X API bearer token via the `Authorization` header.
- The token is used for that single request only — no server-side persistence, no session storage, no token caching.
- The server creates a fresh MCP server instance per request, scoped to that token, and closes it after the response.

### Data flow
1. User's AI agent sends a tool call with the user's X API bearer token.
2. The serverless function calls the X API v2 using that token.
3. Results are processed (sentiment scoring, aggregation) in-memory.
4. Structured JSON or markdown is returned to the AI agent.
5. No data is written to disk, database, or any persistent store.

### Third-party data
- All social data comes from the X/Twitter API v2, accessed with the user's own credentials.
- No data is shared with, sold to, or transmitted to any third party.

---

## FAQ

### Do I need an X API account?
Yes. You need an X API bearer token, available at [developer.x.com](https://developer.x.com). X offers free tier access and paid tiers starting at $100/month. X API costs are separate from your X-Trend Intelligence subscription.

### Which MCP clients are supported?
Any client that supports MCP over Streamable HTTP: Claude Desktop, Cursor, ChatGPT (with MCP support), and others. You add one URL and your X API token to your client's MCP configuration.

### How is sentiment scored?
Sentiment uses a deterministic keyword lexicon — 100 terms (50 positive, 50 negative). Each post is tokenized and matched against the lexicon. The score is (positive_count − negative_count) / total_posts, ranging from −1 to +1. No LLM is involved, so there are no API costs for sentiment and no hallucinated labels.

### What's the time range for searches?
X API v2 recent search covers the last 7 days. All tools that search posts respect this 7-day limit. The `track_brand_mentions` tool supports 24h, 7d, and 30d windows (30d uses paginated search within the 7-day API limit).

### Is my data stored?
No. The server is stateless. Every request is processed and discarded. No databases, no logs, no analytics tracking on the server side.

### Can I use this without an MCP client?
The server exposes tools via the MCP protocol. You need an MCP-compatible AI tool to call them. You cannot use it as a REST API directly.

### What happens if I hit the rate limit?
X API rate limits depend on your X API tier. If you hit a 429 rate limit, the server returns a structured error with a hint to wait before retrying. Your X-Trend Intelligence call quota is separate from X API rate limits.

### Can I customize the sentiment lexicon?
Pro plan includes early access to custom sentiment lexicon support. Enterprise customers get fully custom lexicons. Contact support to configure.

### What's the difference between X-Trend Intelligence and Brandwatch/Mention?
X-Trend Intelligence is MCP-native (no dashboard), uses deterministic sentiment (no LLM costs), and costs $29–$99/month instead of $500–$25,000/year. It's built for teams who want intelligence inside their AI workflow, not in a separate dashboard.

---

## Launch Announcement Copy

### GitHub (Release / Discussion)

**Title:** 🚀 X-Trend Intelligence MCP — Social intelligence tools for your AI agent

**Body:**

Ask your AI agent what the world thinks about your competitors.

X-Trend Intelligence is an MCP server that exposes 8 social intelligence tools for X/Twitter — competitor sentiment, brand monitoring, trend detection, share-of-voice, complaint identification, keyword tracking, influencer analysis, and combined intelligence reports.

**Why we built it:** Social intelligence tools cost $500–$25K/year and force you into a dashboard. We wanted to ask Claude "What are people saying about Linear?" and get a data-backed answer. So we built it as an MCP server.

**What makes it different:**
- 🔧 **MCP-native** — no dashboard, no exports. Your AI agent calls tools directly.
- 📊 **Deterministic sentiment** — keyword lexicon, no LLM API costs, no hallucinations.
- 🔑 **BYO X API token** — you control data and costs.
- 💸 **$29/mo Starter, $99/mo Pro** — 10× cheaper than incumbents.

**Get started:**
1. Get an X API bearer token at [developer.x.com](https://developer.x.com)
2. Add the MCP endpoint to your AI tool:
```json
{
  "mcpServers": {
    "x-trend-intelligence": {
      "url": "https://x-trend-intelligence-mcp.vercel.app/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_X_API_TOKEN" }
    }
  }
}
```
3. Ask your AI agent: "What are the top 3 complaints about Notion this week?"

🔗 **Repo:** https://github.com/mwaxman1/x-trend-intelligence-mcp
🔗 **Live endpoint:** https://x-trend-intelligence-mcp.vercel.app/api/mcp
🔗 **Landing page:** https://x-trend-intelligence-mcp.vercel.app/

---

### Reddit (r/MCP or r/ArtificialInteligence)

**Title:** I built an MCP server that lets your AI agent do social intelligence on X/Twitter (sentiment, trends, brand monitoring) — $29/mo, no dashboard

**Body:**

Tired of paying $500+/month for social listening dashboards? I built X-Trend Intelligence as an MCP server so your AI agent (Claude, Cursor, ChatGPT) can call social intelligence tools directly.

8 tools:
1. Competitor sentiment analysis (deterministic keyword lexicon, no LLM costs)
2. Brand mention tracking (24h/7d/30d windows)
3. Trending topic detection
4. Share-of-voice comparison (2-5 competitors)
5. Complaint identification (categorized)
6. Keyword frequency monitoring
7. Influencer reach analysis
8. Combined intelligence report (markdown export)

It's MCP-native — no dashboard. You add one URL + your X API token to your AI tool's config and ask questions in natural language.

Pricing: $29/mo (1K calls) or $99/mo (5K calls). BYO X API token (X charges ~$0.005/post read separately).

Live now at https://x-trend-intelligence-mcp.vercel.app/api/mcp

Repo: https://github.com/mwaxman1/x-trend-intelligence-mcp

Would love feedback, especially on:
- Are there tools you'd want that aren't in the list?
- Would you pay $29/mo for this?
- What other platforms (Reddit, TikTok, LinkedIn) would you want next?

---

### X/Twitter

I built an MCP server that lets your AI agent do social intelligence on X/Twitter — competitor sentiment, brand monitoring, trends, share-of-voice, complaints, influencer analysis.

8 tools. Deterministic sentiment (no LLM costs). BYO X API token. $29/mo.

No dashboard. Just ask your AI: "What are people saying about my competitor?"

🔗 https://github.com/mwaxman1/x-trend-intelligence-mcp

#MCP #AI #SocialIntelligence #BuildInPublic

---

### Product Hunt

**Tagline:** Ask your AI agent what the world thinks about your competitors.

**Description:**

X-Trend Intelligence is an MCP server that gives AI agents 8 social intelligence tools for X/Twitter — competitor sentiment, brand monitoring, trend detection, share-of-voice, complaint identification, keyword tracking, influencer analysis, and combined reports.

**The problem:** Social intelligence tools cost $500–$25K/year and force you into a dashboard. You copy-paste data into your AI tool to analyze it.

**Our solution:** MCP-native tools your AI agent calls directly. No dashboard. No copy-paste. Just ask "What are people saying about my competitor?" and get structured, data-backed answers.

**Key features:**
- 📊 Deterministic sentiment scoring (100-term keyword lexicon, no LLM costs, no hallucinations)
- 🔧 8 tools covering sentiment, mentions, trends, share-of-voice, complaints, keywords, influencers, and reports
- 🔑 BYO X API token (you control data and costs)
- 🚀 Stateless serverless — no data stored, no sessions, no tracking
- 💸 $29/mo Starter or $99/mo Pro (10× cheaper than incumbents)

**Works with:** Claude Desktop, Cursor, ChatGPT, and any MCP-compatible AI tool.

**Get started in 2 minutes:**
1. Get an X API token at developer.x.com
2. Add our URL to your AI tool's MCP config
3. Ask: "What are the top complaints about [competitor] this week?"

🔗 **Live:** https://x-trend-intelligence-mcp.vercel.app/
🔗 **Repo:** https://github.com/mwaxman1/x-trend-intelligence-mcp

**Maker:** Mike Waxman (@mwaxman1)

---

*This listing document was prepared for MCPize marketplace submission and the official MCP Registry. Publication requires authenticated developer accounts.*