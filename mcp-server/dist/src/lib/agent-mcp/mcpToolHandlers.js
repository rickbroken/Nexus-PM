import { cancelReminder, completeReminder, createReminder, createTask, getDailyBrief, getPendingTasks, logAgentAction, postponeReminder, tryLogAgentFailure, updateTaskStatus, } from '../agent-api/index.js';
import { cancelReminderToolSchema, completeReminderToolSchema, createReminderToolSchema, createTaskToolSchema, getDailyBriefSchema, getPendingTasksSchema, postponeReminderToolSchema, updateTaskStatusToolSchema, } from './mcpToolSchemas.js';
export async function handleGetDailyBriefTool({ context, input }) {
    getDailyBriefSchema.parse(input ?? {});
    try {
        const result = await getDailyBrief(context);
        await logAgentAction(context, {
            action_type: 'nexus_get_daily_brief',
            entity_type: 'brief',
            input_text: 'mcp:nexus_get_daily_brief',
            result: {
                pending_tasks: result.stats.pendingTasks,
                pending_reminders: result.stats.pendingReminders,
                pending_payments: result.stats.pendingPayments,
            },
            status: 'success',
        });
        return result;
    }
    catch (error) {
        await tryLogAgentFailure(context, {
            action_type: 'nexus_get_daily_brief',
            entity_type: 'brief',
            input_text: 'mcp:nexus_get_daily_brief',
            error_message: error instanceof Error ? error.message : 'Error desconocido',
        });
        throw error;
    }
}
export async function handleGetPendingTasksTool({ context, input }) {
    const parsed = getPendingTasksSchema.parse(input ?? {});
    try {
        const result = await getPendingTasks(context, {
            limit: parsed.limit,
        });
        await logAgentAction(context, {
            action_type: 'nexus_get_pending_tasks',
            entity_type: 'task',
            input_text: 'mcp:nexus_get_pending_tasks',
            result: {
                count: result.length,
            },
            status: 'success',
        });
        return result;
    }
    catch (error) {
        await tryLogAgentFailure(context, {
            action_type: 'nexus_get_pending_tasks',
            entity_type: 'task',
            input_text: 'mcp:nexus_get_pending_tasks',
            error_message: error instanceof Error ? error.message : 'Error desconocido',
        });
        throw error;
    }
}
export async function handleCreateReminderTool({ context, input }) {
    const parsed = createReminderToolSchema.parse(input);
    return createReminder(context, {
        ...parsed,
        source: 'agent',
    }, {
        enabled: true,
        action_type: 'nexus_create_reminder',
        entity_type: 'reminder',
        project_id: parsed.project_id ?? undefined,
        task_id: parsed.task_id ?? undefined,
        input_text: 'mcp:nexus_create_reminder',
    });
}
export async function handleCompleteReminderTool({ context, input }) {
    const parsed = completeReminderToolSchema.parse(input);
    return completeReminder(context, parsed, {
        enabled: true,
        action_type: 'nexus_complete_reminder',
        entity_type: 'reminder',
        entity_id: parsed.reminder_id,
        input_text: 'mcp:nexus_complete_reminder',
    });
}
export async function handleCancelReminderTool({ context, input }) {
    const parsed = cancelReminderToolSchema.parse(input);
    return cancelReminder(context, parsed, {
        enabled: true,
        action_type: 'nexus_cancel_reminder',
        entity_type: 'reminder',
        entity_id: parsed.reminder_id,
        input_text: 'mcp:nexus_cancel_reminder',
    });
}
export async function handlePostponeReminderTool({ context, input }) {
    const parsed = postponeReminderToolSchema.parse(input);
    return postponeReminder(context, parsed, {
        enabled: true,
        action_type: 'nexus_postpone_reminder',
        entity_type: 'reminder',
        entity_id: parsed.reminder_id,
        input_text: 'mcp:nexus_postpone_reminder',
    });
}
export async function handleCreateTaskTool({ context, input }) {
    const parsed = createTaskToolSchema.parse(input);
    return createTask(context, parsed, {
        enabled: true,
        action_type: 'nexus_create_task',
        entity_type: 'task',
        project_id: parsed.project_id,
        input_text: 'mcp:nexus_create_task',
    });
}
export async function handleUpdateTaskStatusTool({ context, input }) {
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
};
