import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createClient } from '@supabase/supabase-js';
import { getServerConfig } from './config.js';

type ToolCallResult = {
  content?: Array<{ type?: string; text?: string }>;
};

function getMaskedEnvSummary() {
  const config = getServerConfig();

  return {
    MCP_TRANSPORT: 'http',
    MCP_HTTP_HOST: config.MCP_HTTP_HOST,
    MCP_HTTP_PORT: config.MCP_HTTP_PORT,
    SUPABASE_URL: '***',
    SUPABASE_SERVICE_ROLE_KEY: '***',
    NEXUS_MCP_ALLOWED_USER_ID: config.NEXUS_MCP_ALLOWED_USER_ID,
    NEXUS_MCP_ALLOWED_ROLE: config.NEXUS_MCP_ALLOWED_ROLE,
  };
}

function getServerEntryPath() {
  return fileURLToPath(new URL('../dist/mcp-server/src/index.js', import.meta.url));
}

function getServerCwd() {
  return fileURLToPath(new URL('..', import.meta.url));
}

function getProcessEnv() {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    ),
    MCP_TRANSPORT: 'http',
  };
}

function extractTextPayload(result: ToolCallResult) {
  return result.content
    ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text ?? '')
    .join('\n') ?? '';
}

function parseToolJson<T>(result: ToolCallResult): T {
  const text = extractTextPayload(result);
  if (!text) {
    throw new Error('La tool HTTP no devolvio contenido serializable.');
  }

  return JSON.parse(text) as T;
}

async function expectToolFailure(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  expectedMessagePart: string
) {
  const result = (await client.callTool({ name, arguments: args })) as ToolCallResult;
  const message = extractTextPayload(result);

  if (!message) {
    throw new Error(`La tool ${name} debia fallar.`);
  }

  if (!message.toLowerCase().includes(expectedMessagePart.toLowerCase())) {
    throw new Error(`La tool ${name} fallo con un mensaje inesperado: ${message}`);
  }
}

async function waitForHttpReady(url: string, attempts = 30, intervalMs = 1000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.status === 400 || response.status === 405) {
        return;
      }
    } catch {
      // keep polling
    }

    await delay(intervalMs);
  }

  throw new Error(`El endpoint HTTP no respondio en ${url}.`);
}

async function isHttpReady(url: string) {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.status === 400 || response.status === 405;
  } catch {
    return false;
  }
}

function startServerProcess(port: number): ChildProcess {
  const child = spawn(process.execPath, [getServerEntryPath()], {
    cwd: getServerCwd(),
    env: {
      ...getProcessEnv(),
      MCP_HTTP_PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (!text) return;
    console.log(`[http-server] ${text}`);
  });

  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (!text) return;
    console.error(`[http-server] ${text}`);
  });

  return child;
}

