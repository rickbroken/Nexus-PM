import { z } from 'zod';
export const PROTECTED_READ_TABLES = ['project_credentials'];
export const PROTECTED_WRITE_TABLES = ['agent_actions', 'project_credentials'];
export const AUTH_BLOCKED_DB_TABLES = ['auth.users'];
export const MAX_SELECT_LIMIT = 100;
export const MAX_SCHEMA_ITEMS = 200;
export const MAX_STORAGE_LIST_LIMIT = 100;
export const MAX_STORAGE_DELETE_BATCH = 50;
export const MAX_AUTH_LIST_PER_PAGE = 100;
export const MAX_TASK_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const DEFAULT_ACTOR_COLUMNS = ['user_id', 'created_by', 'added_by', 'uploaded_by'];
export const ENFORCED_ACTOR_COLUMNS = [
    'user_id',
    'created_by',
    'added_by',
    'uploaded_by',
    'deleted_by',
    'cancelled_by',
];
export const simpleFilterValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const simpleFiltersSchema = z.record(z.string(), simpleFilterValueSchema);
export const tableNameSchema = z
    .string()
    .trim()
    .min(1, 'table es obligatoria')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_.]*$/, 'table invalida');
export const dbSelectSchema = z.object({
    table: tableNameSchema,
    columns: z.string().trim().min(1).optional(),
    filters: simpleFiltersSchema.optional(),
    orderBy: z.string().trim().min(1).optional(),
    limit: z.number().int().positive().max(MAX_SELECT_LIMIT).optional(),
});
export const dbInsertSchema = z.object({
    table: tableNameSchema,
    data: z.record(z.string(), z.unknown()),
});
export const dbUpdateSchema = z.object({
    table: tableNameSchema,
    filters: simpleFiltersSchema,
    data: z.record(z.string(), z.unknown()),
});
export const dbDeleteSchema = z.object({
    table: tableNameSchema,
    filters: simpleFiltersSchema,
    confirm: z.boolean(),
});
export const dbRpcSchema = z.object({
    functionName: z.string().trim().min(1, 'functionName es obligatorio'),
    args: z.record(z.string(), z.unknown()).optional(),
});
export const backendSchemaSchema = z.object({
    resource: z.enum(['tables', 'columns', 'rpcs', 'buckets', 'all']).optional().default('all'),
    table: tableNameSchema.optional(),
});
export const storageListBucketsSchema = z.object({});
export const storageListObjectsSchema = z.object({
    bucket: z.string().trim().min(1, 'bucket es obligatorio'),
    prefix: z.string().trim().optional(),
    limit: z.number().int().positive().max(MAX_STORAGE_LIST_LIMIT).optional(),
});
export const storageUploadTextSchema = z.object({
    bucket: z.string().trim().min(1, 'bucket es obligatorio'),
    path: z.string().trim().min(1, 'path es obligatorio'),
    content: z.string(),
    contentType: z.string().trim().optional(),
    upsert: z.boolean().optional().default(true),
});
export const taskAttachmentUploadSchema = z.object({
    taskId: z.string().uuid('taskId debe ser un UUID'),
    fileName: z.string().trim().min(1, 'fileName es obligatorio'),
    fileBase64: z.string().trim().min(1, 'fileBase64 es obligatorio'),
    mimeType: z.string().trim().min(1, 'mimeType es obligatorio'),
    upsert: z.boolean().optional().default(false),
});
export const storageDeleteSchema = z.object({
    bucket: z.string().trim().min(1, 'bucket es obligatorio'),
    paths: z.array(z.string().trim().min(1)).min(1).max(MAX_STORAGE_DELETE_BATCH),
    confirm: z.boolean(),
});
export const authListUsersSchema = z.object({
    page: z.number().int().positive().optional().default(1),
    perPage: z.number().int().positive().max(MAX_AUTH_LIST_PER_PAGE).optional().default(50),
});
export const authGetUserSchema = z.object({
    userId: z.string().uuid('userId debe ser un UUID'),
});
export const authCreateUserSchema = z.object({
    email: z.string().email('email invalido'),
    password: z.string().min(6, 'password debe tener al menos 6 caracteres').optional(),
    emailConfirm: z.boolean().optional().default(false),
    phone: z.string().trim().optional(),
    userMetadata: z.record(z.string(), z.unknown()).optional(),
    appMetadata: z.record(z.string(), z.unknown()).optional(),
});
export const authUpdateUserSchema = z.object({
    userId: z.string().uuid('userId debe ser un UUID'),
    email: z.string().email('email invalido').optional(),
    password: z.string().min(6, 'password debe tener al menos 6 caracteres').optional(),
    phone: z.string().trim().optional(),
    userMetadata: z.record(z.string(), z.unknown()).optional(),
    appMetadata: z.record(z.string(), z.unknown()).optional(),
    banDuration: z.string().trim().optional(),
    emailConfirm: z.boolean().optional(),
});
export const authDeleteUserSchema = z.object({
    userId: z.string().uuid('userId debe ser un UUID'),
    confirm: z.boolean(),
    shouldSoftDelete: z.boolean().optional().default(false),
});
export const agentActionInputSchema = z.object({
    action_type: z.string().trim().min(2, 'El tipo de accion es obligatorio'),
    entity_type: z.string().trim().optional().nullable(),
    entity_id: z.string().uuid().optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    task_id: z.string().uuid().optional().nullable(),
    client_id: z.string().uuid().optional().nullable(),
    payment_id: z.string().uuid().optional().nullable(),
    recurring_charge_id: z.string().uuid().optional().nullable(),
    input_text: z.string().trim().optional().nullable(),
    result: z.record(z.string(), z.unknown()).optional().nullable(),
    status: z.enum(['success', 'failed', 'pending']).default('pending'),
    error_message: z.string().trim().optional().nullable(),
});
