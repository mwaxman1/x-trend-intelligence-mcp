/**
 * Vercel serverless function: MCP endpoint
 * Handles MCP protocol over Streamable HTTP transport at /api/mcp
 */

import { createServer, extractAuthContext } from '../index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Cache server instance across warm invocations
let cachedServer: ReturnType<typeof createServer> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Only accept POST (for MCP requests) and GET (for SSE)
  const method = req.method ?? '';
  if (method !== 'POST' && method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, GET');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST for MCP requests.' }));
    return;
  }

  // Extract bearer token from headers
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    headers[key] = value;
  }
  const auth = extractAuthContext(headers);
  if (!auth.token) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: 'API token required. Provide an X API bearer token or send x-data-source: xquik with an Xquik API key.',
    }));
    return;
  }
  (globalThis as Record<string, unknown>).__xBearerToken = auth.token;
  (globalThis as Record<string, unknown>).__xDataSource = auth.source;
  (globalThis as Record<string, unknown>).__xquikApiBaseUrl = auth.xquikBaseUrl;

  // Create or reuse server
  if (!cachedServer) {
    cachedServer = createServer();
  }
  const server = cachedServer;

  // Use Streamable HTTP transport (stateless mode for serverless)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    // Connect server to transport
    await server.connect(transport);

    // Handle the incoming request through the transport
    await transport.handleRequest(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify({ error: 'MCP server error', message }));
  }
}
