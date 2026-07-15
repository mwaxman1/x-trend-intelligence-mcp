# X-Trend Intelligence Agent

> Ask your AI agent what the world thinks about your competitors.

An MCP (Model Context Protocol) server that provides deterministic social intelligence tools for AI agents (Claude, Cursor, ChatGPT). Instead of a dashboard, it exposes tools that AI agents can call to get competitor sentiment, trend analysis, and brand monitoring from X/Twitter.

## Features

8 intelligence tools, no LLM dependency:

1. **analyze_competitor_sentiment** — Score sentiment of X posts mentioning a competitor
2. **track_brand_mentions** — Monitor brand mention volume and engagement over time
3. **detect_trending_topics** — Get X trends and identify rising topics by post volume
4. **compare_share_of_voice** — Compare mention counts and engagement for 2-5 competitors
5. **identify_complaints** — Find categorized complaints about a brand on X
6. **monitor_keyword_frequency** — Track keyword appearance frequency over time
7. **analyze_influencer_reach** — Analyze an X user's profile, engagement rates, top content
8. **export_intelligence_report** — Generate a combined markdown intelligence report

## Quick Start

### Prerequisites

- An X API bearer token (get one at [developer.x.com](https://developer.x.com))
- An MCP-compatible AI tool (Claude Desktop, Cursor, ChatGPT, etc.)

### Installation

Add the MCP server URL to your AI tool's MCP configuration:

```json
{
  "mcpServers": {
    "x-trend-intelligence": {
      "url": "https://x-trend-intelligence-mcp.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_X_API_TOKEN"
      }
    }
  }
}
```

### Usage

Once connected, just ask your AI agent:

- "What are the top 3 complaints about Notion in the last 48 hours?"
- "How has sentiment around Linear shifted this week?"
- "Compare share of voice: Figma vs Adobe XD vs Sketch"
- "Which trending topics overlap with project management tools?"

Your AI agent calls our tools directly. No dashboard needed.

## Pricing

- **Starter:** $29/mo — 1,000 API calls/mo
- **Pro:** $99/mo — 5,000 API calls/mo
- **Enterprise:** Custom — unlimited calls, custom sentiment lexicon

BYO X API bearer token. X API costs ($0.005/post read) are billed by X directly.

## Architecture

- **Protocol:** MCP over Streamable HTTP
- **Language:** TypeScript / Node.js
- **Hosting:** Vercel serverless functions
- **Sentiment:** Deterministic keyword lexicon (no LLM API costs)
- **Auth:** X API bearer token via Authorization header

## Why X-Trend Intelligence?

| Tool | Price | MCP-native | Sentiment | Dashboard required |
|---|---|---|---|---|
| X-Trend Intelligence | $29/mo | ✓ | ✓ Deterministic | No |
| Brandwatch | $25K+/yr | ✗ | ✓ LLM-based | Yes |
| Talkwalker | $500+/mo | ✗ | ✓ LLM-based | Yes |
| Mention | $29/mo | ✗ | Basic | Yes |

## License

MIT

## Links

- **Live MCP endpoint:** https://x-trend-intelligence-mcp.vercel.app/api/mcp
- **Health check:** https://x-trend-intelligence-mcp.vercel.app/api/health
- **Landing page:** https://x-trend-intelligence-mcp.vercel.app/
- **Product spec:** [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)