import { parseLocalDate } from '../../app/utils/dateHelpers.js';
import type {
  AgentApiContext,
  AgentBriefData,
  FailedAgentActionItem,
  FinancialAgentActionItem,
  PaymentBriefItem,
  PendingTaskItem,
  RecurringChargeBriefItem,
  ReminderBriefItem,
} from './agentApiTypes.js';

const MAX_ITEMS = 5;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function endOfNext24Hours() {
  return new Date(Date.now() + DAY_IN_MS);
}

function isTaskOverdue(task: Pick<PendingTaskItem, 'due_date' | 'status'>) {
  if (!task.due_date || task.status === 'done' || task.status === 'archived') {
    return false;
  }

  const dueDate = parseLocalDate(task.due_date);
  const today = startOfToday();
  if (!dueDate) return false;

  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function normalizeBriefTask(task: any): PendingTaskItem {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    project_id: task.project?.id,
    project: task.project ? { id: task.project.id, name: task.project.name } : undefined,
    assignee: task.assignee ? { id: task.assignee.id, full_name: task.assignee.full_name } : undefined,
  };
}

function normalizeBriefReminder(reminder: any): ReminderBriefItem {
  return {
    id: reminder.id,
    title: reminder.title,
    status: reminder.status,
    priority: reminder.priority,
    remind_at: reminder.remind_at,
    source: reminder.source,
    project: reminder.project ? { id: reminder.project.id, name: reminder.project.name } : undefined,
    task: reminder.task ? { id: reminder.task.id, title: reminder.task.title } : undefined,
  };
}

function normalizePayment(payment: any): PaymentBriefItem {
  return {
    id: payment.id,
    amount: payment.amount,
    payment_date: payment.payment_date,
    status: payment.status,
    type: payment.type,
    reference: payment.reference,
    project_id: payment.project?.id,
    project: payment.project ? { id: payment.project.id, name: payment.project.name } : undefined,
  };
}

function normalizeRecurringCharge(charge: any): RecurringChargeBriefItem {
  return {
    id: charge.id,
    description: charge.description,
    amount: charge.amount,
    next_due_date: charge.next_due_date,
    type: charge.type,
    project_id: charge.project?.id,
    project: charge.project ? { id: charge.project.id, name: charge.project.name } : undefined,
  };
}

function normalizeFinancialAction(action: any): FinancialAgentActionItem {
  return {
    id: action.id,
    action_type: action.action_type,
    status: action.status,
    created_at: action.created_at,
    error_message: action.error_message,
    payment_id: action.payment_id,
    recurring_charge_id: action.recurring_charge_id,
    user: action.user ? { id: action.user.id, full_name: action.user.full_name } : undefined,
    project: action.project ? { id: action.project.id, name: action.project.name } : undefined,
  };
}

function normalizeFailedAction(action: any): FailedAgentActionItem {
  return {
    id: action.id,
    action_type: action.action_type,
    status: action.status,
    created_at: action.created_at,
    error_message: action.error_message,
    entity_type: action.entity_type,
    entity_id: action.entity_id,
    user: action.user ? { id: action.user.id, full_name: action.user.full_name } : undefined,
    project: action.project ? { id: action.project.id, name: action.project.name } : undefined,
  };
}

