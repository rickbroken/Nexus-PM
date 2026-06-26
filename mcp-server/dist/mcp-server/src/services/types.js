import { z } from 'zod';
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
];
export const PROTECTED_TABLES = ['users_profiles', 'agent_actions', 'auth.users'];
export const ALLOWED_RPCS = [];
export const MAX_SELECT_LIMIT = 100;
export const TABLES_WITH_USER_ID = ['reminders', 'task_comments', 'project_members', 'notifications'];
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
