import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { getServerConfig } from './config.js';
import { createNexusMcpServer } from './server.js';

type SessionTransport = StreamableHTTPServerTransport;

function buildBadRequestResponse(res: express.Response, message: string) {
  return res.status(400).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message,
    },
    id: null,
  });
}

function getSessionId(req: express.Request) {
  const sessionId = req.headers['mcp-session-id'];
  return typeof sessionId === 'string' ? sessionId : null;
}

function matchesAllowedPattern(value: string, pattern: string) {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    return value.endsWith(suffix) && value.length > suffix.length;
  }

  return value === pattern;
}

function extractHostname(hostHeader: string) {
  const normalized = hostHeader.split(',')[0]?.trim() ?? '';
  if (!normalized) {
    throw new Error('Empty Host header');
  }

  if (normalized.startsWith('[')) {
    const closingIndex = normalized.indexOf(']');
    if (closingIndex === -1) {
      throw new Error('Invalid IPv6 Host header');
    }

    return normalized.slice(0, closingIndex + 1);
  }

  const colonIndex = normalized.indexOf(':');
  if (colonIndex === -1) {
    return normalized;
  }

  return normalized.slice(0, colonIndex);
}

function getFirstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function hostOriginProtection(
  allowedHosts: string[],
  allowedOrigins: string[]
): express.RequestHandler {
  return (req, res, next) => {
    const hostHeader = getFirstHeaderValue(req.headers.host);
    if (!hostHeader) {
      buildBadRequestResponse(res, 'Missing Host header');
      return;
    }

    let hostname: string;
    try {
      hostname = extractHostname(hostHeader);
    } catch {
      buildBadRequestResponse(res, `Invalid Host header: ${hostHeader}`);
      return;
    }

    const allowedHost = allowedHosts.some((pattern) => matchesAllowedPattern(hostname, pattern));
    if (!allowedHost) {
      buildBadRequestResponse(res, `Invalid Host: ${hostname}`);
      return;
    }

    const originHeader = getFirstHeaderValue(req.headers.origin);
    if (originHeader) {
      const allowedOrigin = allowedOrigins.some((pattern) => matchesAllowedPattern(originHeader, pattern));
      if (!allowedOrigin) {
        buildBadRequestResponse(res, `Invalid Origin: ${originHeader}`);
        return;
      }
    }

    next();
  };
}

export async function startHttpServer() {
  const config = getServerConfig();
  const app = express();
  const transports = new Map<string, SessionTransport>();

  app.use(hostOriginProtection(config.MCP_ALLOWED_HOSTS, config.MCP_ALLOWED_ORIGINS));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.MCP_ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Origin no permitido'));
      },
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.post('/mcp', async (req, res) => {
    const sessionId = getSessionId(req);

    try {
      let transport: SessionTransport | undefined;

      if (sessionId) {
        transport = transports.get(sessionId);
        if (!transport) {
          buildBadRequestResponse(res, 'Bad Request: Invalid session ID');
          return;
        }

        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (!isInitializeRequest(req.body)) {
        buildBadRequestResponse(res, 'Bad Request: Missing initialize request');
        return;
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
          transports.set(initializedSessionId, transport!);
        },
      });

      transport.onclose = () => {
        const activeSessionId = transport.sessionId;
        if (activeSessionId) {
          transports.delete(activeSessionId);
        }
      };

      const server = createNexusMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      buildBadRequestResponse(res, 'Bad Request: Missing session ID');
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      buildBadRequestResponse(res, 'Bad Request: Invalid session ID');
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  });

  app.delete('/mcp', async (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      buildBadRequestResponse(res, 'Bad Request: Missing session ID');
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      buildBadRequestResponse(res, 'Bad Request: Invalid session ID');
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  });

  const server = await new Promise<import('node:http').Server>((resolve, reject) => {
    const instance = app.listen(config.MCP_HTTP_PORT, config.MCP_HTTP_HOST, () => resolve(instance));
    instance.on('error', reject);
  });

  console.error(
    `[nexus-mcp] http server ready at http://${config.MCP_HTTP_HOST}:${config.MCP_HTTP_PORT}/mcp`
  );

  const shutdown = async () => {
    for (const transport of transports.values()) {
      try {
        await transport.close();
      } catch {
        // ignore shutdown transport errors
      }
    }
    transports.clear();

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  return { app, server, shutdown };
}
