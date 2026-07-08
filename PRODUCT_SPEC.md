# X-Trend Intelligence Agent — Product Specification

**Product:** X-Trend Intelligence Agent
**Type:** MCP (Model Context Protocol) server
**Tagline:** "Ask your AI agent what the world thinks about your competitors."
**Pricing:** $29/mo (1,000 API calls) · $99/mo (5,000 calls) · Enterprise (custom)
**Distribution:** MCPize marketplace, MCP Registry, direct landing page
**Status:** In development — targeting launch within 48 hours

---

## 1. Problem

Social listening tools (Brandwatch, Talkwalker, Sprout Social) are built for human analysts staring at dashboards. They cost $500–$25,000/mo and require a separate login, separate workflow, and a human to interpret the data.

Meanwhile, 15,926 MCP servers exist on GitHub (May 2026) and every major AI tool (Claude, Cursor, ChatGPT, Grok) now supports MCP natively. But the X MCP server launched June 30, 2026 only provides raw API access — no intelligence layer.

**Nobody has built the "intelligence" middleware** that lets an AI agent answer questions like:
- *"What are the top 3 complaints about [Competitor] in the last 48 hours?"*
- *"How has sentiment around [Brand] shifted this week?"*
- *"Which trending topics overlap with [Industry] right now?"*

---

## 2. Solution

X-Trend Intelligence Agent is an MCP server that wraps the X API v2 with deterministic intelligence tools. AI agents (Claude, Cursor, ChatGPT) call our tools directly — no dashboard, no separate login, no human interpretation required.

**Key differentiator:** All sentiment and trend analysis is **deterministic** (keyword lexicon + engagement scoring + frequency analysis). No LLM API dependency. No per-token costs. Fast, transparent, and reproducible.

---

## 3. Technical Architecture

- **Protocol:** MCP over Streamable HTTP
- **Language:** TypeScript / Node.js
- **Hosting:** Vercel serverless functions
- **X API:** v2 pay-per-use ($0.005/post read). Users bring their own bearer token.
- **Auth:** Bearer token via Authorization header
- **No LLM dependency:** All logic is deterministic

### Tools (8)

| Tool | What it does | Input | Output |
|---|---|---|---|
| `analyze_competitor_sentiment` | Search X posts mentioning a competitor, score sentiment | competitor name, time window | sentiment score, top posts, breakdown |
| `track_brand_mentions` | Monitor brand mentions over time | brand name, time window (24h/7d/30d) | volume trend, engagement stats, top posts |
| `detect_trending_topics` | Get X trends for a location, identify rising topics | location (WOEID) | trending topics with post volume |
| `compare_share_of_voice` | Compare mention counts for 2-5 competitors | competitor names, time window | SOV percentages, engagement comparison |
| `identify_complaints` | Find negative posts about a brand | brand name, time window | categorized complaints with post URLs |
| `monitor_keyword_frequency` | Track keyword appearance over time | keyword/phrase, time window | daily counts, trend direction |
| `analyze_influencer_reach` | Profile an X user's engagement | username | follower count, engagement rate, top content |
| `export_intelligence_report` | Generate markdown report combining analyses | brand + competitors | structured markdown report |

### Sentiment Scoring (Deterministic)

- **Positive lexicon:** ~50 words (love, great, amazing, awesome, excellent, perfect, recommend, best, fantastic, etc.)
- **Negative lexicon:** ~50 words (hate, terrible, awful, worst, broken, sucks, disappointed, scam, useless, buggy, etc.)
- **Score:** `(positive_count - negative_count) / total_posts`
- **Range:** -1.0 (fully negative) to +1.0 (fully positive)
- **Label:** positive (>0.1), negative (<-0.1), neutral (between)

---

## 4. Pricing & Unit Economics

### Pricing Tiers

| Tier | Price | API Calls/mo | Target |
|---|---:|---:|---|
| Starter | $29/mo | 1,000 | Solo founders, indie hackers |
| Pro | $99/mo | 5,000 | Growth-stage SaaS, agencies |
| Enterprise | Custom | Unlimited | Agencies, enterprises |

### Cost Structure

| Cost Item | Amount | Notes |
|---|---:|---|
| Vercel hosting | $0–$20/mo | Free tier covers early stage |
| X API cost per call | $0.005/post read | Passed through to user's own token |
| MCPize revenue share | 15% of revenue | 85% to us |
| Stripe processing | 2.9% + 30¢ | On our subscription billing |

### Unit Economics (at $29/mo Starter)

