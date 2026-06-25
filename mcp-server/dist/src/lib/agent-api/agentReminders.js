import { createReminderInputSchema, updateReminderInputSchema, } from './agentApiTypes.js';
import { logAgentAction, tryLogAgentFailure } from './agentAudit.js';
function normalizeDate(value) {
    return new Date(value).toISOString();
}
export async function createReminder(context, input, audit) {
    const parsedInput = createReminderInputSchema.parse(input);
    try {
        const { data, error } = await context.supabaseClient
            .from('reminders')
            .insert([
            {
                user_id: context.userId,
                project_id: parsedInput.project_id ?? null,
                task_id: parsedInput.task_id ?? null,
                title: parsedInput.title,
                description: parsedInput.description ?? null,
                remind_at: normalizeDate(parsedInput.remind_at),
                source: parsedInput.source ?? 'agent',
                status: 'pending',
            },
        ])
            .select('id, title, project_id, task_id, remind_at, source, status')
            .single();
        if (error)
            throw error;
        if (audit?.enabled) {
            const resolvedEntityId = audit.entity_type === 'reminder'
                ? data.id
                : audit.entity_id ?? audit.task_id ?? audit.payment_id ?? audit.recurring_charge_id ?? null;
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'reminder',
                entity_id: resolvedEntityId,
                project_id: audit.project_id ?? data.project_id ?? null,
                task_id: audit.task_id ?? data.task_id ?? null,
                client_id: audit.client_id ?? null,
                payment_id: audit.payment_id ?? null,
                recurring_charge_id: audit.recurring_charge_id ?? null,
                input_text: audit.input_text ?? null,
                result: {
                    reminder_id: data.id,
                    title: data.title,
                    remind_at: data.remind_at,
                    source: data.source,
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
                entity_type: audit.entity_type ?? 'reminder',
                entity_id: audit.entity_id ?? audit.task_id ?? audit.payment_id ?? audit.recurring_charge_id ?? null,
                project_id: audit.project_id ?? parsedInput.project_id ?? null,
                task_id: audit.task_id ?? parsedInput.task_id ?? null,
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
export async function completeReminder(context, input, audit) {
    const parsedInput = updateReminderInputSchema.parse(input);
    try {
        const { data, error } = await context.supabaseClient
            .from('reminders')
            .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', parsedInput.reminder_id)
            .select('id')
            .single();
        if (error)
            throw error;
        if (audit?.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'reminder',
                entity_id: audit.entity_id ?? parsedInput.reminder_id,
                project_id: audit.project_id ?? null,
                task_id: audit.task_id ?? null,
                client_id: audit.client_id ?? null,
                payment_id: audit.payment_id ?? null,
                recurring_charge_id: audit.recurring_charge_id ?? null,
                input_text: audit.input_text ?? null,
                result: { reminder_id: parsedInput.reminder_id },
                status: 'success',
            });
        }
        return data;
    }
    catch (error) {
        if (audit?.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'reminder',
                entity_id: audit.entity_id ?? parsedInput.reminder_id,
                project_id: audit.project_id ?? null,
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
export async function cancelReminder(context, input, audit) {
    const parsedInput = updateReminderInputSchema.parse(input);
    try {
        const { data, error } = await context.supabaseClient
            .from('reminders')
            .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: context.userId,
            updated_at: new Date().toISOString(),
        })
            .eq('id', parsedInput.reminder_id)
            .select('id')
            .single();
        if (error)
            throw error;
        if (audit?.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'reminder',
                entity_id: audit.entity_id ?? parsedInput.reminder_id,
                project_id: audit.project_id ?? null,
                task_id: audit.task_id ?? null,
                client_id: audit.client_id ?? null,
                payment_id: audit.payment_id ?? null,
                recurring_charge_id: audit.recurring_charge_id ?? null,
                input_text: audit.input_text ?? null,
                result: { reminder_id: parsedInput.reminder_id },
                status: 'success',
            });
        }
        return data;
    }
    catch (error) {
        if (audit?.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'reminder',
                entity_id: audit.entity_id ?? parsedInput.reminder_id,
                project_id: audit.project_id ?? null,
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
export async function postponeReminder(context, input, audit) {
    const parsedInput = updateReminderInputSchema.parse(input);
    if (!parsedInput.remind_at) {
        throw new Error('La fecha del recordatorio es obligatoria');
    }
    try {
        const { data, error } = await context.supabaseClient
            .from('reminders')
            .update({
            remind_at: normalizeDate(parsedInput.remind_at),
            status: 'pending',
            updated_at: new Date().toISOString(),
        })
            .eq('id', parsedInput.reminder_id)
            .select('id')
            .single();
        if (error)
            throw error;
        if (audit?.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: audit.entity_type ?? 'reminder',
                entity_id: audit.entity_id ?? parsedInput.reminder_id,
                project_id: audit.project_id ?? null,
                task_id: audit.task_id ?? null,
                client_id: audit.client_id ?? null,
                payment_id: audit.payment_id ?? null,
                recurring_charge_id: audit.recurring_charge_id ?? null,
                input_text: audit.input_text ?? null,
                result: {
                    reminder_id: parsedInput.reminder_id,
                    remind_at: normalizeDate(parsedInput.remind_at),
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
                entity_type: audit.entity_type ?? 'reminder',
                entity_id: audit.entity_id ?? parsedInput.reminder_id,
                project_id: audit.project_id ?? null,
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
