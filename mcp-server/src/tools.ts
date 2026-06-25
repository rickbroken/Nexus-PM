import { mcpToolDefinitions } from '../../src/lib/agent-mcp/index.js';
import {
  cancelReminderToolSchema,
  completeReminderToolSchema,
  createReminderToolSchema,
  createTaskToolSchema,
  getDailyBriefSchema,
  getPendingTasksSchema,
  postponeReminderToolSchema,
  updateTaskStatusToolSchema,
} from '../../src/lib/agent-mcp/mcpToolSchemas.js';

export { mcpToolDefinitions };

export const mcpToolRuntimeSchemas = {
  nexus_get_daily_brief: getDailyBriefSchema,
  nexus_get_pending_tasks: getPendingTasksSchema,
  nexus_create_reminder: createReminderToolSchema,
  nexus_complete_reminder: completeReminderToolSchema,
  nexus_cancel_reminder: cancelReminderToolSchema,
  nexus_postpone_reminder: postponeReminderToolSchema,
  nexus_create_task: createTaskToolSchema,
  nexus_update_task_status: updateTaskStatusToolSchema,
} as const;
