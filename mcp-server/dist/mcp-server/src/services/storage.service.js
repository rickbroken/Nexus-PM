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
function inferDownloadFileName(downloadUrl) {
    try {
        const pathname = new URL(downloadUrl).pathname;
        const rawName = pathname.split('/').pop();
        return rawName ? decodeURIComponent(rawName) : 'attachment.bin';
    }
    catch {
        return 'attachment.bin';
    }
}
async function downloadAttachmentSource(downloadUrl) {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
        throw new ToolExecutionError(`No se pudo descargar el archivo adjunto (${response.status}).`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
        fileBytes: Buffer.from(arrayBuffer),
        responseMimeType: response.headers.get('content-type')?.split(';')[0]?.trim(),
    };
}
async function resolveTaskAttachmentSource(input) {
    if (input.fileBase64) {
        return [{
                fileBytes: decodeBase64Payload(input.fileBase64),
                fileName: input.fileName ?? 'attachment.bin',
                mimeType: input.mimeType ?? 'application/octet-stream',
            }];
    }
    const fileRef = input.file;
    if (fileRef?.download_url) {
        const downloaded = await downloadAttachmentSource(fileRef.download_url);
        return [{
                fileBytes: downloaded.fileBytes,
                mimeType: input.mimeType ??
                    fileRef.mime_type ??
                    downloaded.responseMimeType ??
                    'application/octet-stream',
                fileName: input.fileName ??
                    fileRef.file_name ??
                    inferDownloadFileName(fileRef.download_url),
            }];
    }
    const fileRefs = input.openaiFileIdRefs;
    if (fileRefs?.length) {
        return Promise.all(fileRefs.map(async (ref, index) => {
            const downloaded = await downloadAttachmentSource(ref.download_link);
            return {
                fileBytes: downloaded.fileBytes,
                mimeType: (index === 0 ? input.mimeType : undefined) ??
                    ref.mime_type ??
                    downloaded.responseMimeType ??
                    'application/octet-stream',
                fileName: (index === 0 ? input.fileName : undefined) ??
                    ref.name ??
                    inferDownloadFileName(ref.download_link),
            };
        }));
    }
    throw new ToolExecutionError('Debes enviar file, openaiFileIdRefs o fileBase64 para adjuntar a la tarea.');
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
    const sources = await resolveTaskAttachmentSource(input);
    const attachments = [];
    try {
        const uploaderIsManager = context.userRole === 'admin' || context.userRole === 'pm';
        const uploaderIsDev = context.userRole === 'dev';
        for (const source of sources) {
            const fileSize = source.fileBytes.byteLength;
            if (fileSize < 1) {
                throw new ToolExecutionError('El archivo adjunto esta vacio.');
            }
            if (fileSize > MAX_TASK_ATTACHMENT_BYTES) {
                throw new ToolExecutionError('El archivo adjunto excede el maximo permitido de 10MB.');
            }
            const safeFileName = sanitizeAttachmentFileName(source.fileName);
            const filePath = `${input.taskId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
            const { error: uploadError } = await context.supabaseClient.storage
                .from(TASK_ATTACHMENTS_BUCKET)
                .upload(filePath, source.fileBytes, {
                contentType: source.mimeType,
                upsert: input.upsert ?? false,
            });
            if (uploadError) {
                throw new ToolExecutionError(uploadError.message);
            }
            const { data: attachmentRow, error: attachmentError } = await context.supabaseClient
                .from('task_attachments')
                .insert({
                task_id: input.taskId,
                file_name: source.fileName,
                file_path: filePath,
                file_size: fileSize,
                file_type: source.mimeType,
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
            attachments.push({
                attachmentId: attachmentRow.id,
                taskId: input.taskId,
                bucket: TASK_ATTACHMENTS_BUCKET,
                fileName: source.fileName,
                filePath,
                fileSize,
                mimeType: source.mimeType,
            });
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
                entity_id: attachments[0]?.attachmentId ?? null,
                task_id: input.taskId,
                input_text: audit.input_text ?? null,
                result: {
                    bucket: TASK_ATTACHMENTS_BUCKET,
                    attachment_count: attachments.length,
                    attachments,
                },
                status: 'success',
            });
        }
        const firstAttachment = attachments[0];
        if (!firstAttachment) {
            throw new ToolExecutionError('No se pudo crear ningun adjunto.');
        }
        return {
            ...firstAttachment,
            attachments,
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
export async function deleteTaskAttachment(context, input, audit) {
    try {
        if (input.confirm !== true) {
            throw new ToolExecutionError('confirm debe ser true para eliminar un adjunto de tarea.');
        }
        const { data: attachmentRow, error: attachmentError } = await context.supabaseClient
            .from('task_attachments')
            .select('id, task_id, file_name, file_path')
            .eq('id', input.attachmentId)
            .single();
        if (attachmentError || !attachmentRow) {
            throw new ToolExecutionError('No se encontro el adjunto solicitado.');
        }
        let storageDeleted = false;
        if (attachmentRow.file_path) {
            const { error: storageError } = await context.supabaseClient.storage
                .from(TASK_ATTACHMENTS_BUCKET)
                .remove([attachmentRow.file_path]);
            if (!storageError) {
                storageDeleted = true;
            }
        }
        const { error: deleteError } = await context.supabaseClient
            .from('task_attachments')
            .delete()
            .eq('id', input.attachmentId);
        if (deleteError) {
            throw new ToolExecutionError(deleteError.message);
        }
        const result = {
            attachmentId: attachmentRow.id,
            taskId: attachmentRow.task_id,
            bucket: TASK_ATTACHMENTS_BUCKET,
            fileName: attachmentRow.file_name,
            filePath: attachmentRow.file_path,
            storageDeleted,
            metadataDeleted: true,
        };
        if (audit.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: 'task_attachment',
                entity_id: attachmentRow.id,
                task_id: attachmentRow.task_id,
                input_text: audit.input_text ?? null,
                result,
                status: 'success',
            });
        }
        return result;
    }
    catch (error) {
        if (audit.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: 'task_attachment',
                entity_id: input.attachmentId,
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
