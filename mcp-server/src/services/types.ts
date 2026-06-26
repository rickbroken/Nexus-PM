import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'pm' | 'dev' | 'advisor';

export type ServerSupabaseClient = SupabaseClient<any>;

export interface AgentServerContext {
  supabaseClient: ServerSupabaseClient;
  userId: string;
  userRole: UserRole;
}

export const ALLOWED_TABLES = [
  'projects',
  'tasks',
  'clients',
  'payments',
  'recurring_charges',
  'reminders',
  'task_comments',
  'project_members',
  'notifications',
] as const;

export const PROTECTED_TABLES = ['users_profiles', 'agent_actions', 'auth.users'] as const;
export const ALLOWED_RPCS = [] as const;
export const MAX_SELECT_LIMIT = 100;
export const TABLES_WITH_USER_ID = ['reminders', 'task_comments', 'project_members', 'notifications'] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];
export type ProtectedTable = (typeof PROTECTED_TABLES)[number];
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
export type AgentActionInput = z.infer<typeof agentActionInputSchema>;

export interface DatabaseSelectResult {
  table: AllowedTable;
  count: number;
  rows: Record<string, unknown>[];
}

export interface DatabaseMutationResult {
  table: AllowedTable;
  count: number;
  rows: Record<string, unknown>[];
}

export interface DatabaseRpcResult {
  functionName: string;
  data: unknown;
}
