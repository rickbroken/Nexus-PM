import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Alert from '@/lib/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type TaskPriority } from '@/lib/supabase';
import {
  cancelReminder,
  completeReminder,
  createReminder,
  createTask,
  getDailyBrief,
  getPendingTasks,
  logAgentAction,
  postponeReminder,
  tryLogAgentFailure,
  updateTaskStatus,
} from '@/lib/agent-api';

const MAX_LIST_ITEMS = 5;

export type AgentCommandIntent =
  | 'create_reminder'
  | 'complete_reminder'
  | 'create_task'
  | 'update_task_status'
  | 'review_task'
  | 'postpone_reminder'
  | 'cancel_reminder'
  | 'get_pending_tasks'
  | 'get_daily_brief';

export type AgentCommandData = {
  pendingTasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string;
    projectName?: string;
  }>;
  overdueTasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string;
    projectName?: string;
  }>;
  upcomingReminders?: Array<{
    id: string;
    title: string;
    priority?: string;
    remindAt: string;
    projectName?: string;
  }>;
  pendingPayments?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    projectName?: string;
  }>;
  overduePayments?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    projectName?: string;
  }>;
  upcomingRecurringCharges?: Array<{
    id: string;
    description: string;
    amount: number;
    nextDueDate: string;
    projectName?: string;
  }>;
  overdueRecurringCharges?: Array<{
    id: string;
    description: string;
    amount: number;
    nextDueDate: string;
    projectName?: string;
  }>;
};

export type AgentCommandOption = {
  key: string;
  action: AgentCommandIntent;
  entityType: 'reminder' | 'task' | 'project';
  id: string;
  label: string;
  description?: string;
  priority?: TaskPriority;
  remindAt?: string;
  projectId?: string;
  taskId?: string;
  reminderId?: string;
  taskTitle?: string;
  reviewStatus?: 'pending';
  withoutProject?: boolean;
};

export type AgentCommandAmbiguity = {
  entityType: AgentCommandOption['entityType'];
  options: AgentCommandOption[];
};

export type AgentCommandResult = {
  status: 'success' | 'error' | 'ambiguity' | 'unsupported';
  message: string;
  action?: AgentCommandIntent;
  options?: AgentCommandOption[];
  ambiguity?: AgentCommandAmbiguity;
  executedEntity?: {
    type: 'reminder' | 'task';
    id: string;
  };
  data?: AgentCommandData;
};

type ExecuteAgentCommandInput = {
  command: string;
};

type ResolveAgentCommandOptionInput = {
  command: string;
  option: AgentCommandOption;
};

type ProjectCandidate = {
  id: string;
  name: string;
};

type TaskCandidate = {
  id: string;
  title: string;
  project_id?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  assigned_to?: string;
  project?: {
    name?: string;
  } | null;
};

type ReminderCandidate = {
  id: string;
  title: string;
  project_id?: string;
  task_id?: string;
  priority?: string;
  remind_at?: string;
  project?: {
    name?: string;
  } | null;
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Error desconocido');
  }
  return 'Error desconocido';
}

function normalizeDateTimeToIso(value: Date) {
  return value.toISOString();
}

function buildRelativeDate(token: 'hoy' | 'mañana' | 'pasado mañana') {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (token === 'hoy') {
    date.setHours(18, 0, 0, 0);
    return normalizeDateTimeToIso(date);
  }

  if (token === 'mañana') {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    return normalizeDateTimeToIso(date);
  }

  date.setDate(date.getDate() + 2);
  date.setHours(9, 0, 0, 0);
  return normalizeDateTimeToIso(date);
}

function parseReminderDate(command: string) {
  const normalized = normalizeText(command);

  if (normalized.includes('pasado manana')) {
    return {
      token: 'pasado mañana' as const,
      remindAt: buildRelativeDate('pasado mañana'),
    };
  }

  if (normalized.includes('manana')) {
    return {
      token: 'mañana' as const,
      remindAt: buildRelativeDate('mañana'),
    };
  }

  if (normalized.includes('hoy')) {
    return {
      token: 'hoy' as const,
      remindAt: buildRelativeDate('hoy'),
    };
  }

  return null;
}

