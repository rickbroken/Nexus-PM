import { createTaskInputSchema, updateTaskStatusInputSchema, } from './agentApiTypes.js';
import { logAgentAction, tryLogAgentFailure } from './agentAudit.js';
const DEFAULT_LIMIT = 5;
function normalizePendingTask(task) {
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
export async function getPendingTasks(context, options) {
    if (context.userRole === 'advisor') {
        return [];
    }
    let query = context.supabaseClient
        .from('tasks')
        .select('id, title, status, priority, due_date, assigned_to, project:projects(id, name), assignee:users_profiles!assigned_to(id, full_name)')
        .in('status', ['todo', 'in_progress', 'review'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(options?.limit ?? DEFAULT_LIMIT);
    if (context.userRole === 'dev') {
        query = query.eq('assigned_to', context.userId);
    }
    const { data, error } = await query;
    if (error)
        throw error;
    return (data ?? []).map(normalizePendingTask);
}
export async function createTask(context, input, audit) {
    const parsedInput = createTaskInputSchema.parse(input);
    try {
        const { data, error } = await context.supabaseClient
            .from('tasks')
            .insert([
            {
                project_id: parsedInput.project_id,
                title: parsedInput.title,
                description: parsedInput.description ?? null,
                status: 'todo',
                priority: parsedInput.priority ?? 'medium',
                created_by: context.userId,
            },
        ])
            .select('id, project_id, title, status, priority, review_status')
            .single();
        if (error)
            throw error;
        if (audit?.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'task',
                entity_id: audit.entity_id ?? data.id,
                project_id: audit.project_id ?? data.project_id ?? null,
                task_id: audit.task_id ?? data.id,
                client_id: audit.client_id ?? null,
                payment_id: audit.payment_id ?? null,
                recurring_charge_id: audit.recurring_charge_id ?? null,
                input_text: audit.input_text ?? null,
                result: {
                    task_id: data.id,
                    title: data.title,
                    priority: data.priority,
                    status: data.status,
                },
                status: 'success',
            });
        }
        return data;
    }
    catch (error) {
        if (audit?.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'task',
                entity_id: audit.entity_id ?? null,
                project_id: audit.project_id ?? parsedInput.project_id,
                task_id: audit.task_id ?? null,
                client_id: audit.client_id ?? null,
                payment_id: audit.payment_id ?? null,
                recurring_charge_id: audit.recurring_charge_id ?? null,
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
export async function updateTaskStatus(context, input, audit) {
    const parsedInput = updateTaskStatusInputSchema.parse(input);
    const resolvedReviewStatus = parsedInput.status === 'review'
        ? parsedInput.review_status ?? 'pending'
        : parsedInput.review_status ?? null;
    try {
        const { data, error } = await context.supabaseClient
            .from('tasks')
            .update({
            status: parsedInput.status,
            review_status: resolvedReviewStatus,
            updated_at: new Date().toISOString(),
        })
            .eq('id', parsedInput.task_id)
            .select('id, project_id, title, status, priority, review_status')
            .single();
        if (error)
            throw error;
        if (audit?.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'task',
                entity_id: audit.entity_id ?? parsedInput.task_id,
                project_id: audit.project_id ?? parsedInput.project_id ?? data.project_id ?? null,
                task_id: audit.task_id ?? parsedInput.task_id,
                client_id: audit.client_id ?? null,
                payment_id: audit.payment_id ?? null,
                recurring_charge_id: audit.recurring_charge_id ?? null,
                input_text: audit.input_text ?? null,
                result: {
                    task_id: parsedInput.task_id,
                    status: data.status,
                    review_status: data.review_status ?? null,
                },
                status: 'success',
            });
        }
        return data;
    }
    catch (error) {
        if (audit?.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'task',
                entity_id: audit.entity_id ?? parsedInput.task_id,
                project_id: audit.project_id ?? parsedInput.project_id ?? null,
                task_id: audit.task_id ?? parsedInput.task_id,
                client_id: audit.client_id ?? null,
                payment_id: audit.payment_id ?? null,
                recurring_charge_id: audit.recurring_charge_id ?? null,
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
