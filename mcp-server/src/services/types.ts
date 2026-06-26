import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'pm' | 'dev' | 'advisor';

export type ServerSupabaseClient = SupabaseClient<any>;

export interface AgentServerContext {
  supabaseClient: ServerSupabaseClient;
  userId: string;
  userRole: UserRole;
}

export const PROTECTED_READ_TABLES = ['project_credentials'] as const;
export const PROTECTED_WRITE_TABLES = ['agent_actions', 'project_credentials', 'task_attachments'] as const;
export const AUTH_BLOCKED_DB_TABLES = ['auth.users'] as const;
export const MAX_SELECT_LIMIT = 100;
export const MAX_SCHEMA_ITEMS = 200;
export const MAX_STORAGE_LIST_LIMIT = 100;
export const MAX_STORAGE_DELETE_BATCH = 50;
export const MAX_AUTH_LIST_PER_PAGE = 100;
export const MAX_TASK_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const DEFAULT_ACTOR_COLUMNS = ['user_id', 'created_by', 'added_by', 'uploaded_by'] as const;
export const ENFORCED_ACTOR_COLUMNS = [
  'user_id',
  'created_by',
  'added_by',
  'uploaded_by',
  'deleted_by',
  'cancelled_by',
] as const;

export type AgentActionStatus = 'success' | 'failed' | 'pending';
export type SimpleFilterValue = string | number | boolean | null;
export type SimpleFilters = Record<string, SimpleFilterValue>;

export interface AgentAuditContext {
  enabled?: boolean;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
  task_id?: string;
  client_id?: string;
  payment_id?: string;
  recurring_charge_id?: string;
  input_text?: string;
}

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

export const openAiFileUploadSchema = z.object({
  download_url: z.string().url('file.download_url debe ser una URL valida'),
  file_id: z.string().trim().min(1).optional(),
  mime_type: z.string().trim().min(1).optional(),
  file_name: z.string().trim().min(1).optional(),
});

export const taskAttachmentUploadSchema = z
  .object({
    taskId: z.string().uuid('taskId debe ser un UUID'),
    file: openAiFileUploadSchema.optional(),
    fileName: z.string().trim().min(1).optional(),
    fileBase64: z.string().trim().min(1).optional(),
    mimeType: z.string().trim().min(1).optional(),
    upsert: z.boolean().optional().default(false),
  })
  .superRefine((input, ctx) => {
    const hasFileParam = Boolean(input.file);
    const hasBase64 = Boolean(input.fileBase64);

    if (!hasFileParam && !hasBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes enviar file o fileBase64.',
      });
    }

    if (hasFileParam && hasBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Usa file o fileBase64, no ambos al mismo tiempo.',
      });
    }

    if (hasBase64 && !input.fileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fileName es obligatorio cuando usas fileBase64.',
        path: ['fileName'],
      });
    }

    if (hasBase64 && !input.mimeType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'mimeType es obligatorio cuando usas fileBase64.',
        path: ['mimeType'],
      });
    }
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

export type DbSelectInput = z.infer<typeof dbSelectSchema>;
export type DbInsertInput = z.infer<typeof dbInsertSchema>;
export type DbUpdateInput = z.infer<typeof dbUpdateSchema>;
export type DbDeleteInput = z.infer<typeof dbDeleteSchema>;
export type DbRpcInput = z.infer<typeof dbRpcSchema>;
export type BackendSchemaInput = z.infer<typeof backendSchemaSchema>;
export type StorageListBucketsInput = z.infer<typeof storageListBucketsSchema>;
export type StorageListObjectsInput = z.infer<typeof storageListObjectsSchema>;
export type StorageUploadTextInput = z.infer<typeof storageUploadTextSchema>;
export type OpenAiFileUploadInput = z.infer<typeof openAiFileUploadSchema>;
export type TaskAttachmentUploadInput = z.infer<typeof taskAttachmentUploadSchema>;
export type StorageDeleteInput = z.infer<typeof storageDeleteSchema>;
export type AuthListUsersInput = z.infer<typeof authListUsersSchema>;
export type AuthGetUserInput = z.infer<typeof authGetUserSchema>;
export type AuthCreateUserInput = z.infer<typeof authCreateUserSchema>;
export type AuthUpdateUserInput = z.infer<typeof authUpdateUserSchema>;
export type AuthDeleteUserInput = z.infer<typeof authDeleteUserSchema>;
export type AgentActionInput = z.infer<typeof agentActionInputSchema>;

export interface DatabaseSelectResult {
  table: string;
  count: number;
  rows: Record<string, unknown>[];
}

export interface DatabaseMutationResult {
  table: string;
  count: number;
  rows: Record<string, unknown>[];
}

export interface DatabaseRpcResult {
  functionName: string;
  data: unknown;
}

export interface BackendSchemaResult {
  resource: BackendSchemaInput['resource'];
  tables?: Array<{ name: string; type: string }>;
  columns?: Array<{ table: string; column: string; dataType: string; isNullable: boolean }>;
  rpcs?: Array<{ name: string; returnType: string | null }>;
  buckets?: Array<{ id: string; name: string; public: boolean | null }>;
}

export interface StorageListBucketsResult {
  count: number;
  buckets: Array<{ id: string; name: string; public: boolean | null; fileSizeLimit?: number | null }>;
}

export interface StorageListObjectsResult {
  bucket: string;
  count: number;
  objects: Array<Record<string, unknown>>;
}

export interface StorageUploadTextResult {
  bucket: string;
  path: string;
  contentType: string;
}

export interface TaskAttachmentUploadResult {
  attachmentId: string;
  taskId: string;
  bucket: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface StorageDeleteResult {
  bucket: string;
  deletedCount: number;
  paths: string[];
}

export interface AuthListUsersResult {
  count: number;
  users: Array<Record<string, unknown>>;
}

export interface AuthUserResult {
  user: Record<string, unknown>;
}
