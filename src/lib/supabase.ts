import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_PROYECT_ID, VITE_SUPABASE_ANON_KEY } = import.meta.env;

const supabaseUrl = `https://${VITE_SUPABASE_PROYECT_ID}.supabase.co`;
const supabaseAnonKey = VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export type UserRole = 'admin' | 'pm' | 'dev' | 'advisor';
export type ProjectStatus =
  | 'planning'
  | 'in_development'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | null;
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type PaymentType = 'income' | 'expense';
export type ChargeFrequency = 'monthly' | 'quarterly' | 'annual';
export type RecurringChargeType = 'income' | 'expense';
export type AgentActionStatus = 'success' | 'failed' | 'pending';
export type ReminderStatus = 'pending' | 'sent' | 'cancelled' | 'completed';
export type ReminderSource = 'manual' | 'agent' | 'system';
export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationType =
  | 'task_assigned'
  | 'task_ready_review'
  | 'task_approved'
  | 'task_rejected'
  | 'task_commented'
  | 'payment_received'
  | 'payment_large'
  | 'user_registered'
  | 'project_created'
  | 'project_updated'
  | 'recurring_charge_due_soon'
  | 'recurring_expense_due_soon'
  | 'reminder_due'
  | 'reminder_created'
  | 'reminder_completed'
  | 'reminder_cancelled'
  | 'agent_action_failed';
export type AgentActionType =
  | 'create_task'
  | 'update_task_status'
  | 'add_task_comment'
  | 'create_reminder'
  | 'update_reminder'
  | 'cancel_reminder'
  | 'get_project_summary'
  | 'get_pending_tasks'
  | 'get_upcoming_payments'
  | 'get_daily_brief';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id?: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  repo_url?: string;
  staging_url?: string;
  prod_url?: string;
  deployment_platform?: string;
  deployment_platform_other?: string;
  domain_platform?: string;
  domain_platform_other?: string;
  tech_stack?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  archived_at?: string;
  review_status?: ReviewStatus;
  review_notes?: string;
  dev_notes?: string;
  dev_notes_timestamp?: string;
  observation_read_by_pm?: boolean;
  observation_updated_at?: string;
  rejection_reason?: string;
  rejection_timestamp?: string;
  rejection_read_by_dev?: boolean;
  rejection_updated_at?: string;
  has_new_attachments_for_pm?: boolean;
  has_new_attachments_for_dev?: boolean;
  last_attachment_by?: string;
  last_attachment_at?: string;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  assignee?: UserProfile;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  added_by?: string;
  added_at: string;
  user?: UserProfile;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  read_by: string[];
  author?: {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
  };
}

export interface ProjectCredential {
  id: string;
  project_id: string;
  name: string;
  service: string;
  username?: string;
  password_encrypted?: string;
  url?: string;
  notes?: string;
  visible_to_devs: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectFinance {
  id: string;
  project_id: string;
  total_value: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  amount: number;
  hosting_cost?: number;
  domain_cost?: number;
  other_cost?: number;
  other_cost_description?: string;
  payment_date: string;
  status: PaymentStatus;
  type: PaymentType;
  payment_method?: string;
  reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;
  deleted_reason?: string;
}

export interface ProjectCost {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  category?: string;
  cost_date: string;
  is_recurring: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringCharge {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  period: ChargeFrequency;
  custom_days?: number;
  start_date: string;
  next_due_date: string;
  last_payment_date?: string;
  is_active: boolean;
  type: RecurringChargeType;
  created_by?: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancelled_reason?: string;
  project?: Project;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  is_read: boolean;
  created_by?: string;
  created_at: string;
}

export interface AgentAction {
  id: string;
  user_id?: string;
  action_type: AgentActionType | string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
  task_id?: string;
  client_id?: string;
  payment_id?: string;
  recurring_charge_id?: string;
  input_text?: string;
  result?: Record<string, unknown>;
  status: AgentActionStatus;
  error_message?: string;
  created_at: string;
  user?: UserProfile;
  project?: Project;
  task?: Task;
  client?: Client;
  payment?: Payment;
  recurring_charge?: RecurringCharge;
}

export interface Reminder {
  id: string;
  user_id?: string;
  project_id?: string;
  task_id?: string;
  title: string;
  description?: string;
  remind_at: string;
  recurrence_rule?: string;
  priority: ReminderPriority;
  status: ReminderStatus;
  source: ReminderSource;
  notified_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  project?: Project;
  task?: Task;
  canceller?: UserProfile;
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>;
export type ProjectUpdate = Partial<ProjectInsert> & { id: string };
