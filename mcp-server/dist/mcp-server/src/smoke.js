import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { getServerConfig } from './config.js';
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
    return Object.fromEntries(Object.entries(process.env).filter((entry) => typeof entry[1] === 'string'));
}
function extractTextPayload(result) {
    return result.content
        ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text ?? '')
        .join('\n') ?? '';
}
async function main() {
    const config = getServerConfig();
    const reminderTitle = `[SMOKE MCP] ${randomUUID()}`;
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
        if (!text)
            return;
        console.error(`[mcp-server] ${text}`);
    });
    console.log('[smoke] Starting MCP smoke test');
    console.log('[smoke] Environment:', JSON.stringify(getMaskedEnvSummary()));
    await client.connect(transport);
    try {
        const dailyBrief = (await client.callTool({
            name: 'nexus_get_daily_brief',
            arguments: {},
        }));
        const pendingTasks = (await client.callTool({
            name: 'nexus_get_pending_tasks',
            arguments: {},
        }));
        const createReminder = (await client.callTool({
            name: 'nexus_create_reminder',
            arguments: {
                title: reminderTitle,
                remind_at: remindAt,
            },
        }));
        const dailyBriefText = extractTextPayload(dailyBrief);
        const pendingTasksText = extractTextPayload(pendingTasks);
        const createReminderText = extractTextPayload(createReminder);
        if (!dailyBriefText || !pendingTasksText || !createReminderText) {
            throw new Error('Una o más tools no devolvieron contenido serializable.');
        }
        const { data: reminderRow, error: reminderError } = await supabase
            .from('reminders')
            .select('id, title, user_id, source, status')
            .eq('title', reminderTitle)
            .eq('user_id', config.NEXUS_MCP_ALLOWED_USER_ID)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (reminderError)
            throw reminderError;
        const { data: actionRows, error: actionError } = await supabase
            .from('agent_actions')
            .select('action_type, input_text, status, user_id, created_at')
            .eq('user_id', config.NEXUS_MCP_ALLOWED_USER_ID)
            .in('action_type', [
            'nexus_get_daily_brief',
            'nexus_get_pending_tasks',
            'nexus_create_reminder',
        ])
            .order('created_at', { ascending: false })
            .limit(10);
        if (actionError)
            throw actionError;
        const hasBriefAudit = (actionRows ?? []).some((row) => row.action_type === 'nexus_get_daily_brief' &&
            row.input_text === 'mcp:nexus_get_daily_brief');
        const hasPendingTasksAudit = (actionRows ?? []).some((row) => row.action_type === 'nexus_get_pending_tasks' &&
            row.input_text === 'mcp:nexus_get_pending_tasks');
        const hasCreateReminderAudit = (actionRows ?? []).some((row) => row.action_type === 'nexus_create_reminder' &&
            row.input_text === 'mcp:nexus_create_reminder');
        if (!hasBriefAudit || !hasPendingTasksAudit || !hasCreateReminderAudit) {
            throw new Error('No se encontraron todos los registros esperados en agent_actions.');
        }
        console.log('[smoke] nexus_get_daily_brief: OK');
        console.log('[smoke] nexus_get_pending_tasks: OK');
        console.log('[smoke] nexus_create_reminder: OK');
        console.log('[smoke] Reminder created:', JSON.stringify({
            id: reminderRow.id,
            title: reminderRow.title,
            user_id: reminderRow.user_id,
            source: reminderRow.source,
            status: reminderRow.status,
        }));
        console.log('[smoke] Audit rows:', JSON.stringify((actionRows ?? []).map((row) => ({
            action_type: row.action_type,
            input_text: row.input_text,
            status: row.status,
            user_id: row.user_id,
            created_at: row.created_at,
        }))));
        console.log('[smoke] Completed successfully');
    }
    finally {
        await transport.close();
    }
}
main().catch((error) => {
    console.error('[smoke] Failed:', error instanceof Error ? error.message : 'Error desconocido');
    process.exit(1);
});
