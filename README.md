# X-Trend Intelligence MCP Server

A production-ready MCP (Model Context Protocol) server that provides deterministic social intelligence tools for AI agents (Claude, Cursor, ChatGPT). Instead of a dashboard, it exposes tools that AI agents can call to get competitor sentiment, trend analysis, and brand monitoring from X/Twitter data.

## Features

- **8 MCP Tools** for social intelligence:
  1. `analyze_competitor_sentiment` — Score sentiment of posts mentioning a competitor
  2. `track_brand_mentions` — Track brand mention volume and engagement over time
  3. `detect_trending_topics` — Get X trends and identify rising topics
  4. `compare_share_of_voice` — Compare mention counts and engagement for 2-5 competitors
  5. `identify_complaints` — Find categorized complaints about a brand
  6. `monitor_keyword_frequency` — Track keyword appearance frequency over time
  7. `analyze_influencer_reach` — Analyze an X user profile and their engagement
  8. `export_intelligence_report` — Generate a combined markdown intelligence report

- **Deterministic sentiment scoring** — No LLM dependency. Uses a 50+ word positive/negative keyword lexicon.
- **MCP-native** — AI agents call tools directly, no dashboard needed.
- **Vercel-ready** — Deploys as serverless functions with Streamable HTTP transport.
- **BYO X API token** — Users bring their own X API v2 bearer token.
- **Optional Xquik source mode** — Use an Xquik API key for search-backed intelligence tools.

## Quick Start

### Prerequisites

- Node.js 20+
- An X API v2 bearer token (get one at [developer.x.com](https://developer.x.com))
- X API access tier with recent search endpoint (Basic or higher)

### Installation

```bash
git clone <repo-url>
cd x-trend-intelligence-mcp
npm install
npm run build
```

### Local Development

```bash
npm run build
# Start the server (requires a Node.js HTTP server wrapper for local testing)
node dist/index.js
```

### Deploy to Vercel

```bash
vercel deploy
```

The MCP endpoint will be at `https://your-project.vercel.app/api/mcp` and the health check at `/api/health`.

## Usage

### Connecting with Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "x-trend-intelligence": {
      "url": "https://your-project.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_X_API_BEARER_TOKEN"
      }
    }
  }
}
```

### Connecting with Cursor

Add to Cursor's MCP settings:

```json
{
  "mcpServers": {
    "x-trend-intelligence": {
      "url": "https://your-project.vercel.app/api/mcp",
      "headers": {
        "x-api-key": "YOUR_X_API_BEARER_TOKEN"
      }
    }
  }
}
```

### Authentication

Provide your X API bearer token via one of:
- `Authorization: Bearer <token>` header
- `x-api-key: <token>` header
- `x-api-bearer: <token>` header

### Optional Xquik Source Mode

For users who already use Xquik, the MCP endpoint can read tweet search results
from Xquik instead of the direct X API. Set these headers on the MCP connection:

```json
{
  "x-data-source": "xquik",
  "x-xquik-api-key": "YOUR_XQUIK_API_KEY"
}
```

Xquik mode supports the search-backed tools:

- `analyze_competitor_sentiment`
- `track_brand_mentions`
- `compare_share_of_voice`
- `identify_complaints`
- `monitor_keyword_frequency`

Use direct X API mode for profile timeline, tweet lookup, and trends tools.

### Health Check

```bash
curl https://your-project.vercel.app/api/health
```

## Tool Reference

### analyze_competitor_sentiment

```json
{
  "tool": "analyze_competitor_sentiment",
  "arguments": {
    "competitor_name": "competitor",
    "days_back": 7,
    "max_results": 100
  }
}
```

Returns sentiment score (-1 to +1), positive/negative/neutral percentages, engagement stats, and top posts.

### track_brand_mentions

```json
{
  "tool": "track_brand_mentions",
  "arguments": {
    "brand_name": "YourBrand",
    "time_window": "7d",
    "max_results": 100
  }
}
```

Returns daily mention counts, trend direction, engagement stats, and top posts.

### detect_trending_topics

```json
{
  "tool": "detect_trending_topics",
  "arguments": {
    "location_id": "1",
    "top_n": 10,
    "verify_volume": true
  }
}
```

Returns trending topics with verified post volume and trend change percentages.

### compare_share_of_voice

```json
{
  "tool": "compare_share_of_voice",
  "arguments": {
    "competitors": ["Brand1", "Brand2", "Brand3"],
    "days_back": 7
  }
}
```

Returns share of voice percentages, mention counts, and sentiment for each competitor.

### identify_complaints

```json
{
  "tool": "identify_complaints",
  "arguments": {
    "brand_name": "YourBrand",
    "days_back": 7,
    "max_results": 200
  }
}
```

Returns categorized complaints (Performance, Bugs, Customer Service, Pricing, etc.) with top posts.

### monitor_keyword_frequency

```json
{
  "tool": "monitor_keyword_frequency",
  "arguments": {
    "keyword": "AI agents",
    "days_back": 7,
    "max_results": 500
  }
}
```

Returns daily counts, peak day, related hashtags, and sample posts.

### analyze_influencer_reach

```json
{
  "tool": "analyze_influencer_reach",
  "arguments": {
    "username": "elonmusk",
    "max_tweets": 100
  }
}
```

Returns profile info, engagement rates, top performing content, and estimated reach.

### export_intelligence_report

```json
{
  "tool": "export_intelligence_report",
  "arguments": {
    "brand_name": "YourBrand",
    "competitors": ["Competitor1", "Competitor2"],
    "days_back": 7,
    "include_complaints": true,
    "include_share_of_voice": true
  }
}
```

Returns a structured markdown report combining brand mentions, competitor sentiment, share of voice, and complaints.

## Sentiment Scoring

Sentiment is scored using a deterministic keyword lexicon approach:

- **Positive lexicon** (50 terms): love, great, amazing, awesome, excellent, perfect, recommend, best, fantastic, etc.
- **Negative lexicon** (50 terms): hate, terrible, awful, worst, broken, sucks, disappointed, scam, useless, buggy, etc.
- **Formula:** `score = (positive_count - negative_count) / total_posts`
- **Range:** -1.0 (fully negative) to +1.0 (fully positive)
- **Labels:** positive (>0.1), negative (<-0.1), neutral (-0.1 to 0.1)

## X API Endpoints Used

| Endpoint | Usage |
|----------|-------|
| `GET /2/tweets/search/recent` | Search recent posts (last 7 days) |
| `GET /2/users/by/username/:username` | User profile lookup |
| `GET /2/users/:id/tweets` | User timeline |
| `GET /2/tweets/:id` | Single tweet |
| `GET /2/trends` | Trending topics (requires elevated access) |

## Cost

X API is pay-per-use at $0.005 per post read. The server caches results within a single request to minimize API calls.

## Tech Stack

- **Language:** TypeScript
- **Protocol:** MCP (Model Context Protocol) over Streamable HTTP
- **SDK:** @modelcontextprotocol/sdk
- **Hosting:** Vercel serverless functions
- **X API:** v2 with user-provided bearer token

## License

MIT
