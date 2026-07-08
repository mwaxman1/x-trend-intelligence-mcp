/**
 * MCP Server entry point — creates and configures the MCP server with all 8 tools.
 * This module exports the server instance for use by the API route handlers.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { XApiClient, XApiError, XquikApiClient } from './lib/x-api.js';
import { analyzeCompetitorSentiment } from './tools/competitor-sentiment.js';
import { trackBrandMentions } from './tools/brand-mentions.js';
import { detectTrendingTopics } from './tools/trending-topics.js';
import { compareShareOfVoice } from './tools/share-of-voice.js';
import { identifyComplaints } from './tools/complaints.js';
import { monitorKeywordFrequency } from './tools/keyword-frequency.js';
import { analyzeInfluencerReach } from './tools/influencer-reach.js';
import { exportIntelligenceReport } from './tools/intelligence-report.js';

/**
 * Extract the X API bearer token from request headers.
 */
export function extractBearerToken(headers: Record<string, string | string[] | undefined>): string {
  // Check Authorization header (Bearer token)
  const authHeader = headers['authorization'];
  if (authHeader) {
    const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (value.startsWith('Bearer ')) {
      return value.slice(7);
    }
    return value;
  }

  // Check x-api-key header
  const apiKeyHeader = headers['x-api-key'];
  if (apiKeyHeader) {
    return Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
  }

  // Check x-api-bearer header
  const bearerHeader = headers['x-api-bearer'];
  if (bearerHeader) {
    return Array.isArray(bearerHeader) ? bearerHeader[0] : bearerHeader;
  }

  return '';
}

type XDataSource = 'x-api' | 'xquik';

export interface AuthContext {
  token: string;
  source: XDataSource;
  xquikBaseUrl?: string;
}

