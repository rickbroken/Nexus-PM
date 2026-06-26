import { ToolExecutionError } from '../errors.js';
import type {
  AgentAuditContext,
  AgentServerContext,
  StorageDeleteInput,
  StorageDeleteResult,
  StorageListBucketsInput,
  StorageListBucketsResult,
  StorageListObjectsInput,
  StorageListObjectsResult,
  StorageUploadTextInput,
  StorageUploadTextResult,
} from './types.js';
import { logAgentAction, tryLogAgentFailure } from './audit.service.js';

export async function listStorageBuckets(
  context: AgentServerContext,
  _input: StorageListBucketsInput,
  audit: AgentAuditContext
): Promise<StorageListBucketsResult> {
  try {
    const { data, error } = await context.supabaseClient.storage.listBuckets();
    if (error) throw new ToolExecutionError(error.message);

    const buckets = (data ?? []).map((bucket: any) => ({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public ?? null,
      fileSizeLimit: bucket.file_size_limit ?? null,
    }));

    if (audit.enabled) {
      await logAgentAction(context, {
        action_type: audit.action_type,
        entity_type: 'storage_bucket',
        input_text: audit.input_text ?? null,
        result: {
          count: buckets.length,
        },
        status: 'success',
      });
    }

    return {
      count: buckets.length,
      buckets,
    };
  } catch (error) {
    if (audit.enabled) {
      await tryLogAgentFailure(context, {
        action_type: audit.action_type,
        entity_type: 'storage_bucket',
        input_text: audit.input_text ?? null,
        error_message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
    throw error;
  }
}

export async function listStorageObjects(
  context: AgentServerContext,
  input: StorageListObjectsInput,
  audit: AgentAuditContext
): Promise<StorageListObjectsResult> {
  try {
    const { data, error } = await context.supabaseClient.storage.from(input.bucket).list(input.prefix, {
      limit: input.limit ?? 50,
    });

    if (error) throw new ToolExecutionError(error.message);

    const objects = ((data ?? []) as unknown[]).map((item) => ({ ...(item as Record<string, unknown>) }));

    if (audit.enabled) {
      await logAgentAction(context, {
        action_type: audit.action_type,
        entity_type: 'storage_object',
        input_text: audit.input_text ?? null,
        result: {
          bucket: input.bucket,
          count: objects.length,
        },
        status: 'success',
      });
    }

    return {
      bucket: input.bucket,
      count: objects.length,
      objects,
    };
  } catch (error) {
    if (audit.enabled) {
      await tryLogAgentFailure(context, {
        action_type: audit.action_type,
        entity_type: 'storage_object',
        input_text: audit.input_text ?? null,
        error_message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
    throw error;
  }
}

export async function uploadStorageText(
  context: AgentServerContext,
  input: StorageUploadTextInput,
  audit: AgentAuditContext
): Promise<StorageUploadTextResult> {
  try {
    const { error } = await context.supabaseClient.storage
      .from(input.bucket)
      .upload(input.path, input.content, {
        contentType: input.contentType ?? 'text/plain; charset=utf-8',
        upsert: input.upsert ?? true,
      });

    if (error) throw new ToolExecutionError(error.message);

    if (audit.enabled) {
      await logAgentAction(context, {
        action_type: audit.action_type,
        entity_type: 'storage_object',
        entity_id: null,
        input_text: audit.input_text ?? null,
        result: {
          bucket: input.bucket,
          path: input.path,
          contentType: input.contentType ?? 'text/plain; charset=utf-8',
        },
        status: 'success',
      });
    }

    return {
      bucket: input.bucket,
      path: input.path,
      contentType: input.contentType ?? 'text/plain; charset=utf-8',
    };
  } catch (error) {
    if (audit.enabled) {
      await tryLogAgentFailure(context, {
        action_type: audit.action_type,
        entity_type: 'storage_object',
        input_text: audit.input_text ?? null,
        error_message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
    throw error;
  }
}

export async function deleteStorageObjects(
  context: AgentServerContext,
  input: StorageDeleteInput,
  audit: AgentAuditContext
): Promise<StorageDeleteResult> {
  try {
    if (input.confirm !== true) {
      throw new ToolExecutionError('confirm debe ser true para eliminar objetos de storage.');
    }

    const { data, error } = await context.supabaseClient.storage.from(input.bucket).remove(input.paths);
    if (error) throw new ToolExecutionError(error.message);

    if (audit.enabled) {
      await logAgentAction(context, {
        action_type: audit.action_type,
        entity_type: 'storage_object',
        input_text: audit.input_text ?? null,
        result: {
          bucket: input.bucket,
          deleted_count: input.paths.length,
        },
        status: 'success',
      });
    }

    return {
      bucket: input.bucket,
      deletedCount: (data ?? []).length || input.paths.length,
      paths: input.paths,
    };
  } catch (error) {
    if (audit.enabled) {
      await tryLogAgentFailure(context, {
        action_type: audit.action_type,
        entity_type: 'storage_object',
        input_text: audit.input_text ?? null,
        error_message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
    throw error;
  }
}
