import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { getServerConfig } from './config.js';

type ToolCallResult = {
  content?: Array<{ type?: string; text?: string }>;
};

function getMaskedEnvSummary() {
  const config = getServerConfig();

  return {
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
    MCP_TRANSPORT: 'stdio',
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
    throw new Error('La tool no devolvio contenido serializable.');
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

async function main() {
  const config = getServerConfig();
  const reminderTitle = `[SMOKE MCP] ${randomUUID()}`;
  const updatedReminderDescription = `[SMOKE UPDATE] ${randomUUID()}`;
  const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const serverEntry = getServerEntryPath();
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: getServerCwd(),
    env: getProcessEnv(),
    stderr: 'pipe',
  });

  const client = new Client({
    name: 'nexus-pm-smoke-client',
    version: '0.1.0',
  });

  client.onerror = (error) => {
    console.error('[smoke] MCP client error:', error.message);
  };

  transport.stderr?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (!text) return;
    console.error(`[mcp-server] ${text}`);
  });

  console.log('[smoke] Starting MCP smoke test');
  console.log('[smoke] Environment:', JSON.stringify(getMaskedEnvSummary()));

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
      table: string;
      count: number;
      rows: Array<{ id: string; title: string; user_id?: string; status?: string; source?: string }>;
    }>(insertResult);
    const reminderId = insertedPayload.rows[0]?.id;
    if (!reminderId) {
      throw new Error('No se obtuvo el id del reminder insertado.');
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
      throw new Error('Las tools genericas no devolvieron los conteos esperados.');
    }

    const { data: reminderRow, error: reminderError } = await supabase
      .from('reminders')
      .select('id')
      .eq('id', reminderId)
      .maybeSingle();

    if (reminderError) throw reminderError;
    if (reminderRow) {
      throw new Error('El reminder temporal no fue eliminado por nexus_db_delete.');
    }

    const { data: insertedAuditReminder, error: insertedAuditReminderError } = await supabase
      .from('agent_actions')
      .select('id')
      .eq('user_id', config.NEXUS_MCP_ALLOWED_USER_ID)
      .eq('action_type', 'nexus_db_insert')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (insertedAuditReminderError) throw insertedAuditReminderError;

    const { data: insertedReminderRow, error: insertedReminderError } = await supabase
      .from('reminders')
      .select('id, title, user_id, source, status')
      .eq('title', reminderTitle)
      .eq('user_id', config.NEXUS_MCP_ALLOWED_USER_ID)
      .eq('description', updatedReminderDescription)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (insertedReminderError) throw insertedReminderError;
    if (insertedReminderRow) {
      throw new Error('El reminder temporal debio haber sido eliminado al final del smoke.');
    }
    if (!insertedAuditReminder) {
      throw new Error('No se encontro auditoria de insercion para el smoke.');
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
      throw new Error('No se encontraron todos los registros esperados en agent_actions.');
    }

    console.log('[smoke] nexus_db_select: OK');
    console.log('[smoke] nexus_db_insert: OK');
    console.log('[smoke] nexus_db_update: OK');
    console.log('[smoke] nexus_db_delete: OK');
    console.log('[smoke] nexus_db_rpc protegido: OK');
    console.log(
      '[smoke] Reminder insertado y eliminado:',
      JSON.stringify({
        id: reminderId,
        title: reminderTitle,
        user_id: config.NEXUS_MCP_ALLOWED_USER_ID,
        updated_description: updatedReminderDescription,
      })
    );
    console.log(
      '[smoke] Audit rows:',
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
    console.log('[smoke] Completed successfully');
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  console.error('[smoke] Failed:', error instanceof Error ? error.message : 'Error desconocido');
  process.exit(1);
});
