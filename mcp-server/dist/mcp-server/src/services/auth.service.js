import { ToolExecutionError } from '../errors.js';
import { logAgentAction, tryLogAgentFailure } from './audit.service.js';
function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role ?? null,
        created_at: user.created_at ?? null,
        updated_at: user.updated_at ?? null,
        email_confirmed_at: user.email_confirmed_at ?? null,
        app_metadata: user.app_metadata ?? {},
        user_metadata: user.user_metadata ?? {},
        banned_until: user.banned_until ?? null,
    };
}
export async function listAuthUsers(context, input, audit) {
    try {
        const { data, error } = await context.supabaseClient.auth.admin.listUsers({
            page: input.page,
            perPage: input.perPage,
        });
        if (error)
            throw new ToolExecutionError(error.message);
        const users = (data?.users ?? []).map(sanitizeUser);
        if (audit.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                input_text: audit.input_text ?? null,
                result: {
                    count: users.length,
                    page: input.page,
                    perPage: input.perPage,
                },
                status: 'success',
            });
        }
        return {
            count: users.length,
            users,
        };
    }
    catch (error) {
        if (audit.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
export async function getAuthUser(context, input, audit) {
    try {
        const { data, error } = await context.supabaseClient.auth.admin.getUserById(input.userId);
        if (error)
            throw new ToolExecutionError(error.message);
        if (!data.user)
            throw new ToolExecutionError('Usuario no encontrado.');
        const user = sanitizeUser(data.user);
        if (audit.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                entity_id: input.userId,
                input_text: audit.input_text ?? null,
                result: {
                    user_id: input.userId,
                },
                status: 'success',
            });
        }
        return { user };
    }
    catch (error) {
        if (audit.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                entity_id: input.userId,
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
export async function createAuthUser(context, input, audit) {
    try {
        const { data, error } = await context.supabaseClient.auth.admin.createUser({
            email: input.email,
            password: input.password,
            email_confirm: input.emailConfirm,
            phone: input.phone,
            user_metadata: input.userMetadata,
            app_metadata: input.appMetadata,
        });
        if (error)
            throw new ToolExecutionError(error.message);
        if (!data.user)
            throw new ToolExecutionError('No se pudo crear el usuario.');
        const user = sanitizeUser(data.user);
        if (audit.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                entity_id: data.user.id,
                input_text: audit.input_text ?? null,
                result: {
                    user_id: data.user.id,
                    email: data.user.email ?? input.email,
                },
                status: 'success',
            });
        }
        return { user };
    }
    catch (error) {
        if (audit.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
export async function updateAuthUser(context, input, audit) {
    try {
        const { data, error } = await context.supabaseClient.auth.admin.updateUserById(input.userId, {
            email: input.email,
            password: input.password,
            phone: input.phone,
            user_metadata: input.userMetadata,
            app_metadata: input.appMetadata,
            ban_duration: input.banDuration,
            email_confirm: input.emailConfirm,
        });
        if (error)
            throw new ToolExecutionError(error.message);
        if (!data.user)
            throw new ToolExecutionError('No se pudo actualizar el usuario.');
        const user = sanitizeUser(data.user);
        if (audit.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                entity_id: input.userId,
                input_text: audit.input_text ?? null,
                result: {
                    user_id: input.userId,
                    updated: true,
                },
                status: 'success',
            });
        }
        return { user };
    }
    catch (error) {
        if (audit.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                entity_id: input.userId,
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
export async function deleteAuthUser(context, input, audit) {
    try {
        if (input.confirm !== true) {
            throw new ToolExecutionError('confirm debe ser true para eliminar un usuario auth.');
        }
        const { error } = await context.supabaseClient.auth.admin.deleteUser(input.userId, input.shouldSoftDelete);
        if (error)
            throw new ToolExecutionError(error.message);
        if (audit.enabled) {
            await logAgentAction(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                entity_id: input.userId,
                input_text: audit.input_text ?? null,
                result: {
                    user_id: input.userId,
                    soft_delete: input.shouldSoftDelete,
                },
                status: 'success',
            });
        }
        return {
            userId: input.userId,
            deleted: true,
        };
    }
    catch (error) {
        if (audit.enabled) {
            await tryLogAgentFailure(context, {
                action_type: audit.action_type,
                entity_type: 'auth_user',
                entity_id: input.userId,
                input_text: audit.input_text ?? null,
                error_message: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
        throw error;
    }
}
