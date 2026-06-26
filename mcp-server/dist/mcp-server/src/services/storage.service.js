import { ToolExecutionError } from '../errors.js';
import { MAX_TASK_ATTACHMENT_BYTES } from './types.js';
import { logAgentAction, tryLogAgentFailure } from './audit.service.js';
const TASK_ATTACHMENTS_BUCKET = 'task-attachments';
function decodeBase64Payload(base64Payload) {
    const normalized = base64Payload.includes(',')
        ? base64Payload.slice(base64Payload.indexOf(',') + 1)
        : base64Payload;
    try {
        return Buffer.from(normalized, 'base64');
    }
    catch {
        throw new ToolExecutionError('fileBase64 no tiene un formato base64 valido.');
    }
}
function sanitizeAttachmentFileName(fileName) {
    return fileName.replace(/[^\w.\-]+/g, '_');
}
export async function listStorageBuckets(context, _input, audit) {
    try {
        const { data, error } = await context.supabaseClient.storage.listBuckets();
        if (error)
            throw new ToolExecutionError(error.message);
        const buckets = (data ?? []).map((bucket) => ({
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
    }
    catch (error) {
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
export async function listStorageObjects(context, input, audit) {
    try {
        const { data, error } = await context.supabaseClient.storage.from(input.bucket).list(input.prefix, {
            limit: input.limit ?? 50,
        });
        if (error)
            throw new ToolExecutionError(error.message);
        const objects = (data ?? []).map((item) => ({ ...item }));
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
    }
    catch (error) {
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
export async function uploadStorageText(context, input, audit) {
    try {
        const { error } = await context.supabaseClient.storage
            .from(input.bucket)
            .upload(input.path, input.content, {
            contentType: input.contentType ?? 'text/plain; charset=utf-8',
            upsert: input.upsert ?? true,
        });
        if (error)
            throw new ToolExecutionError(error.message);
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
    }
    catch (error) {
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
export async function uploadTaskAttachment(context, input, audit) {
    const decodedFile = decodeBase64Payload(input.fileBase64);
    const fileSize = decodedFile.byteLength;
    if (fileSize < 1) {
        throw new ToolExecutionError('El archivo adjunto esta vacio.');
    }
    if (fileSize > MAX_TASK_ATTACHMENT_BYTES) {
        throw new ToolExecutionError('El archivo adjunto excede el maximo permitido de 10MB.');
    }
    const safeFileName = sanitizeAttachmentFileName(input.fileName);
    const filePath = `${input.taskId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
    try {
        const { error: uploadError } = await context.supabaseClient.storage
            .from(TASK_ATTACHMENTS_BUCKET)
            .upload(filePath, decodedFile, {
            contentType: input.mimeType,
            upsert: input.upsert ?? false,
        });
        if (uploadError) {
            throw new ToolExecutionError(uploadError.message);
        }
        const uploaderIsManager = context.userRole === 'admin' || context.userRole === 'pm';
        const uploaderIsDev = context.userRole === 'dev';
        const { data: attachmentRow, error: attachmentError } = await context.supabaseClient
            .from('task_attachments')
            .insert({
            task_id: input.taskId,
            file_name: input.fileName,
            file_path: filePath,
            file_size: fileSize,
            file_type: input.mimeType,
            uploaded_by: context.userId,
            viewed_by_pm: uploaderIsManager,
            viewed_by_dev: uploaderIsDev,
        })
            .select('id')
            .single();
        if (attachmentError || !attachmentRow) {
            await context.supabaseClient.storage.from(TASK_ATTACHMENTS_BUCKET).remove([filePath]);
            throw new ToolExecutionError(attachmentError?.message ?? 'No se pudo guardar el adjunto.');
        }
        const taskUpdates = {
            last_attachment_by: context.userId,
            last_attachment_at: new Date().toISOString(),
        };
        if (uploaderIsDev) {
            taskUpdates.has_new_attachments_for_pm = true;
        }
        else if (uploaderIsManager) {
            taskUpdates.has_new_attachments_for_dev = true;
        }
        const { error: taskUpdateError } = await context.supabaseClient
            .from('tasks')
            .update(taskUpdates)
            .eq('id', input.taskId);
        if (taskUpdateError) {
            throw new ToolExecutionError(taskUpdateError.message);
        }
        if (audit.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: 'task_attachment',
                entity_id: attachmentRow.id,
                task_id: input.taskId,
                input_text: audit.input_text ?? null,
                result: {
                    bucket: TASK_ATTACHMENTS_BUCKET,
                    file_name: input.fileName,
                    file_path: filePath,
                    file_size: fileSize,
                    mime_type: input.mimeType,
                },
                status: 'success',
            });
        }
        return {
            attachmentId: attachmentRow.id,
            taskId: input.taskId,
            bucket: TASK_ATTACHMENTS_BUCKET,
            fileName: input.fileName,
            filePath,
            fileSize,
            mimeType: input.mimeType,
        };
    }
    catch (error) {
        if (audit.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: 'task_attachment',
                task_id: input.taskId,
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
export async function deleteStorageObjects(context, input, audit) {
    try {
        if (input.confirm !== true) {
            throw new ToolExecutionError('confirm debe ser true para eliminar objetos de storage.');
        }
        const { data, error } = await context.supabaseClient.storage.from(input.bucket).remove(input.paths);
        if (error)
            throw new ToolExecutionError(error.message);
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
    }
    catch (error) {
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