async function fetchTaskBrief(context: AgentApiContext) {
  if (context.userRole === 'advisor') {
    return {
      pendingTasksCount: 0,
      overdueTasksCount: 0,
      pendingTasks: [] as PendingTaskItem[],
      overdueTasks: [] as PendingTaskItem[],
    };
  }

  let query = context.supabaseClient
    .from('tasks')
    .select(
      'id, title, status, priority, due_date, assigned_to, project:projects(id, name), assignee:users_profiles!assigned_to(id, full_name)'
    )
    .neq('status', 'done')
    .neq('status', 'archived')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (context.userRole === 'dev') {
    query = query.eq('assigned_to', context.userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const tasks = (data ?? []).map(normalizeBriefTask);
  const pendingTasksAll = tasks.filter((task) => ['todo', 'in_progress', 'review'].includes(task.status));
  const overdueTasksAll = tasks.filter(isTaskOverdue);

  return {
    pendingTasksCount: pendingTasksAll.length,
    overdueTasksCount: overdueTasksAll.length,
    pendingTasks: pendingTasksAll.slice(0, MAX_ITEMS),
    overdueTasks: overdueTasksAll.slice(0, MAX_ITEMS),
  };
}

async function fetchReminderBrief(context: AgentApiContext) {
  const now = new Date();
  const next24Hours = endOfNext24Hours();

  const { data, error } = await context.supabaseClient
    .from('reminders')
    .select('id, title, status, priority, remind_at, source, project:projects(id, name), task:tasks(id, title)')
    .eq('status', 'pending')
    .order('remind_at', { ascending: true });

  if (error) throw error;

  const reminders = (data ?? []).map(normalizeBriefReminder);
  const upcoming24h = reminders.filter((reminder) => {
    const remindAt = new Date(reminder.remind_at);
    return remindAt >= now && remindAt <= next24Hours;
  });

  return {
    pendingRemindersCount: reminders.length,
    upcomingReminders24hCount: upcoming24h.length,
    upcomingReminders24h: upcoming24h.slice(0, MAX_ITEMS),
    upcomingGeneral: reminders.slice(0, MAX_ITEMS),
  };
}

async function fetchFinanceBrief(context: AgentApiContext, canSeeFinance: boolean) {
  if (!canSeeFinance) {
    return {
      pendingPaymentsCount: 0,
      overduePaymentsCount: 0,
      upcomingRecurringChargesCount: 0,
      overdueRecurringChargesCount: 0,
      pendingPayments: [] as PaymentBriefItem[],
      overduePayments: [] as PaymentBriefItem[],
      upcomingRecurringCharges: [] as RecurringChargeBriefItem[],
      overdueRecurringCharges: [] as RecurringChargeBriefItem[],
      recentFinancialActions: [] as FinancialAgentActionItem[],
    };
  }

  const today = startOfToday();
  const upcomingWindowEnd = new Date(today.getTime() + 7 * DAY_IN_MS);

  const [paymentsResult, recurringChargesResult, actionsResult] = await Promise.all([
    context.supabaseClient
      .from('payments')
      .select('id, amount, payment_date, status, type, reference, project:projects(id, name)')
      .in('status', ['pending', 'overdue'])
      .is('deleted_at', null)
      .order('payment_date', { ascending: true }),
    context.supabaseClient
      .from('recurring_charges')
      .select('id, description, amount, next_due_date, type, project:projects(id, name)')
      .eq('is_active', true)
      .is('cancelled_at', null)
      .order('next_due_date', { ascending: true }),
    context.supabaseClient
      .from('agent_actions')
      .select('id, action_type, status, created_at, error_message, payment_id, recurring_charge_id, user:users_profiles(id, full_name), project:projects(id, name)')
      .or('payment_id.not.is.null,recurring_charge_id.not.is.null')
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS),
  ]);

  if (paymentsResult.error) throw paymentsResult.error;
  if (recurringChargesResult.error) throw recurringChargesResult.error;
  if (actionsResult.error) throw actionsResult.error;

  const payments = (paymentsResult.data ?? []).map(normalizePayment);
  const pendingPaymentsAll = payments.filter((payment) => payment.status === 'pending');
  const overduePaymentsAll = payments.filter((payment) => payment.status === 'overdue');

  const charges = (recurringChargesResult.data ?? []).map(normalizeRecurringCharge);
  const upcomingRecurringChargesAll = charges.filter((charge) => {
    const nextDueDate = parseLocalDate(charge.next_due_date);
    if (!nextDueDate) return false;
    nextDueDate.setHours(0, 0, 0, 0);
    return nextDueDate >= today && nextDueDate <= upcomingWindowEnd;
  });

  const overdueRecurringChargesAll = charges.filter((charge) => {
    const nextDueDate = parseLocalDate(charge.next_due_date);
    if (!nextDueDate) return false;
    nextDueDate.setHours(0, 0, 0, 0);
    return nextDueDate < today;
  });

  return {
    pendingPaymentsCount: pendingPaymentsAll.length,
    overduePaymentsCount: overduePaymentsAll.length,
    upcomingRecurringChargesCount: upcomingRecurringChargesAll.length,
    overdueRecurringChargesCount: overdueRecurringChargesAll.length,
    pendingPayments: pendingPaymentsAll.slice(0, MAX_ITEMS),
    overduePayments: overduePaymentsAll.slice(0, MAX_ITEMS),
    upcomingRecurringCharges: upcomingRecurringChargesAll.slice(0, MAX_ITEMS),
    overdueRecurringCharges: overdueRecurringChargesAll.slice(0, MAX_ITEMS),
    recentFinancialActions: (actionsResult.data ?? []).map(normalizeFinancialAction).slice(0, MAX_ITEMS),
  };
}

async function fetchRecentFailedActions(context: AgentApiContext) {
  const { data, error } = await context.supabaseClient
    .from('agent_actions')
    .select(
      'id, action_type, status, created_at, error_message, entity_type, entity_id, user:users_profiles(id, full_name), project:projects(id, name)'
    )
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(MAX_ITEMS);

  if (error) throw error;

  return (data ?? []).map(normalizeFailedAction);
}

export async function getDailyBrief(context: AgentApiContext): Promise<AgentBriefData> {
  const canSeeFinance = ['admin', 'advisor'].includes(context.userRole);
  const showTasks = context.userRole !== 'advisor';

  const [taskBrief, reminderBrief, financeBrief, recentFailed] = await Promise.all([
    fetchTaskBrief(context),
    fetchReminderBrief(context),
    fetchFinanceBrief(context, canSeeFinance),
    fetchRecentFailedActions(context),
  ]);

  return {
    role: context.userRole,
    canSeeFinance,
    showTasks,
    stats: {
      pendingTasks: taskBrief.pendingTasksCount,
      overdueTasks: taskBrief.overdueTasksCount,
      pendingReminders: reminderBrief.pendingRemindersCount,
      upcomingReminders24h: reminderBrief.upcomingReminders24hCount,
      pendingPayments: financeBrief.pendingPaymentsCount,
      overduePayments: financeBrief.overduePaymentsCount,
      upcomingRecurringCharges: financeBrief.upcomingRecurringChargesCount,
      overdueRecurringCharges: financeBrief.overdueRecurringChargesCount,
    },
    tasks: {
      pending: taskBrief.pendingTasks,
      overdue: taskBrief.overdueTasks,
    },
    reminders: {
      upcoming24h: reminderBrief.upcomingReminders24h,
      upcomingGeneral: reminderBrief.upcomingGeneral,
    },
    finances: {
      pendingPayments: financeBrief.pendingPayments,
      overduePayments: financeBrief.overduePayments,
      upcomingRecurringCharges: financeBrief.upcomingRecurringCharges,
      overdueRecurringCharges: financeBrief.overdueRecurringCharges,
    },
    actions: {
      recentFinancial: financeBrief.recentFinancialActions,
      recentFailed,
    },
  };
}
