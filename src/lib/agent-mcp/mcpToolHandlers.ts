import {
  cancelReminder,
  completeReminder,
  createReminder,
  createTask,
  getDailyBrief,
  getPendingTasks,
  postponeReminder,
  updateTaskStatus,
  type AgentApiContext,
} from '../agent-api/index.js';
import {
  cancelReminderToolSchema,
  completeReminderToolSchema,
  createReminderToolSchema,
  createTaskToolSchema,
  getDailyBriefSchema,
  getPendingTasksSchema,
  postponeReminderToolSchema,
  updateTaskStatusToolSchema,
} from './mcpToolSchemas.js';

export type McpToolHandlerInput = {
  context: AgentApiContext;
  input: unknown;
};

export async function handleGetDailyBriefTool({ context, input }: McpToolHandlerInput) {
  getDailyBriefSchema.parse(input ?? {});

  return getDailyBrief(context);
}

export async function handleGetPendingTasksTool({ context, input }: McpToolHandlerInput) {
  const parsed = getPendingTasksSchema.parse(input ?? {});

  return getPendingTasks(context, {
    limit: parsed.limit,
  });
}

export async function handleCreateReminderTool({ context, input }: McpToolHandlerInput) {
  const parsed = createReminderToolSchema.parse(input);

  return createReminder(
    context,
    {
      ...parsed,
      source: 'agent',
    },
    {
      enabled: true,
      action_type: 'nexus_create_reminder',
      entity_type: 'reminder',
      project_id: parsed.project_id ?? undefined,
      task_id: parsed.task_id ?? undefined,
      input_text: 'mcp:nexus_create_reminder',
    }
  );
}

export async function handleCompleteReminderTool({ context, input }: McpToolHandlerInput) {
  const parsed = completeReminderToolSchema.parse(input);

  return completeReminder(context, parsed, {
    enabled: true,
    action_type: 'nexus_complete_reminder',
    entity_type: 'reminder',
    entity_id: parsed.reminder_id,
    input_text: 'mcp:nexus_complete_reminder',
  });
}

export async function handleCancelReminderTool({ context, input }: McpToolHandlerInput) {
  const parsed = cancelReminderToolSchema.parse(input);

  return cancelReminder(context, parsed, {
    enabled: true,
    action_type: 'nexus_cancel_reminder',
    entity_type: 'reminder',
    entity_id: parsed.reminder_id,
    input_text: 'mcp:nexus_cancel_reminder',
  });
}

export async function handlePostponeReminderTool({ context, input }: McpToolHandlerInput) {
  const parsed = postponeReminderToolSchema.parse(input);

  return postponeReminder(context, parsed, {
    enabled: true,
    action_type: 'nexus_postpone_reminder',
    entity_type: 'reminder',
    entity_id: parsed.reminder_id,
    input_text: 'mcp:nexus_postpone_reminder',
  });
}

export async function handleCreateTaskTool({ context, input }: McpToolHandlerInput) {
  const parsed = createTaskToolSchema.parse(input);

  return createTask(context, parsed, {
    enabled: true,
    action_type: 'nexus_create_task',
    entity_type: 'task',
    project_id: parsed.project_id,
    input_text: 'mcp:nexus_create_task',
  });
}

export async function handleUpdateTaskStatusTool({ context, input }: McpToolHandlerInput) {
  const parsed = updateTaskStatusToolSchema.parse(input);

  return updateTaskStatus(context, parsed, {
    enabled: true,
    action_type: 'nexus_update_task_status',
    entity_type: 'task',
    entity_id: parsed.task_id,
    task_id: parsed.task_id,
    project_id: parsed.project_id ?? undefined,
    input_text: 'mcp:nexus_update_task_status',
  });
}

export const mcpToolHandlers = {
  nexus_get_daily_brief: handleGetDailyBriefTool,
  nexus_get_pending_tasks: handleGetPendingTasksTool,
  nexus_create_reminder: handleCreateReminderTool,
  nexus_complete_reminder: handleCompleteReminderTool,
  nexus_cancel_reminder: handleCancelReminderTool,
  nexus_postpone_reminder: handlePostponeReminderTool,
  nexus_create_task: handleCreateTaskTool,
  nexus_update_task_status: handleUpdateTaskStatusTool,
} as const;
