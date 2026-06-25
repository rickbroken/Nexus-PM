import { z } from 'zod';
const optionalUuid = z.string().uuid().optional().nullable();
const optionalText = z.string().trim().optional().nullable();
const validDateString = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Fecha invalida',
});
export const createReminderInputSchema = z.object({
    title: z.string().trim().min(2, 'El titulo debe tener al menos 2 caracteres'),
    description: optionalText,
    remind_at: validDateString,
    project_id: optionalUuid,
    task_id: optionalUuid,
    source: z.enum(['manual', 'agent', 'system']).optional().default('agent'),
});
export const updateReminderInputSchema = z.object({
    reminder_id: z.string().uuid(),
    remind_at: validDateString.optional(),
});
export const createTaskInputSchema = z.object({
    project_id: z.string().uuid(),
    title: z.string().trim().min(2, 'El titulo debe tener al menos 2 caracteres'),
    description: optionalText,
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
});
export const updateTaskStatusInputSchema = z.object({
    task_id: z.string().uuid(),
    status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived']),
    review_status: z.enum(['pending', 'approved', 'rejected']).nullable().optional(),
    project_id: optionalUuid,
});
export const agentActionInputSchema = z.object({
    action_type: z.string().trim().min(2, 'El tipo de accion es obligatorio'),
    entity_type: optionalText,
    entity_id: optionalUuid,
    project_id: optionalUuid,
    task_id: optionalUuid,
    client_id: optionalUuid,
    payment_id: optionalUuid,
    recurring_charge_id: optionalUuid,
    input_text: optionalText,
    result: z.record(z.string(), z.unknown()).optional().nullable(),
    status: z.enum(['success', 'failed', 'pending']).default('pending'),
    error_message: optionalText,
});