function matchByTitle<T extends { title: string }>(items: T[], rawQuery: string) {
  const query = normalizeText(rawQuery);

  return items.filter((item) => {
    const title = normalizeText(item.title);
    return title.includes(query) || query.includes(title);
  });
}

function buildProjectCandidates(projects: ProjectCandidate[], tail: string) {
  const normalizedTail = normalizeText(tail);
  const candidates = projects
    .map((project) => ({
      project,
      normalizedName: normalizeText(project.name),
    }))
    .filter(
      ({ normalizedName }) =>
        normalizedTail === normalizedName || normalizedTail.startsWith(`${normalizedName} `)
    )
    .map(({ project, normalizedName }) => {
      const title = tail.slice(project.name.length).trim();
      return {
        project,
        title,
        score: normalizedName.length,
      };
    })
    .filter((candidate) => candidate.title.length > 0);

  if (candidates.length === 0) {
    return [];
  }

  const maxScore = Math.max(...candidates.map((candidate) => candidate.score));
  return candidates.filter((candidate) => candidate.score === maxScore);
}

function detectProjectsInText(projects: ProjectCandidate[], text: string) {
  const normalizedText = normalizeText(text);
  return projects
    .map((project) => ({
      project,
      normalizedName: normalizeText(project.name),
    }))
    .filter(({ normalizedName }) => normalizedText.includes(normalizedName))
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length);
}

function getTaskPriorityToken(command: string) {
  const match = normalizeText(command).match(
    /^(crea tarea|crear tarea)\s+(urgente|alta|media|baja)\b/
  );
  if (!match) return null;

  const token = match[2];
  const priorityMap: Record<string, TaskPriority> = {
    baja: 'low',
    media: 'medium',
    alta: 'high',
    urgente: 'urgent',
  };

  return priorityMap[token] ?? null;
}

function detectIntent(command: string): AgentCommandIntent | null {
  const normalized = normalizeText(command);

  if (
    normalized === 'resumen de hoy' ||
    normalized === 'que tengo para hoy' ||
    normalized === 'que debo revisar hoy'
  ) {
    return 'get_daily_brief';
  }

  if (
    normalized === 'que tareas tengo pendientes' ||
    normalized === 'mostrar tareas pendientes' ||
    normalized === 'ver tareas pendientes'
  ) {
    return 'get_pending_tasks';
  }

  if (/^(recuerdame|recordarme)\b/.test(normalized)) {
    return 'create_reminder';
  }

  if (
    normalized.startsWith('posponer recordatorio') ||
    normalized.startsWith('pospone el recordatorio') ||
    normalized.startsWith('posponer el recordatorio')
  ) {
    return 'postpone_reminder';
  }

  if (
    normalized.startsWith('cancelar recordatorio') ||
    normalized.startsWith('cancela el recordatorio') ||
    normalized.startsWith('cancelar el recordatorio')
  ) {
    return 'cancel_reminder';
  }

  if (
    normalized.startsWith('completa el recordatorio') ||
    normalized.startsWith('completar el recordatorio') ||
    normalized.startsWith('marcar como completado el recordatorio')
  ) {
    return 'complete_reminder';
  }

  if (
    normalized.startsWith('envia la tarea') ||
    normalized.startsWith('envia tarea') ||
    normalized.startsWith('mandar tarea') ||
    normalized.startsWith('poner tarea')
  ) {
    if (normalized.endsWith('a revision') || normalized.endsWith('en revision')) {
      return 'review_task';
    }
  }

  if (/^(crea tarea|crear tarea)\b/.test(normalized)) {
    return 'create_task';
  }

  if (
    normalized.startsWith('marca la tarea') ||
    normalized.startsWith('marcar la tarea') ||
    normalized.startsWith('poner tarea')
  ) {
    return 'update_task_status';
  }

  return null;
}

