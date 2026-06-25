import { z } from 'zod';
import { cancelReminderToolSchema, completeReminderToolSchema, createReminderToolSchema, createTaskToolSchema, getDailyBriefSchema, getPendingTasksSchema, postponeReminderToolSchema, updateTaskStatusToolSchema, } from './mcpToolSchemas.js';
export const mcpToolDefinitions = [
    {
        name: 'nexus_get_daily_brief',
        description: 'Obtiene un resumen operativo diario usando la capa interna agent-api.',
        inputSchema: z.toJSONSchema(getDailyBriefSchema),
    },
    {
        name: 'nexus_get_pending_tasks',
        description: 'Lista tareas pendientes visibles para el usuario autenticado.',
        inputSchema: z.toJSONSchema(getPendingTasksSchema),
    },
    {
        name: 'nexus_create_reminder',
        description: 'Crea un recordatorio interno dentro de Nexus-PM.',
        inputSchema: z.toJSONSchema(createReminderToolSchema),
    },
    {
        name: 'nexus_complete_reminder',
        description: 'Marca un recordatorio como completado.',
        inputSchema: z.toJSONSchema(completeReminderToolSchema),
    },
    {
        name: 'nexus_cancel_reminder',
        description: 'Cancela un recordatorio sin borrarlo.',
        inputSchema: z.toJSONSchema(cancelReminderToolSchema),
    },
    {
        name: 'nexus_postpone_reminder',
        description: 'Pospone un recordatorio existente a una nueva fecha.',
        inputSchema: z.toJSONSchema(postponeReminderToolSchema),
    },
    {
        name: 'nexus_create_task',
        description: 'Crea una tarea interna asociada a un proyecto visible.',
        inputSchema: z.toJSONSchema(createTaskToolSchema),
    },
    {
        name: 'nexus_update_task_status',
        description: 'Actualiza el estado operativo de una tarea.',
        inputSchema: z.toJSONSchema(updateTaskStatusToolSchema),
    },
];
