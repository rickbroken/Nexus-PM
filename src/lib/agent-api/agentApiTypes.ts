import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentAction,
  Payment,
  RecurringCharge,
  Reminder,
  ReminderSource,
  ReviewStatus,
  Task,
  TaskPriority,
  TaskStatus,
  UserRole,
} from '../supabase.js';

const optionalUuid = z.string().uuid().optional().nullable();
const optionalText = z.string().trim().optional().nullable();
const validDateString = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Fecha invalida',
});

export type AgentSupabaseClient = SupabaseClient<any>;

export interface AgentApiContext {
  supabaseClient: AgentSupabaseClient;
  userId: string;
  userRole: UserRole;
}

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

export type CreateReminderApiInput = z.infer<typeof createReminderInputSchema>;
export type UpdateReminderApiInput = z.infer<typeof updateReminderInputSchema>;
export type CreateTaskApiInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskStatusApiInput = z.infer<typeof updateTaskStatusInputSchema>;
export type AgentActionApiInput = z.infer<typeof agentActionInputSchema>;

export type PendingTaskItem = Pick<Task, 'id' | 'title' | 'status' | 'priority' | 'due_date'> & {
  project_id?: string;
  project?: Pick<NonNullable<Task['project']>, 'id' | 'name'>;
  assignee?: Pick<NonNullable<Task['assignee']>, 'id' | 'full_name'>;
};

export type ReminderBriefItem = Pick<
  Reminder,
  'id' | 'title' | 'status' | 'priority' | 'remind_at' | 'source'
> & {
  project?: Pick<NonNullable<Reminder['project']>, 'id' | 'name'>;
  task?: Pick<NonNullable<Reminder['task']>, 'id' | 'title'>;
};

export type PaymentBriefItem = Pick<
  Payment,
  'id' | 'amount' | 'payment_date' | 'status' | 'type' | 'reference'
> & {
  project_id?: string;
  project?: {
    id: string;
    name: string;
  };
};

export type RecurringChargeBriefItem = Pick<
  RecurringCharge,
  'id' | 'description' | 'amount' | 'next_due_date' | 'type' | 'project_id'
> & {
  project?: {
    id: string;
    name: string;
  };
};

export type FailedAgentActionItem = Pick<
  AgentAction,
  'id' | 'action_type' | 'status' | 'created_at' | 'error_message' | 'entity_type' | 'entity_id'
> & {
  user?: Pick<NonNullable<AgentAction['user']>, 'id' | 'full_name'>;
  project?: Pick<NonNullable<AgentAction['project']>, 'id' | 'name'>;
};

export type FinancialAgentActionItem = Pick<
  AgentAction,
  'id' | 'action_type' | 'status' | 'created_at' | 'error_message' | 'payment_id' | 'recurring_charge_id'
> & {
  user?: Pick<NonNullable<AgentAction['user']>, 'id' | 'full_name'>;
  project?: Pick<NonNullable<AgentAction['project']>, 'id' | 'name'>;
};

export interface AgentBriefData {
  role: UserRole;
  canSeeFinance: boolean;
  showTasks: boolean;
  stats: {
    pendingTasks: number;
    overdueTasks: number;
    pendingReminders: number;
    upcomingReminders24h: number;
    pendingPayments: number;
    overduePayments: number;
    upcomingRecurringCharges: number;
    overdueRecurringCharges: number;
  };
  tasks: {
    pending: PendingTaskItem[];
    overdue: PendingTaskItem[];
  };
  reminders: {
    upcoming24h: ReminderBriefItem[];
    upcomingGeneral: ReminderBriefItem[];
  };
  finances: {
    pendingPayments: PaymentBriefItem[];
    overduePayments: PaymentBriefItem[];
    upcomingRecurringCharges: RecurringChargeBriefItem[];
    overdueRecurringCharges: RecurringChargeBriefItem[];
  };
  actions: {
    recentFinancial: FinancialAgentActionItem[];
    recentFailed: FailedAgentActionItem[];
  };
}

export type ReminderMutationResult = {
  id: string;
  title?: string;
  project_id?: string | null;
  task_id?: string | null;
  remind_at?: string;
  source?: ReminderSource;
  status?: Reminder['status'];
};

export type TaskMutationResult = {
  id: string;
  project_id?: string | null;
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  review_status?: ReviewStatus;
};