export function extractAuthContext(headers: Record<string, string | string[] | undefined>): AuthContext {
  const source = getHeader(headers, 'x-data-source') === 'xquik' ? 'xquik' : 'x-api';
  if (source === 'xquik') {
    return {
      source,
      token: getHeader(headers, 'x-xquik-api-key') || getHeader(headers, 'x-api-key') || extractBearerToken(headers),
      xquikBaseUrl: getHeader(headers, 'x-xquik-api-base-url'),
    };
  }

  return {
    source,
    token: extractBearerToken(headers),
  };
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function createXClient(token: string): XApiClient {
  const source = ((globalThis as Record<string, unknown>).__xDataSource as XDataSource | undefined) ?? 'x-api';
  if (source === 'xquik') {
    return new XquikApiClient(
      token,
      (globalThis as Record<string, unknown>).__xquikApiBaseUrl as string | undefined,
    );
  }

  return new XApiClient(token);
}

/**
 * Create the MCP server with all tools registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'x-trend-intelligence',
    version: '1.0.0',
  });

  // Tool 1: analyze_competitor_sentiment
  server.tool(
    'analyze_competitor_sentiment',
    'Search recent X posts mentioning a competitor and score sentiment using a deterministic keyword lexicon. Returns sentiment score (-1 to +1), percentages, and top posts.',
    {
      competitor_name: z.string().describe('The competitor name or search query to analyze'),
      days_back: z.number().optional().default(7).describe('Days to look back (1-7, X API recent search limit)'),
      max_results: z.number().optional().default(100).describe('Maximum posts to analyze (10-500)'),
    },
    async (params) => {
      try {
        const token = (globalThis as Record<string, unknown>).__xBearerToken as string;
        if (!token) throw new XApiError('X API bearer token required. Provide it via Authorization header.', 401);

        const client = createXClient(token);
        const result = await analyzeCompetitorSentiment(client, params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // Tool 2: track_brand_mentions
  server.tool(
    'track_brand_mentions',
    'Track brand name mentions on X over a time window (24h/7d/30d). Returns volume trend, daily counts, engagement stats, and top posts.',
    {
      brand_name: z.string().describe('The brand name to track'),
      time_window: z.enum(['24h', '7d', '30d']).optional().default('7d').describe('Time window for analysis'),
      max_results: z.number().optional().default(100).describe('Maximum posts to retrieve (10-500)'),
    },
    async (params) => {
      try {
        const token = (globalThis as Record<string, unknown>).__xBearerToken as string;
        if (!token) throw new XApiError('X API bearer token required.', 401);

        const client = createXClient(token);
        const result = await trackBrandMentions(client, params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // Tool 3: detect_trending_topics
  server.tool(
    'detect_trending_topics',
    'Get X/Twitter trending topics for a location and cross-reference with post volume to identify rising trends.',
    {
      location_id: z.string().optional().describe('WOEID for location (default: 1 for worldwide)'),
      top_n: z.number().optional().default(10).describe('Number of trends to return (1-50)'),
      verify_volume: z.boolean().optional().default(true).describe('Cross-reference with post search for volume verification'),
    },
    async (params) => {
      try {
        const token = (globalThis as Record<string, unknown>).__xBearerToken as string;
        if (!token) throw new XApiError('X API bearer token required.', 401);

        const client = createXClient(token);
        const result = await detectTrendingTopics(client, params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // Tool 4: compare_share_of_voice
  server.tool(
    'compare_share_of_voice',
    'Compare mention counts and engagement for 2-5 competitors over a time window. Returns share of voice percentages and sentiment for each.',
    {
      competitors: z.array(z.string()).min(2).max(5).describe('Array of 2-5 competitor/brand names to compare'),
      days_back: z.number().optional().default(7).describe('Days to look back (1-7)'),
      max_results_per_competitor: z.number().optional().default(100).describe('Max posts per competitor (10-300)'),
    },
    async (params) => {
      try {
        const token = (globalThis as Record<string, unknown>).__xBearerToken as string;
        if (!token) throw new XApiError('X API bearer token required.', 401);

        const client = createXClient(token);
        const result = await compareShareOfVoice(client, params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // Tool 5: identify_complaints
  server.tool(
    'identify_complaints',
    'Search for X posts mentioning a brand alongside negative keywords (broken, worst, terrible, etc.). Returns categorized complaints with engagement and links.',
    {
      brand_name: z.string().describe('The brand name to check for complaints'),
      days_back: z.number().optional().default(7).describe('Days to look back (1-7)'),
      max_results: z.number().optional().default(200).describe('Maximum posts to retrieve (10-500)'),
    },
    async (params) => {
      try {
        const token = (globalThis as Record<string, unknown>).__xBearerToken as string;
        if (!token) throw new XApiError('X API bearer token required.', 401);

        const client = createXClient(token);
        const result = await identifyComplaints(client, params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // Tool 6: monitor_keyword_frequency
  server.tool(
    'monitor_keyword_frequency',
    'Track how often a keyword or phrase appears in X posts over time. Returns daily counts, peak day, related hashtags, and sample posts.',
    {
      keyword: z.string().describe('The keyword or phrase to monitor'),
      days_back: z.number().optional().default(7).describe('Days to look back (1-7)'),
      max_results: z.number().optional().default(500).describe('Maximum posts to retrieve (10-1000)'),
    },
    async (params) => {
      try {
        const token = (globalThis as Record<string, unknown>).__xBearerToken as string;
        if (!token) throw new XApiError('X API bearer token required.', 401);

        const client = createXClient(token);
        const result = await monitorKeywordFrequency(client, params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // Tool 7: analyze_influencer_reach
  server.tool(
    'analyze_influencer_reach',
    'Look up an X user profile and analyze their reach: follower count, recent post engagement rates, top performing content, and estimated reach.',
    {
      username: z.string().describe('X/Twitter handle (without @)'),
      max_tweets: z.number().optional().default(100).describe('Maximum recent tweets to analyze (10-3200)'),
    },
    async (params) => {
      try {
        const token = (globalThis as Record<string, unknown>).__xBearerToken as string;
        if (!token) throw new XApiError('X API bearer token required.', 401);

        const client = createXClient(token);
        const result = await analyzeInfluencerReach(client, params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return formatError(err);
      }
    },
  );

  // Tool 8: export_intelligence_report
  server.tool(
    'export_intelligence_report',
    'Generate a comprehensive markdown intelligence report combining brand mentions, competitor sentiment, share of voice, and complaints into one deliverable.',
    {
      brand_name: z.string().describe('The primary brand for the report'),
      competitors: z.array(z.string()).optional().describe('Competitor names to include in the report'),
      days_back: z.number().optional().default(7).describe('Days to look back (1-7)'),
      include_complaints: z.boolean().optional().default(true).describe('Include complaints section'),
      include_share_of_voice: z.boolean().optional().default(true).describe('Include share of voice comparison'),
      report_title: z.string().optional().describe('Custom title for the report'),
    },
    async (params) => {
      try {
        const token = (globalThis as Record<string, unknown>).__xBearerToken as string;
        if (!token) throw new XApiError('X API bearer token required.', 401);

        const client = createXClient(token);
        const result = await exportIntelligenceReport(client, params);
        return { content: [{ type: 'text', text: result.markdown }] };
      } catch (err) {
        return formatError(err);
      }
    },
  );

  return server;
}

/**
 * Format an error as an MCP tool response.
 */
function formatError(err: unknown): { content: { type: 'text'; text: string }[]; isError: boolean } {
  if (err instanceof XApiError) {
    const errorBody = {
      error: 'X API Error',
      message: err.message,
      status: err.status,
      ...(err.status === 429 && { hint: 'Rate limit exceeded. Wait before retrying.' }),
      ...(err.status === 401 && { hint: 'Invalid or missing bearer token. Provide via Authorization header.' }),
      ...(err.status === 403 && { hint: 'Your X API access level does not include this endpoint.' }),
    };
    return { content: [{ type: 'text', text: JSON.stringify(errorBody, null, 2) }], isError: true };
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  return { content: [{ type: 'text', text: JSON.stringify({ error: 'Internal error', message }, null, 2) }], isError: true };
}
