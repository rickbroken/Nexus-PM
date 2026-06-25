import { z } from 'zod';

const optionalUuid = z.string().uuid().optional().nullable();
const optionalText = z.string().trim().optional().nullable();
const validDateString = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Fecha invalida',
});

export const createReminderSchema = z.object({
  user_id: z.string().uuid(),
  project_id: optionalUuid,
  task_id: optionalUuid,
  title: z.string().trim().min(2, 'El titulo debe tener al menos 2 caracteres'),
  description: optionalText,
  remind_at: validDateString,
  recurrence_rule: optionalText,
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  source: z.enum(['manual', 'agent', 'system']).default('manual'),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateReminderSchema = z.object({
  id: z.string().uuid(),
  project_id: optionalUuid,
  task_id: optionalUuid,
  title: z.string().trim().min(2).optional(),
  description: optionalText,
  remind_at: validDateString.optional(),
  recurrence_rule: optionalText,
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'sent', 'cancelled', 'completed']).optional(),
  source: z.enum(['manual', 'agent', 'system']).optional(),
  notified_at: validDateString.optional().nullable(),
  completed_at: validDateString.optional().nullable(),
  cancelled_at: validDateString.optional().nullable(),
  cancelled_by: optionalUuid,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const createAgentActionSchema = z.object({
  user_id: z.string().uuid(),
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

export const agentActionFiltersSchema = z.object({
  status: z.enum(['success', 'failed', 'pending']).optional(),
  action_type: z.string().trim().optional(),
  user_id: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const reminderFiltersSchema = z.object({
  status: z.enum(['pending', 'sent', 'cancelled', 'completed']).optional(),
  project_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  from: validDateString.optional(),
  to: validDateString.optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type CreateAgentActionInput = z.infer<typeof createAgentActionSchema>;
export type AgentActionFiltersInput = z.infer<typeof agentActionFiltersSchema>;
export type ReminderFiltersInput = z.infer<typeof reminderFiltersSchema>;