function isWriteIntent(intent?: AgentCommandIntent) {
  return !intent || !['get_pending_tasks', 'get_daily_brief'].includes(intent);
}

export function useAgentCommand() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateRelevantQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['agent-brief'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['reminders'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['agent-actions'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false }),
    ]);
  };

  const getContext = () => {
    if (!user?.id) {
      throw new Error('No hay usuario autenticado');
    }

    return {
      supabaseClient: supabase,
      userId: user.id,
      userRole: user.role,
    } as const;
  };

  const fetchVisibleProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true })
      .limit(100);

    if (error) throw error;
    return (data ?? []) as ProjectCandidate[];
  };

  const fetchVisibleTasks = async (limit = 30) => {
    let query = supabase
      .from('tasks')
      .select('id, title, project_id, priority, status, due_date, assigned_to, project:projects(name)')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (user?.role === 'dev') {
      query = query.eq('assigned_to', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TaskCandidate[];
  };

  const fetchPendingReminders = async (limit = 25) => {
    const { data, error } = await supabase
      .from('reminders')
      .select('id, title, project_id, task_id, priority, remind_at, project:projects(name)')
      .eq('status', 'pending')
      .eq('user_id', user?.id ?? '')
      .order('remind_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as ReminderCandidate[];
  };

  const mapBriefToCommandData = (brief: AgentBriefData): AgentCommandData => ({
    pendingTasks:
      brief.tasks.pending.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        projectName: task.project?.name,
      })) ?? [],
    overdueTasks:
      brief.tasks.overdue.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        projectName: task.project?.name,
      })) ?? [],
    upcomingReminders:
      brief.reminders.upcoming24h.map((reminder) => ({
        id: reminder.id,
        title: reminder.title,
        priority: reminder.priority,
        remindAt: reminder.remind_at,
        projectName: reminder.project?.name,
      })) ?? [],
    pendingPayments:
      brief.finances.pendingPayments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        projectName: payment.project?.name,
      })) ?? [],
    overduePayments:
      brief.finances.overduePayments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        projectName: payment.project?.name,
      })) ?? [],
    upcomingRecurringCharges:
      brief.finances.upcomingRecurringCharges.map((charge) => ({
        id: charge.id,
        description: charge.description,
        amount: charge.amount,
        nextDueDate: charge.next_due_date,
        projectName: charge.project?.name,
      })) ?? [],
    overdueRecurringCharges:
      brief.finances.overdueRecurringCharges.map((charge) => ({
        id: charge.id,
        description: charge.description,
        amount: charge.amount,
        nextDueDate: charge.next_due_date,
        projectName: charge.project?.name,
      })) ?? [],
  });

  const createReminderRecord = async ({
    title,
    remindAt,
    command,
    projectId,
  }: {
    title: string;
    remindAt: string;
    command: string;
    projectId?: string;
  }) => {
    const data = await createReminder(
      getContext(),
      {
        title,
        remind_at: remindAt,
        project_id: projectId ?? null,
        source: 'agent',
      },
      {
        enabled: true,
        action_type: 'create_reminder',
        entity_type: 'reminder',
        project_id: projectId,
        input_text: command,
      }
    );

    return {
      status: 'success',
      message: 'Recordatorio creado correctamente.',
      action: 'create_reminder',
      executedEntity: {
        type: 'reminder',
        id: data.id,
      },
    } as AgentCommandResult;
  };

  const completeReminderById = async (reminderId: string, command: string) => {
    const data = await completeReminder(
      getContext(),
      { reminder_id: reminderId },
      {
        enabled: true,
        action_type: 'update_reminder',
        entity_type: 'reminder',
        entity_id: reminderId,
        input_text: command,
      }
    );

    return {
      status: 'success',
      message: 'Recordatorio completado correctamente.',
      action: 'complete_reminder',
      executedEntity: {
        type: 'reminder',
        id: data.id,
      },
    } as AgentCommandResult;
  };

  const cancelReminderById = async (reminderId: string, command: string) => {
    const data = await cancelReminder(
      getContext(),
      { reminder_id: reminderId },
      {
        enabled: true,
        action_type: 'cancel_reminder',
        entity_type: 'reminder',
        entity_id: reminderId,
        input_text: command,
      }
    );

    return {
      status: 'success',
      message: 'Recordatorio cancelado correctamente.',
      action: 'cancel_reminder',
      executedEntity: {
        type: 'reminder',
        id: data.id,
      },
    } as AgentCommandResult;
  };

  const postponeReminderById = async (
    reminderId: string,
    remindAt: string,
    command: string
  ) => {
    const data = await postponeReminder(
      getContext(),
      { reminder_id: reminderId, remind_at: remindAt },
      {
        enabled: true,
        action_type: 'update_reminder',
        entity_type: 'reminder',
        entity_id: reminderId,
        input_text: command,
      }
    );

    return {
      status: 'success',
      message: 'Recordatorio pospuesto correctamente.',
      action: 'postpone_reminder',
      executedEntity: {
        type: 'reminder',
        id: data.id,
      },
    } as AgentCommandResult;
  };

  const updateTaskStatusById = async ({
    taskId,
    projectId,
    command,
    status,
    reviewStatus,
    intent,
    successMessage,
  }: {
    taskId: string;
    projectId?: string;
    command: string;
    status: 'in_progress' | 'review';
    reviewStatus?: 'pending';
    intent: AgentCommandIntent;
    successMessage: string;
  }) => {
    const data = await updateTaskStatus(
      getContext(),
      {
        task_id: taskId,
        project_id: projectId ?? null,
        status,
        review_status: reviewStatus ?? null,
      },
      {
        enabled: true,
        action_type: 'update_task_status',
        entity_type: 'task',
        entity_id: taskId,
        project_id: projectId,
        task_id: taskId,
        input_text: command,
      }
    );

    return {
      status: 'success',
      message: successMessage,
      action: intent,
      executedEntity: {
        type: 'task',
        id: data.id,
      },
    } as AgentCommandResult;
  };

  const createTaskInProject = async ({
    projectId,
    title,
    priority,
    command,
  }: {
    projectId: string;
    title: string;
    priority: TaskPriority;
    command: string;
  }) => {
    const data = await createTask(
      getContext(),
      {
        project_id: projectId,
        title,
        priority,
      },
      {
        enabled: true,
        action_type: 'create_task',
        entity_type: 'task',
        project_id: projectId,
        input_text: command,
      }
    );

    return {
      status: 'success',
      message: 'Tarea creada correctamente.',
      action: 'create_task',
      executedEntity: {
        type: 'task',
        id: data.id,
      },
    } as AgentCommandResult;
  };

  const buildTaskStatusOptions = (
    tasks: TaskCandidate[],
    action: AgentCommandIntent,
    descriptionFallback: string
  ) => {
    return tasks.map((task) => ({
      key: `${action}:${task.id}`,
      action,
      entityType: 'task' as const,
      id: task.id,
      taskId: task.id,
      projectId: task.project_id,
      label: task.title,
      description: task.project?.name ? `Proyecto: ${task.project.name}` : descriptionFallback,
    }));
  };

  const getPendingTasksResult = async (command: string) => {
    const tasks = await getPendingTasks(getContext(), { limit: MAX_LIST_ITEMS });
    const pendingTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      projectName: task.project?.name,
    }));

    await logAgentAction(getContext(), {
      action_type: 'get_pending_tasks',
      entity_type: 'agent',
      input_text: command,
      result: { count: pendingTasks.length },
      status: 'success',
    });

    return {
      status: 'success',
      message:
        pendingTasks.length > 0
          ? `Encontré ${pendingTasks.length} tareas pendientes visibles.`
          : 'No tienes tareas pendientes visibles.',
      action: 'get_pending_tasks',
      data: {
        pendingTasks,
      },
    } as AgentCommandResult;
  };

  const getDailyBriefResult = async (command: string) => {
    const brief = await getDailyBrief(getContext());

    await logAgentAction(getContext(), {
      action_type: 'get_daily_brief',
      entity_type: 'agent',
      input_text: command,
      result: {
        pending_tasks: brief.tasks.pending.length,
        overdue_tasks: brief.tasks.overdue.length,
        upcoming_reminders: brief.reminders.upcoming24h.length,
      },
      status: 'success',
    });

    return {
      status: 'success',
      message: 'Resumen de hoy generado correctamente.',
      action: 'get_daily_brief',
      data: mapBriefToCommandData(brief),
    } as AgentCommandResult;
  };

  const executeCommandInternal = async (command: string): Promise<AgentCommandResult> => {
    if (!user?.id) {
      return {
        status: 'error',
        message: 'No hay usuario autenticado.',
      };
    }

    const trimmedCommand = command.trim();

    if (!trimmedCommand) {
      return {
        status: 'error',
        message: 'Escribe un comando antes de ejecutar.',
      };
    }

    const intent = detectIntent(trimmedCommand);

    if (!intent) {
      return {
        status: 'unsupported',
        message: 'No entendí ese comando todavía.',
      };
    }

    try {
      if (intent === 'get_pending_tasks') {
        return await getPendingTasksResult(trimmedCommand);
      }

      if (intent === 'get_daily_brief') {
        return await getDailyBriefResult(trimmedCommand);
      }

      if (intent === 'create_reminder') {
        const match = trimmedCommand.match(
          /^\s*(recu[eé]rdame|recordarme)\s+(.+?)\s+(pasado\s+ma[nñ]ana|ma[nñ]ana|hoy)\s*$/i
        );

        if (!match) {
          const parsedDate = parseReminderDate(trimmedCommand);
          if (!parsedDate) {
            return {
              status: 'error',
              message: 'Agrega una fecha: hoy, mañana o pasado mañana.',
              action: 'create_reminder',
            };
          }

          return {
            status: 'error',
            message:
              'No pude interpretar el recordatorio. Usa un formato como "recuérdame revisar pagos mañana".',
            action: 'create_reminder',
          };
        }

        const title = match[2].trim();
        const parsedDate = parseReminderDate(match[3]);

        if (!parsedDate) {
          return {
            status: 'error',
            message: 'Agrega una fecha: hoy, mañana o pasado mañana.',
            action: 'create_reminder',
          };
        }

        const projects = await fetchVisibleProjects();
        const projectMatches = detectProjectsInText(projects, title);

        if (projectMatches.length > 1) {
          const options: AgentCommandOption[] = projectMatches.map(({ project }) => ({
            key: `create_reminder:${project.id}`,
            action: 'create_reminder',
            entityType: 'project',
            id: project.id,
            projectId: project.id,
            remindAt: parsedDate.remindAt,
            label: `Asociar a ${project.name}`,
            description: title,
          }));

          options.push({
            key: 'create_reminder:without-project',
            action: 'create_reminder',
            entityType: 'project',
            id: 'without-project',
            remindAt: parsedDate.remindAt,
            taskTitle: title,
            withoutProject: true,
            label: 'Crear sin proyecto',
            description: title,
          });

          return {
            status: 'ambiguity',
            message: 'Encontré varios proyectos. Selecciona uno o crea el recordatorio sin proyecto.',
            action: 'create_reminder',
            options,
            ambiguity: {
              entityType: 'project',
              options,
            },
          };
        }

        const selectedProjectId =
          projectMatches.length === 1 ? projectMatches[0].project.id : undefined;
        return await createReminderRecord({
          title,
          remindAt: parsedDate.remindAt,
          command: trimmedCommand,
          projectId: selectedProjectId,
        });
      }

      if (intent === 'complete_reminder' || intent === 'cancel_reminder') {
        const normalized = normalizeText(trimmedCommand);
        const queryText = normalized
          .replace(/^completa(r)? el recordatorio( de)?\s+/, '')
          .replace(/^marcar como completado el recordatorio( de)?\s+/, '')
          .replace(/^cancelar el recordatorio( de)?\s+/, '')
          .replace(/^cancelar recordatorio( de)?\s+/, '')
          .replace(/^cancela el recordatorio( de)?\s+/, '')
          .trim();

        if (!queryText) {
          return {
            status: 'error',
            message:
              intent === 'cancel_reminder'
                ? 'Indica qué recordatorio quieres cancelar.'
                : 'Indica qué recordatorio quieres completar.',
            action: intent,
          };
        }

        const reminders = await fetchPendingReminders();
        const matches = matchByTitle(reminders, queryText);

        if (matches.length === 0) {
          return {
            status: 'error',
            message: 'No encontré ese recordatorio.',
            action: intent,
          };
        }

        if (matches.length > 1) {
          const options: AgentCommandOption[] = matches.map((reminder) => ({
            key: `${intent}:${reminder.id}`,
            action: intent,
            entityType: 'reminder',
            id: reminder.id,
            reminderId: reminder.id,
            label: reminder.title,
            description: reminder.project?.name
              ? `Proyecto: ${reminder.project.name}`
              : 'Recordatorio pendiente',
          }));

          return {
            status: 'ambiguity',
            message: 'Encontré varios recordatorios. Selecciona uno.',
            action: intent,
            options,
            ambiguity: {
              entityType: 'reminder',
              options,
            },
          };
        }

        return intent === 'cancel_reminder'
          ? await cancelReminderById(matches[0].id, trimmedCommand)
          : await completeReminderById(matches[0].id, trimmedCommand);
      }

      if (intent === 'postpone_reminder') {
        const match = trimmedCommand.match(
          /^\s*(posponer|pospone)\s+(el\s+)?recordatorio\s+de\s+(.+?)\s+para\s+(pasado\s+ma[nñ]ana|ma[nñ]ana|hoy)\s*$/i
        );

        if (!match) {
          return {
            status: 'error',
            message:
              'No pude interpretar el recordatorio. Usa un formato como "posponer recordatorio de pagos para mañana".',
            action: 'postpone_reminder',
          };
        }

        const queryText = match[3].trim();
        const parsedDate = parseReminderDate(match[4]);

        if (!parsedDate) {
          return {
            status: 'error',
            message: 'Agrega una fecha: hoy, mañana o pasado mañana.',
            action: 'postpone_reminder',
          };
        }

        const reminders = await fetchPendingReminders();
        const matches = matchByTitle(reminders, queryText);

        if (matches.length === 0) {
          return {
            status: 'error',
            message: 'No encontré ese recordatorio.',
            action: 'postpone_reminder',
          };
        }

        if (matches.length > 1) {
          const options: AgentCommandOption[] = matches.map((reminder) => ({
            key: `postpone_reminder:${reminder.id}`,
            action: 'postpone_reminder',
            entityType: 'reminder',
            id: reminder.id,
            reminderId: reminder.id,
            remindAt: parsedDate.remindAt,
            label: reminder.title,
            description: reminder.project?.name
              ? `Proyecto: ${reminder.project.name}`
              : 'Recordatorio pendiente',
          }));

          return {
            status: 'ambiguity',
            message: 'Encontré varios recordatorios. Selecciona uno.',
            action: 'postpone_reminder',
            options,
            ambiguity: {
              entityType: 'reminder',
              options,
            },
          };
        }

        return await postponeReminderById(matches[0].id, parsedDate.remindAt, trimmedCommand);
      }

      if (intent === 'create_task') {
        const match = trimmedCommand.match(
          /^\s*(crea tarea|crear tarea)(?:\s+(urgente|alta|media|baja))?\s+(en|para)\s+(.+)\s*$/i
        );

        if (!match) {
          return {
            status: 'error',
            message:
              'No pude interpretar la tarea. Usa un formato como "crear tarea urgente en TargerMats arreglar login".',
            action: 'create_task',
          };
        }

        const priority = getTaskPriorityToken(trimmedCommand) ?? 'medium';
        const tail = match[4].trim();
        const projects = await fetchVisibleProjects();
        const candidates = buildProjectCandidates(projects, tail);

        if (candidates.length === 0) {
          return {
            status: 'error',
            message: 'No encontré ese proyecto.',
            action: 'create_task',
          };
        }

        if (candidates.length > 1) {
          const options: AgentCommandOption[] = candidates.map((candidate) => ({
            key: `create_task:${candidate.project.id}`,
            action: 'create_task',
            entityType: 'project',
            id: candidate.project.id,
            projectId: candidate.project.id,
            taskTitle: candidate.title,
            priority,
            label: candidate.project.name,
            description: `Crear tarea: ${candidate.title}`,
          }));

          return {
            status: 'ambiguity',
            message: 'Encontré varios proyectos. Selecciona uno.',
            action: 'create_task',
            options,
            ambiguity: {
              entityType: 'project',
              options,
            },
          };
        }

        const selected = candidates[0];
        return await createTaskInProject({
          projectId: selected.project.id,
          title: selected.title,
          priority,
          command: trimmedCommand,
        });
      }

      const tasks = await fetchVisibleTasks();
      const normalized = normalizeText(trimmedCommand);
      const isReviewIntent = intent === 'review_task';
      const queryText = normalized
        .replace(/^marca(r)? la tarea\s+/, '')
        .replace(/^marcar la tarea\s+/, '')
        .replace(/^envia la tarea\s+/, '')
        .replace(/^envia tarea\s+/, '')
        .replace(/^mandar tarea\s+/, '')
        .replace(/^poner tarea\s+/, '')
        .replace(/\s+como en progreso$/, '')
        .replace(/\s+en progreso$/, '')
        .replace(/\s+a revision$/, '')
        .replace(/\s+en revision$/, '')
        .trim();

      if (!queryText) {
        return {
          status: 'error',
          message: isReviewIntent
            ? 'Indica qué tarea quieres enviar a revisión.'
            : 'Indica qué tarea quieres poner en progreso.',
          action: intent,
        };
      }

      const matches = matchByTitle(tasks, queryText);

      if (matches.length === 0) {
        return {
          status: 'error',
          message: 'No encontré esa tarea.',
          action: intent,
        };
      }

      if (matches.length > 1) {
        const options = buildTaskStatusOptions(
          matches,
          intent,
          isReviewIntent ? 'Tarea visible para revisión' : 'Tarea visible'
        );

        return {
          status: 'ambiguity',
          message: 'Encontré varias tareas. Selecciona una.',
          action: intent,
          options,
          ambiguity: {
            entityType: 'task',
            options,
          },
        };
      }

      return await updateTaskStatusById({
        taskId: matches[0].id,
        projectId: matches[0].project_id,
        command: trimmedCommand,
        status: isReviewIntent ? 'review' : 'in_progress',
        reviewStatus: isReviewIntent ? 'pending' : undefined,
        intent,
        successMessage: isReviewIntent
          ? 'Tarea enviada a revisión correctamente.'
          : 'Tarea marcada en progreso correctamente.',
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      await tryLogAgentFailure(getContext(), {
        action_type:
          intent === 'create_task'
            ? 'create_task'
            : intent === 'complete_reminder' || intent === 'postpone_reminder'
              ? 'update_reminder'
              : intent === 'cancel_reminder'
                ? 'cancel_reminder'
                : intent === 'update_task_status' || intent === 'review_task'
                  ? 'update_task_status'
                  : intent === 'get_pending_tasks'
                    ? 'get_pending_tasks'
                    : intent === 'get_daily_brief'
                      ? 'get_daily_brief'
                      : 'create_reminder',
        entity_type:
          intent === 'create_reminder' ||
          intent === 'complete_reminder' ||
          intent === 'postpone_reminder' ||
          intent === 'cancel_reminder'
            ? 'reminder'
            : intent === 'create_task' || intent === 'update_task_status' || intent === 'review_task'
              ? 'task'
              : 'agent',
        input_text: trimmedCommand,
        error_message: errorMessage,
      });

      return {
        status: 'error',
        message: errorMessage,
        action: intent,
      };
    }
  };

  const resolveOptionInternal = async (
    input: ResolveAgentCommandOptionInput
  ): Promise<AgentCommandResult> => {
    if (input.option.action === 'complete_reminder' && input.option.reminderId) {
      return completeReminderById(input.option.reminderId, input.command);
    }

    if (input.option.action === 'cancel_reminder' && input.option.reminderId) {
      return cancelReminderById(input.option.reminderId, input.command);
    }

    if (
      input.option.action === 'postpone_reminder' &&
      input.option.reminderId &&
      input.option.remindAt
    ) {
      return postponeReminderById(input.option.reminderId, input.option.remindAt, input.command);
    }

    if (
      (input.option.action === 'update_task_status' || input.option.action === 'review_task') &&
      input.option.taskId
    ) {
      return updateTaskStatusById({
        taskId: input.option.taskId,
        projectId: input.option.projectId,
        command: input.command,
        status: input.option.action === 'review_task' ? 'review' : 'in_progress',
        reviewStatus: input.option.action === 'review_task' ? 'pending' : undefined,
        intent: input.option.action,
        successMessage:
          input.option.action === 'review_task'
            ? 'Tarea enviada a revisión correctamente.'
            : 'Tarea marcada en progreso correctamente.',
      });
    }

    if (input.option.action === 'create_task' && input.option.projectId && input.option.taskTitle) {
      return createTaskInProject({
        projectId: input.option.projectId,
        title: input.option.taskTitle,
        priority: input.option.priority ?? 'medium',
        command: input.command,
      });
    }

    if (
      input.option.action === 'create_reminder' &&
      input.option.remindAt &&
      input.option.description
    ) {
      return createReminderRecord({
        title: input.option.description,
        remindAt: input.option.remindAt,
        command: input.command,
        projectId: input.option.withoutProject ? undefined : input.option.projectId,
      });
    }

    return {
      status: 'error',
      message: 'No pude resolver esa opción.',
      action: input.option.action,
    };
  };

  const executeCommand = useMutation({
    mutationFn: async ({ command }: ExecuteAgentCommandInput) => {
      const result = await executeCommandInternal(command);
      if (result.status === 'success' && isWriteIntent(result.action)) {
        await invalidateRelevantQueries();
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.status === 'success') {
        toast.success(result.message);
      } else if (result.status === 'error') {
        Alert.error('Error', result.message);
      }
    },
    onError: (error: unknown) => {
      Alert.error('Error', getErrorMessage(error));
    },
  });

  const resolveOption = useMutation({
    mutationFn: async (input: ResolveAgentCommandOptionInput) => {
      const result = await resolveOptionInternal(input);
      if (result.status === 'success' && isWriteIntent(result.action)) {
        await invalidateRelevantQueries();
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.status === 'success') {
        toast.success(result.message);
      } else if (result.status === 'error') {
        Alert.error('Error', result.message);
      }
    },
    onError: (error: unknown) => {
      Alert.error('Error', getErrorMessage(error));
    },
  });

  return {
    executeCommand,
    resolveOption,
    isPending: executeCommand.isPending || resolveOption.isPending,
  };
}
