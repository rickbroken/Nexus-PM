import { z } from 'zod';
import { createReminderInputSchema, createTaskInputSchema, updateReminderInputSchema, updateTaskStatusInputSchema, } from '../agent-api/index.js';
export const getDailyBriefSchema = z.object({});
export const getPendingTasksSchema = z.object({
    limit: z.number().int().positive().max(5).optional(),
});
export const createReminderToolSchema = createReminderInputSchema.pick({
    title: true,
    description: true,
    remind_at: true,
    project_id: true,
    task_id: true,
});
export const completeReminderToolSchema = updateReminderInputSchema.pick({
    reminder_id: true,
});
export const cancelReminderToolSchema = updateReminderInputSchema.pick({
    reminder_id: true,
});
export const postponeReminderToolSchema = updateReminderInputSchema.pick({
    reminder_id: true,
    remind_at: true,
});
export const createTaskToolSchema = createTaskInputSchema.pick({
    project_id: true,
    title: true,
    description: true,
    priority: true,
});
export const updateTaskStatusToolSchema = updateTaskStatusInputSchema.pick({
    task_id: true,
    status: true,
    review_status: true,
    project_id: true,
});
