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
    return {
        ...Object.fromEntries(Object.entries(process.env).filter((entry) => typeof entry[1] === 'string')),
        MCP_TRANSPORT: 'stdio',
    };
}
function extractTextPayload(result) {
    return (result.content
        ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text ?? '')
        .join('\n') ?? '');
}
function parseToolJson(toolName, result) {
    const text = extractTextPayload(result);
    if (!text) {
        throw new Error(`La tool ${toolName} no devolvio contenido serializable.`);
    }
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error(`La tool ${toolName} devolvio texto no JSON: ${text}`);
    }
}
async function expectToolFailure(client, name, args, expectedMessagePart) {
    const result = (await client.callTool({ name, arguments: args }));
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
    const storagePath = `mcp-smoke/${randomUUID()}.txt`;
    const storageContent = `smoke:${randomUUID()}`;
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
        const schemaResult = (await client.callTool({
            name: 'nexus_backend_schema',
            arguments: {
                resource: 'all',
            },
        }));
        const selectResult = (await client.callTool({
            name: 'nexus_db_select',
            arguments: {
                table: 'projects',
                columns: 'id,name',
                limit: 3,
            },
        }));
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
        }));
        const insertedPayload = parseToolJson('nexus_db_insert', insertResult);
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
        }));
        const authListResult = (await client.callTool({
            name: 'nexus_auth_list_users',
            arguments: {
                page: 1,
                perPage: 5,
            },
        }));
        const bucketListResult = (await client.callTool({
            name: 'nexus_storage_list_buckets',
            arguments: {},
        }));
        await expectToolFailure(client, 'nexus_db_select', {
            table: 'auth.users',
            limit: 1,
        }, 'public');
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
        }, 'no existe');
        const schemaPayload = parseToolJson('nexus_backend_schema', schemaResult);
        const selectPayload = parseToolJson('nexus_db_select', selectResult);
        const updatePayload = parseToolJson('nexus_db_update', updateResult);
        const authPayload = parseToolJson('nexus_auth_list_users', authListResult);
        const bucketPayload = parseToolJson('nexus_storage_list_buckets', bucketListResult);
        let storageBucketName = null;
        if (bucketPayload.count > 0) {
            storageBucketName = bucketPayload.buckets[0]?.name ?? null;
        }
        if (storageBucketName) {
            const uploadResult = (await client.callTool({
                name: 'nexus_storage_upload_text',
                arguments: {
                    bucket: storageBucketName,
                    path: storagePath,
                    content: storageContent,
                    upsert: true,
                },
            }));
            const storageObjectsResult = (await client.callTool({
                name: 'nexus_storage_list_objects',
                arguments: {
                    bucket: storageBucketName,
                    prefix: 'mcp-smoke',
                    limit: 20,
                },
            }));
            await expectToolFailure(client, 'nexus_storage_delete', {
                bucket: storageBucketName,
                paths: [storagePath],
                confirm: false,
            }, 'confirm');
            const storageDeleteResult = (await client.callTool({
                name: 'nexus_storage_delete',
                arguments: {
                    bucket: storageBucketName,
                    paths: [storagePath],
                    confirm: true,
                },
            }));
            const uploadPayload = parseToolJson('nexus_storage_upload_text', uploadResult);
            const storageObjectsPayload = parseToolJson('nexus_storage_list_objects', storageObjectsResult);
            const storageDeletePayload = parseToolJson('nexus_storage_delete', storageDeleteResult);
            const storageObjectFound = storageObjectsPayload.objects.some((row) => row.name === storagePath.split('/').pop());
            if (!storageObjectFound) {
                throw new Error('El objeto temporal de storage no aparecio en el listado.');
            }
            if (uploadPayload.path !== storagePath || storageDeletePayload.deletedCount < 1) {
                throw new Error('Las tools de storage no devolvieron el resultado esperado.');
            }
        }
        const deleteSuccessResult = (await client.callTool({
            name: 'nexus_db_delete',
            arguments: {
                table: 'reminders',
                filters: {
                    id: reminderId,
                },
                confirm: true,
            },
        }));
        const deletePayload = parseToolJson('nexus_db_delete', deleteSuccessResult);
        if (!schemaPayload.tables?.length ||
            !schemaPayload.columns?.length ||
            selectPayload.count < 0 ||
            updatePayload.count !== 1 ||
            deletePayload.count !== 1 ||
            authPayload.count < 0) {
            throw new Error('Las tools MCP no devolvieron la informacion esperada.');
        }
        const { data: reminderRow, error: reminderError } = await supabase
            .from('reminders')
            .select('id')
            .eq('id', reminderId)
            .maybeSingle();
        if (reminderError)
            throw reminderError;
        if (reminderRow) {
            throw new Error('El reminder temporal no fue eliminado por nexus_db_delete.');
        }
        const actionTypes = [
            'nexus_backend_schema',
            'nexus_db_select',
            'nexus_db_insert',
            'nexus_db_update',
            'nexus_db_delete',
            'nexus_db_rpc',
            'nexus_auth_list_users',
            'nexus_storage_list_buckets',
        ];
        if (storageBucketName) {
            actionTypes.push('nexus_storage_upload_text', 'nexus_storage_list_objects', 'nexus_storage_delete');
        }
        const { data: actionRows, error: actionError } = await supabase
            .from('agent_actions')
            .select('action_type, input_text, status, user_id, created_at')
            .eq('user_id', config.NEXUS_MCP_ALLOWED_USER_ID)
            .in('action_type', actionTypes)
            .order('created_at', { ascending: false })
            .limit(40);
        if (actionError)
            throw actionError;
        const requiredAudits = [
            'nexus_backend_schema',
            'nexus_db_select',
            'nexus_db_insert',
            'nexus_db_update',
            'nexus_db_delete',
            'nexus_auth_list_users',
            'nexus_storage_list_buckets',
        ];
        if (storageBucketName) {
            requiredAudits.push('nexus_storage_upload_text', 'nexus_storage_list_objects', 'nexus_storage_delete');
        }
        for (const actionType of requiredAudits) {
            const hasAudit = (actionRows ?? []).some((row) => row.action_type === actionType && row.input_text === `mcp:${actionType}` && row.status === 'success');
            if (!hasAudit) {
                throw new Error(`No se encontro auditoria exitosa para ${actionType}.`);
            }
        }
        const hasDeleteFailedAudit = (actionRows ?? []).some((row) => row.action_type === 'nexus_db_delete' &&
            row.input_text === 'mcp:nexus_db_delete' &&
            row.status === 'failed');
        const hasRpcFailedAudit = (actionRows ?? []).some((row) => row.action_type === 'nexus_db_rpc' &&
            row.input_text === 'mcp:nexus_db_rpc' &&
            row.status === 'failed');
        if (!hasDeleteFailedAudit || !hasRpcFailedAudit) {
            throw new Error('No se encontraron todos los fallos auditados esperados.');
        }
        console.log('[smoke] nexus_backend_schema: OK');
        console.log('[smoke] nexus_db_select: OK');
        console.log('[smoke] nexus_db_insert: OK');
        console.log('[smoke] nexus_db_update: OK');
        console.log('[smoke] nexus_db_delete: OK');
        console.log('[smoke] nexus_auth_list_users: OK');
        console.log('[smoke] nexus_storage_list_buckets: OK');
        if (storageBucketName) {
            console.log('[smoke] nexus_storage_upload_text: OK');
            console.log('[smoke] nexus_storage_list_objects: OK');
            console.log('[smoke] nexus_storage_delete: OK');
        }
        else {
            console.log('[smoke] storage write tests: SKIPPED (sin buckets)');
        }
        console.log('[smoke] nexus_db_rpc protegido: OK');
        console.log('[smoke] Reminder insertado y eliminado:', JSON.stringify({
            id: reminderId,
            title: reminderTitle,
            user_id: config.NEXUS_MCP_ALLOWED_USER_ID,
            updated_description: updatedReminderDescription,
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
