/**
 * Standalone HTTP server entry for MCPize / local development.
 *
 * - Listens on process.env.PORT || 3000
 * - Exposes POST /mcp with StreamableHTTPServerTransport (SSE + JSON response modes)
 * - Session-based: initialize creates a session, subsequent requests reuse it
 * - Per-session token extraction (Authorization / x-api-key / x-api-bearer)
 *   falling back to X_API_BEARER_TOKEN env var
 * - Cleanup on response close event — no premature server.close()
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createServer, extractBearerToken } from './index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

/** Session store: maps session ID → transport + server + token */
interface Session {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createServer>;
  token: string;
}
const sessions = new Map<string, Session>();

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

/** Copy raw headers into a plain record for extractBearerToken. */
function getHeaders(req: IncomingMessage): Record<string, string | string[] | undefined> {
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    headers[key] = value;
  }
  return headers;
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse) {
  const method = req.method ?? '';

  if (method !== 'POST' && method !== 'GET' && method !== 'DELETE') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, GET, DELETE');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST for MCP requests.' }));
    return;
  }

  // Extract token: request headers first, then env fallback
  const headers = getHeaders(req);
  let token = extractBearerToken(headers);
  if (!token) {
    token = process.env.X_API_BEARER_TOKEN ?? '';
  }

  // Read and parse body for POST
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

  // Check for existing session
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (method === 'DELETE') {
    // Session teardown
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.close();
      await session.server.close();
      sessions.delete(sessionId);
    }
    res.statusCode = 200;
    res.end();
    return;
  }

  if (sessionId && sessions.has(sessionId)) {
    // Reuse existing session
    const session = sessions.get(sessionId)!;
    try {
      await session.transport.handleRequest(req, res, parsedBody);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify({ error: 'MCP server error', message }));
    }
    return;
  }

  // No existing session — must be an initialize request
  if (method === 'POST' && parsedBody && isInitializeRequest(parsedBody)) {
    const server = createServer(token);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (id: string) => {
        sessions.set(id, { transport, server, token });
      },
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
      // Clean up on response close — don't close prematurely
      res.on('close', () => {
        // Keep session alive for subsequent requests; only clean up if transport is closed
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify({ error: 'MCP server error', message }));
    }
    return;
  }

  // No session ID and not an initialize request — bad request
  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Bad Request: No valid session ID provided. Send an initialize request first.',
    },
    id: null,
  }));
}

function handleHealth(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    status: 'ok',
    service: 'x-trend-intelligence-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mcp_endpoint: '/mcp',
  }));
}

const httpServer = http.createServer(async (req, res) => {
  const url = req.url ?? '';
  try {
    if (url === '/mcp' || url === '/api/mcp') {
      await handleMcpRequest(req, res);
    } else if (url === '/health' || url === '/api/health') {
      handleHealth(req, res);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not found', endpoints: ['/mcp', '/health'] }));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify({ error: 'Internal server error', message }));
  }
});

httpServer.listen(PORT, () => {
  console.log(`x-trend-intelligence MCP server listening on port ${PORT}`);
  console.log(`  POST /mcp  — MCP endpoint (StreamableHTTP)`);
  console.log(`  GET  /health — Health check`);
});