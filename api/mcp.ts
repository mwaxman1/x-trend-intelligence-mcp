/**
 * Vercel serverless function: MCP endpoint
 * Handles MCP protocol over Streamable HTTP transport at /api/mcp
 *
 * CRITICAL: Each request gets a fresh McpServer + StreamableHTTPServerTransport.
 * The MCP SDK's Protocol.connect() throws "Already connected to a transport" if
 * the same server is reused across requests. In stateless serverless, there is
 * no session state to preserve, so fresh-per-request is correct.
 *
 * enableJsonResponse: true returns plain JSON instead of SSE streams, which is
 * essential for serverless — SSE streams keep the connection open and hang until
 * the platform's function timeout.
 */

import { createServer, extractBearerToken } from '../src/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Read the entire request body as a string and parse as JSON. */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Only accept POST (for MCP requests) and GET (for SSE)
  const method = req.method ?? '';
  if (method !== 'POST' && method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, GET');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST for MCP requests.' }));
    return;
  }

  // Extract bearer token from headers — scoped to this request only
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    headers[key] = value;
  }
  const token = extractBearerToken(headers);
  if (!token) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: 'X API bearer token required. Provide via Authorization: Bearer <token> or x-api-key header.',
    }));
    return;
  }

  // Read and parse body for POST requests before passing to transport
  let parsedBody: unknown = undefined;
  if (method === 'POST') {
    try {
      parsedBody = await readBody(req);
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error: Invalid JSON' },
        id: null,
      }));
      return;
    }
  }

  // Fresh server per request — token is encapsulated, no global leakage
  const server = createServer(token);

  // Stateless transport — no session ID, no session state
  // enableJsonResponse: true returns plain JSON instead of SSE streams
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    // Connect server to transport (fresh each time, no "already connected" error)
    await server.connect(transport);

    // Handle the incoming request through the transport
    // Pass parsedBody so the transport doesn't try to read the stream itself
    await transport.handleRequest(req, res, parsedBody);

    // Close the server after the request to clean up resources
    await server.close();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify({ error: 'MCP server error', message }));
  }
}