| Metric | Value |
|---|---|
| ARPU | $29/mo |
| Gross margin | ~90% (Vercel + MCPize fees only) |
| LTV (24-month retention) | $696 |
| CAC target | <$30 |
| LTV/CAC target | >20× |

### Why $29/mo Works

- **Mention** (basic social listening) charges $29/mo — same price, but requires a dashboard
- **Brand24** starts at $199/mo — 7× more expensive
- **Talkwalker** starts at $500/mo — 17× more expensive
- We're the cheapest "intelligence" option, and the only one that's MCP-native
- At $29/mo, a single competitor insight that prevents one churned customer pays for 12 months

---

## 5. Competitive Landscape

| Tool | Price | MCP-native? | Sentiment? | Dashboard required? |
|---|---:|---|---|---|
| Brandwatch | $25K+/yr | No | Yes (LLM-based) | Yes |
| Talkwalker | $500+/mo | No | Yes (LLM-based) | Yes |
| Sprout Social | $249+/mo | No | Partial | Yes |
| Mention | $29/mo | No | Basic | Yes |
| Brand24 | $199/mo | No | Yes | Yes |
| X MCP (official) | Free (API costs only) | Yes | No | No |
| **X-Trend Intelligence** | **$29/mo** | **Yes** | **Yes (deterministic)** | **No** |

### Differentiation

1. **MCP-native:** AI agents call tools directly. No dashboard, no separate login.
2. **Deterministic sentiment:** No LLM API costs. Transparent, reproducible scoring.
3. **10× cheaper than enterprise tools:** $29/mo vs $500+/mo.
4. **First-mover on MCP marketplace:** The X MCP server is 8 days old. No intelligence middleware exists.
5. **BYO X API token:** Users pay X directly for data. We charge for intelligence.

---

## 6. Go-to-Market

### Distribution Channels

| Channel | Priority | CAC est. | Notes |
|---|---:|---:|---|
| MCPize marketplace | 1 | $5 | Native MCP marketplace; organic discovery |
| MCP Registry (official) | 2 | $10 | registry.modelcontextprotocol.io |
| Product Hunt | 3 | $50 | One-time launch spike |
| GitHub README + stars | 4 | $15 | Open-source the server, charge for hosted |
| r/MCP, r/ClaudeAI, r/Cursor | 5 | $10 | High-intent developer communities |
| Twitter/X build-in-public | 6 | $20 | Meta: using X to promote an X tool |

### Launch Sequence

**Day 1 (today):**
- Build MCP server (in progress via subagent)
- Deploy to Vercel
- Test all 8 tools

**Day 2:**
- Publish on MCPize marketplace
- List on MCP Registry
- Write landing page
- Create GitHub repo with README

**Day 3:**
- Post on r/MCP, r/ClaudeAI, r/Cursor
- Twitter thread: "I built an MCP server that lets Claude analyze your competitors on X"
- Submit to Product Hunt (schedule for a Tuesday)

**Day 7:**
- Product Hunt launch
- Dev.to article: "How to build an MCP server that does deterministic sentiment analysis"

### First-Customer Targets

| Milestone | Target |
|---|---|
| First MCPize install | Day 3 |
| First paying customer | Day 7 |
| $100 MRR | Day 14 |
| $500 MRR | Day 30 |
| $2K MRR | Day 60 |

---

## 7. Risk Register

| Risk | Mitigation |
|---|---|
| X API pricing changes | BYO token — cost passed to user; our pricing is for intelligence, not data |
| X MCP server adds intelligence tools natively | Move to multi-platform (Reddit, LinkedIn, TikTok MCP servers) |
| Competitor copies our approach | First-mover on MCPize + open-source community = moat |
| Low MCPize marketplace traffic | Diversify with GitHub stars, r/MCP, Product Hunt |
| X API rate limits | Built-in rate-limit handling + graceful degradation |
| Deterministic sentiment is too basic | Acceptable for $29/mo; offer Pro tier with enhanced lexicon |

---

## 8. File Locations

| File | Location |
|---|---|
| MCP server source | `/home/mike/projects/x-trend-intelligence-mcp/` |
| Product spec | `/home/mike/projects/x-trend-intelligence-mcp/PRODUCT_SPEC.md` |

---

**Bottom line:** First-mover MCP intelligence tool on a platform that's 8 days old. $29/mo, 90% margins, deterministic (no LLM costs), and the entire AI agent ecosystem is the distribution channel. Launch target: 48 hours.