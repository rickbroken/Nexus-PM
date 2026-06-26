import 'dotenv/config';
import { Buffer } from 'node:buffer';
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
    NEXUS_MCP_ALLOWED_RPCS: config.NEXUS_MCP_ALLOWED_RPCS,
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
  return (
    result.content
      ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text ?? '')
      .join('\n') ?? ''
  );
}

function parseToolJson<T>(toolName: string, result: ToolCallResult): T {
  const text = extractTextPayload(result);
  if (!text) {
    throw new Error(`La tool ${toolName} no devolvio contenido serializable.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`La tool ${toolName} devolvio texto no JSON: ${text}`);
  }
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
  const taskTitle = `[SMOKE ATTACHMENT TASK] ${randomUUID()}`;
  const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const storagePath = `mcp-smoke/${randomUUID()}.txt`;
  const storageContent = `smoke:${randomUUID()}`;
  const attachmentContent = Buffer.from(`attachment:${randomUUID()}`, 'utf8').toString('base64');

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
    const schemaResult = (await client.callTool({
      name: 'nexus_backend_schema',
      arguments: {
        resource: 'all',
      },
    })) as ToolCallResult;

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
    }>('nexus_db_insert', insertResult);
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

    const authListResult = (await client.callTool({
      name: 'nexus_auth_list_users',
      arguments: {
        page: 1,
        perPage: 5,
      },
    })) as ToolCallResult;

    const bucketListResult = (await client.callTool({
      name: 'nexus_storage_list_buckets',
      arguments: {},
    })) as ToolCallResult;

    await expectToolFailure(
      client,
      'nexus_db_select',
      {
        table: 'project_credentials',
        limit: 1,
      },
      'protegida'
    );

    await expectToolFailure(
      client,
      'nexus_db_insert',
      {
        table: 'reminders',
        data: {
          title: `[SMOKE FORGED USER] ${randomUUID()}`,
          remind_at: remindAt,
          source: 'agent',
          status: 'pending',
          priority: 'medium',
          user_id: randomUUID(),
        },
      },
      'suplantar user_id'
    );

    await expectToolFailure(
      client,
      'nexus_db_select',
      {
        table: 'auth.users',
        limit: 1,
      },
      'public'
    );

    await expectToolFailure(
      client,
      'nexus_db_delete',
      {
        table: 'reminders',
        filters: {
          id: reminderId,
        },
        confirm: false,
      },
      'confirm'
    );

    await expectToolFailure(
      client,
      'nexus_db_delete',
      {
        table: 'agent_actions',
        filters: {
          action_type: 'nexus_db_delete',
        },
        confirm: true,
      },
      'auditoria'
    );

    await expectToolFailure(
      client,
      'nexus_db_rpc',
      {
        functionName: 'auto_archive_completed_tasks',
        args: {},
      },
      'NEXUS_MCP_ALLOWED_RPCS'
    );

    const schemaPayload = parseToolJson<{
      tables?: Array<{ name: string }>;
      columns?: Array<{ table: string; column: string }>;
      rpcs?: Array<{ name: string }>;
      buckets?: Array<{ name: string }>;
    }>('nexus_backend_schema', schemaResult);
    const selectPayload = parseToolJson<{ count: number; rows: Array<Record<string, unknown>> }>(
      'nexus_db_select',
      selectResult
    );
    const updatePayload = parseToolJson<{ count: number; rows: Array<Record<string, unknown>> }>(
      'nexus_db_update',
      updateResult
    );
    const authPayload = parseToolJson<{ count: number; users: Array<Record<string, unknown>> }>(
      'nexus_auth_list_users',
      authListResult
    );
    const bucketPayload = parseToolJson<{ count: number; buckets: Array<{ name: string }> }>(
      'nexus_storage_list_buckets',
      bucketListResult
    );

    let storageBucketName: string | null = null;
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
      })) as ToolCallResult;

      const storageObjectsResult = (await client.callTool({
        name: 'nexus_storage_list_objects',
        arguments: {
          bucket: storageBucketName,
          prefix: 'mcp-smoke',
          limit: 20,
        },
      })) as ToolCallResult;

      await expectToolFailure(
        client,
        'nexus_storage_delete',
        {
          bucket: storageBucketName,
          paths: [storagePath],
          confirm: false,
        },
        'confirm'
      );

      const storageDeleteResult = (await client.callTool({
        name: 'nexus_storage_delete',
        arguments: {
          bucket: storageBucketName,
          paths: [storagePath],
          confirm: true,
        },
      })) as ToolCallResult;

      const uploadPayload = parseToolJson<{ bucket: string; path: string }>(
        'nexus_storage_upload_text',
        uploadResult
      );
      const storageObjectsPayload = parseToolJson<{ objects: Array<{ name?: string }> }>(
        'nexus_storage_list_objects',
        storageObjectsResult
      );
      const storageDeletePayload = parseToolJson<{ deletedCount: number; paths: string[] }>(
        'nexus_storage_delete',
        storageDeleteResult
      );

      const storageObjectFound = storageObjectsPayload.objects.some((row) => row.name === storagePath.split('/').pop());
      if (!storageObjectFound) {
        throw new Error('El objeto temporal de storage no aparecio en el listado.');
      }
      if (uploadPayload.path !== storagePath || storageDeletePayload.deletedCount < 1) {
        throw new Error('Las tools de storage no devolvieron el resultado esperado.');
      }
    }

    let attachmentTaskId: string | null = null;
    let attachmentPath: string | null = null;
    let attachmentId: string | null = null;

    const { data: firstProjectRow, error: firstProjectError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (firstProjectError) throw firstProjectError;

    if (firstProjectRow?.id) {
      const taskInsertResult = (await client.callTool({
        name: 'nexus_db_insert',
        arguments: {
          table: 'tasks',
          data: {
            project_id: firstProjectRow.id,
            title: taskTitle,
            status: 'todo',
            priority: 'medium',
          },
        },
      })) as ToolCallResult;

      const insertedTaskPayload = parseToolJson<{
        count: number;
        rows: Array<{ id: string }>;
      }>('nexus_db_insert', taskInsertResult);

      attachmentTaskId = insertedTaskPayload.rows[0]?.id ?? null;
      if (!attachmentTaskId) {
        throw new Error('No se obtuvo el id de la tarea temporal para probar adjuntos.');
      }

      const attachmentUploadResult = (await client.callTool({
        name: 'nexus_task_attachment_upload',
        arguments: {
          taskId: attachmentTaskId,
          fileName: 'smoke-attachment.txt',
          fileBase64: attachmentContent,
          mimeType: 'text/plain',
        },
      })) as ToolCallResult;

      const attachmentPayload = parseToolJson<{
        attachmentId: string;
        taskId: string;
        bucket: string;
        filePath: string;
        fileSize: number;
      }>('nexus_task_attachment_upload', attachmentUploadResult);

      attachmentId = attachmentPayload.attachmentId;
      attachmentPath = attachmentPayload.filePath;

      if (
        attachmentPayload.taskId !== attachmentTaskId ||
        attachmentPayload.bucket !== 'task-attachments' ||
        attachmentPayload.fileSize < 1
      ) {
        throw new Error('La tool de adjuntos no devolvio el payload esperado.');
      }

      const { data: attachmentRow, error: attachmentError } = await supabase
        .from('task_attachments')
        .select('id, task_id, file_path, uploaded_by')
        .eq('id', attachmentId)
        .maybeSingle();

      if (attachmentError) throw attachmentError;
      if (!attachmentRow || attachmentRow.task_id !== attachmentTaskId || attachmentRow.file_path !== attachmentPath) {
        throw new Error('No se encontro el metadata del adjunto creado por MCP.');
      }

      const { data: taskFlagsRow, error: taskFlagsError } = await supabase
        .from('tasks')
        .select('last_attachment_by, last_attachment_at, has_new_attachments_for_dev')
        .eq('id', attachmentTaskId)
        .maybeSingle();

      if (taskFlagsError) throw taskFlagsError;
      if (!taskFlagsRow?.last_attachment_by || !taskFlagsRow?.last_attachment_at) {
        throw new Error('La tarea temporal no actualizo los flags de adjunto.');
      }

      const attachmentDeleteResult = (await client.callTool({
        name: 'nexus_storage_delete',
        arguments: {
          bucket: 'task-attachments',
          paths: [attachmentPath],
          confirm: true,
        },
      })) as ToolCallResult;

      const attachmentDeletePayload = parseToolJson<{ deletedCount: number }>(
        'nexus_storage_delete',
        attachmentDeleteResult
      );

      if (attachmentDeletePayload.deletedCount < 1) {
        throw new Error('No se pudo eliminar el archivo temporal de adjunto en storage.');
      }

      const taskDeleteResult = (await client.callTool({
        name: 'nexus_db_delete',
        arguments: {
          table: 'tasks',
          filters: {
            id: attachmentTaskId,
          },
          confirm: true,
        },
      })) as ToolCallResult;

      const taskDeletePayload = parseToolJson<{ count: number }>('nexus_db_delete', taskDeleteResult);
      if (taskDeletePayload.count !== 1) {
        throw new Error('No se pudo eliminar la tarea temporal del smoke de adjuntos.');
      }

      const { data: deletedAttachmentRow, error: deletedAttachmentError } = await supabase
        .from('task_attachments')
        .select('id')
        .eq('id', attachmentId)
        .maybeSingle();

      if (deletedAttachmentError) throw deletedAttachmentError;
      if (deletedAttachmentRow) {
        throw new Error('El metadata del adjunto temporal no fue eliminado por cascade.');
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
    })) as ToolCallResult;

    const deletePayload = parseToolJson<{ count: number; rows: Array<Record<string, unknown>> }>(
      'nexus_db_delete',
      deleteSuccessResult
    );

    if (
      !schemaPayload.tables?.length ||
      !schemaPayload.columns?.length ||
      selectPayload.count < 0 ||
      updatePayload.count !== 1 ||
      deletePayload.count !== 1 ||
      authPayload.count < 0
    ) {
      throw new Error('Las tools MCP no devolvieron la informacion esperada.');
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
    if (attachmentTaskId) {
      actionTypes.push('nexus_task_attachment_upload');
    }

    const { data: actionRows, error: actionError } = await supabase
      .from('agent_actions')
      .select('action_type, input_text, status, user_id, created_at')
      .eq('user_id', config.NEXUS_MCP_ALLOWED_USER_ID)
      .in('action_type', actionTypes)
      .order('created_at', { ascending: false })
      .limit(40);

    if (actionError) throw actionError;

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
    if (attachmentTaskId) {
      requiredAudits.push('nexus_task_attachment_upload');
    }

    for (const actionType of requiredAudits) {
      const hasAudit = (actionRows ?? []).some(
        (row) => row.action_type === actionType && row.input_text === `mcp:${actionType}` && row.status === 'success'
      );

      if (!hasAudit) {
        throw new Error(`No se encontro auditoria exitosa para ${actionType}.`);
      }
    }

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
    } else {
      console.log('[smoke] storage write tests: SKIPPED (sin buckets)');
    }
    if (attachmentTaskId) {
      console.log('[smoke] nexus_task_attachment_upload: OK');
    } else {
      console.log('[smoke] task attachment test: SKIPPED (sin proyectos)');
    }
    console.log('[smoke] nexus_db_rpc protegido: OK');
    console.log('[smoke] bloqueo de tablas protegidas y user_id forjado: OK');
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
