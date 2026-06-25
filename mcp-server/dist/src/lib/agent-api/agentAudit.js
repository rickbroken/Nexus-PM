import { agentActionInputSchema, } from './agentApiTypes.js';
export async function logAgentAction(context, input) {
    const parsedInput = agentActionInputSchema.parse(input);
    const { error } = await context.supabaseClient.from('agent_actions').insert([
        {
            user_id: context.userId,
            action_type: parsedInput.action_type,
            entity_type: parsedInput.entity_type ?? null,
            entity_id: parsedInput.entity_id ?? null,
            project_id: parsedInput.project_id ?? null,
            task_id: parsedInput.task_id ?? null,
            client_id: parsedInput.client_id ?? null,
            payment_id: parsedInput.payment_id ?? null,
            recurring_charge_id: parsedInput.recurring_charge_id ?? null,
            input_text: parsedInput.input_text ?? null,
            result: parsedInput.result ?? null,
            status: parsedInput.status,
            error_message: parsedInput.error_message ?? null,
        },
    ]);
    if (error)
        throw error;
}
export async function tryLogAgentFailure(context, input) {
    try {
        await logAgentAction(context, {
            ...input,
            status: 'failed',
        });
    }
    catch {
        // No romper la accion principal si falla la auditoria.
    }
}