async function main() {
  const config = getServerConfig();
  const smokePort = config.MCP_HTTP_PORT + 41;
  const reminderTitle = `[SMOKE HTTP MCP] ${randomUUID()}`;
  const updatedReminderDescription = `[SMOKE HTTP UPDATE] ${randomUUID()}`;
  const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const serverUrl = `http://${config.MCP_HTTP_HOST}:${smokePort}/mcp`;
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let childProcess: ChildProcess | null = null;
  let isShuttingDown = false;

  console.log('[smoke:http] Starting MCP HTTP smoke test');
  console.log('[smoke:http] Environment:', JSON.stringify(getMaskedEnvSummary()));

  childProcess = startServerProcess(smokePort);
  await waitForHttpReady(serverUrl);

  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  const client = new Client({
    name: 'nexus-pm-http-smoke-client',
    version: '0.1.0',
  });

  client.onerror = (error) => {
    if (isShuttingDown) {
      return;
    }
    console.error('[smoke:http] MCP client error:', error.message);
  };

  await client.connect(transport);

  try {
    const selectResult = (await client.callTool({
      name: 'nexus_db_select',
      arguments: {
        table: 'projects',
        columns: 'id,name',
        limit: 3,
      },
    })) as ToolCallResult;

    const insertResult = (await client.callTool({
      name: 'nexus_db_insert',
      arguments: {
        table: 'reminders',
        data: {
          title: reminderTitle,
          remind_at: remindAt,
          source: 'agent',
          status: 'pending',
          priority: 'medium',
        },
      },
    })) as ToolCallResult;

    const insertedPayload = parseToolJson<{
      count: number;
      rows: Array<{ id: string }>;
    }>(insertResult);
    const reminderId = insertedPayload.rows[0]?.id;
    if (!reminderId) {
      throw new Error('No se obtuvo el id del reminder insertado por HTTP.');
    }

    const updateResult = (await client.callTool({
      name: 'nexus_db_update',
      arguments: {
        table: 'reminders',
        filters: {
          id: reminderId,
        },
        data: {
          description: updatedReminderDescription,
        },
      },
    })) as ToolCallResult;

    await expectToolFailure(client, 'nexus_db_delete', {
      table: 'reminders',
      filters: {
        id: reminderId,
      },
      confirm: false,
    }, 'confirm');

    await expectToolFailure(client, 'nexus_db_delete', {
      table: 'agent_actions',
      filters: {
        action_type: 'nexus_db_delete',
      },
      confirm: true,
    }, 'auditoria');

    await expectToolFailure(client, 'nexus_db_rpc', {
      functionName: 'non_existing_rpc',
      args: {},
    }, 'rpc');

    const deleteSuccessResult = (await client.callTool({
      name: 'nexus_db_delete',
      arguments: {
        table: 'reminders',
        filters: {
          id: reminderId,
        },
        confirm: true,
      },
    })) as ToolCallResult;

    const selectPayload = parseToolJson<{ count: number; rows: Array<Record<string, unknown>> }>(selectResult);
    const updatePayload = parseToolJson<{ count: number; rows: Array<Record<string, unknown>> }>(updateResult);
    const deletePayload = parseToolJson<{ count: number; rows: Array<Record<string, unknown>> }>(deleteSuccessResult);

    if (selectPayload.count < 0 || updatePayload.count !== 1 || deletePayload.count !== 1) {
      throw new Error('Las tools HTTP genericas no devolvieron los conteos esperados.');
    }

    const { data: reminderRow, error: reminderError } = await supabase
      .from('reminders')
      .select('id')
      .eq('id', reminderId)
      .maybeSingle();

    if (reminderError) throw reminderError;
    if (reminderRow) {
      throw new Error('El reminder temporal HTTP no fue eliminado por nexus_db_delete.');
    }

    const { data: actionRows, error: actionError } = await supabase
      .from('agent_actions')
      .select('action_type, input_text, status, user_id, created_at')
      .eq('user_id', config.NEXUS_MCP_ALLOWED_USER_ID)
      .in('action_type', [
        'nexus_db_select',
        'nexus_db_insert',
        'nexus_db_update',
        'nexus_db_delete',
        'nexus_db_rpc',
      ])
      .order('created_at', { ascending: false })
      .limit(20);

    if (actionError) throw actionError;

    const hasSelectAudit = (actionRows ?? []).some(
      (row) =>
        row.action_type === 'nexus_db_select' &&
        row.input_text === 'mcp:nexus_db_select' &&
        row.status === 'success'
    );
    const hasInsertAudit = (actionRows ?? []).some(
      (row) =>
        row.action_type === 'nexus_db_insert' &&
        row.input_text === 'mcp:nexus_db_insert' &&
        row.status === 'success'
    );
    const hasUpdateAudit = (actionRows ?? []).some(
      (row) =>
        row.action_type === 'nexus_db_update' &&
        row.input_text === 'mcp:nexus_db_update' &&
        row.status === 'success'
    );
    const hasDeleteSuccessAudit = (actionRows ?? []).some(
      (row) =>
        row.action_type === 'nexus_db_delete' &&
        row.input_text === 'mcp:nexus_db_delete' &&
        row.status === 'success'
    );
    const hasDeleteFailedAudit = (actionRows ?? []).some(
      (row) =>
        row.action_type === 'nexus_db_delete' &&
        row.input_text === 'mcp:nexus_db_delete' &&
        row.status === 'failed'
    );
    const hasRpcFailedAudit = (actionRows ?? []).some(
      (row) =>
        row.action_type === 'nexus_db_rpc' &&
        row.input_text === 'mcp:nexus_db_rpc' &&
        row.status === 'failed'
    );

    if (
      !hasSelectAudit ||
      !hasInsertAudit ||
      !hasUpdateAudit ||
      !hasDeleteSuccessAudit ||
      !hasDeleteFailedAudit ||
      !hasRpcFailedAudit
    ) {
      throw new Error('No se encontraron todos los registros HTTP esperados en agent_actions.');
    }

    console.log('[smoke:http] nexus_db_select: OK');
    console.log('[smoke:http] nexus_db_insert: OK');
    console.log('[smoke:http] nexus_db_update: OK');
    console.log('[smoke:http] nexus_db_delete: OK');
    console.log('[smoke:http] nexus_db_rpc protegido: OK');
    console.log(
      '[smoke:http] Reminder insertado y eliminado:',
      JSON.stringify({
        id: reminderId,
        title: reminderTitle,
        user_id: config.NEXUS_MCP_ALLOWED_USER_ID,
        updated_description: updatedReminderDescription,
      })
    );
    console.log(
      '[smoke:http] Audit rows:',
      JSON.stringify(
        (actionRows ?? []).map((row) => ({
          action_type: row.action_type,
          input_text: row.input_text,
          status: row.status,
          user_id: row.user_id,
          created_at: row.created_at,
        }))
      )
    );
    console.log('[smoke:http] Completed successfully');
  } finally {
    isShuttingDown = true;
    await transport.close();

    if (childProcess) {
      childProcess.kill('SIGINT');
      await delay(500);
      if (!childProcess.killed) {
        childProcess.kill();
      }
    }
  }
}

main().catch((error) => {
  console.error('[smoke:http] Failed:', error instanceof Error ? error.message : 'Error desconocido');
  process.exit(1);
});
