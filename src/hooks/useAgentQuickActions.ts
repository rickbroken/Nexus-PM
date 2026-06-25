import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Alert from '@/lib/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type ReviewStatus } from '@/lib/supabase';
import {
  cancelReminder,
  completeReminder,
  createReminder,
  postponeReminder,
  updateTaskStatus,
} from '@/lib/agent-api';

type CreateReminderFromTaskInput = {
  task_id: string;
  project_id?: string;
  title: string;
  remind_at: string;
};

type UpdateTaskStatusFromBriefInput = {
  task_id: string;
  project_id?: string;
  status: 'in_progress' | 'review';
  review_status?: ReviewStatus;
  input_text: string;
};

type CreateFinanceReminderInput = {
  entity_type: 'payment' | 'recurring_charge';
  payment_id?: string;
  recurring_charge_id?: string;
  project_id?: string;
  remind_at: string;
  title: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Error desconocido');
  }
  return 'Error desconocido';
}

function normalizeDateTimeToIso(value: string) {
  return new Date(value).toISOString();
}

export function useAgentQuickActions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateRelevantQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['agent-brief'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['reminders'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['agent-actions'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false }),
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

  const useCompleteReminder = () =>
    useMutation({
      mutationFn: async ({ reminderId, input_text }: { reminderId: string; input_text: string }) => {
        return completeReminder(
          getContext(),
          { reminder_id: reminderId },
          {
            enabled: true,
            action_type: 'update_reminder',
            entity_type: 'reminder',
            entity_id: reminderId,
            input_text,
          }
        );
      },
      onSuccess: async () => {
        await invalidateRelevantQueries();
        toast.success('Recordatorio completado');
      },
      onError: (error: unknown) => {
        Alert.error('Error', getErrorMessage(error));
      },
    });

  const useCancelReminder = () =>
    useMutation({
      mutationFn: async ({ reminderId, input_text }: { reminderId: string; input_text: string }) => {
        return cancelReminder(
          getContext(),
          { reminder_id: reminderId },
          {
            enabled: true,
            action_type: 'cancel_reminder',
            entity_type: 'reminder',
            entity_id: reminderId,
            input_text,
          }
        );
      },
      onSuccess: async () => {
        await invalidateRelevantQueries();
        toast.success('Recordatorio cancelado');
      },
      onError: (error: unknown) => {
        Alert.error('Error', getErrorMessage(error));
      },
    });

  const usePostponeReminder = () =>
    useMutation({
      mutationFn: async ({
        reminderId,
        remind_at,
        input_text,
      }: {
        reminderId: string;
        remind_at: string;
        input_text: string;
      }) => {
        return postponeReminder(
          getContext(),
          {
            reminder_id: reminderId,
            remind_at: normalizeDateTimeToIso(remind_at),
          },
          {
            enabled: true,
            action_type: 'update_reminder',
            entity_type: 'reminder',
            entity_id: reminderId,
            input_text,
          }
        );
      },
      onSuccess: async () => {
        await invalidateRelevantQueries();
        toast.success('Recordatorio pospuesto');
      },
      onError: (error: unknown) => {
        Alert.error('Error', getErrorMessage(error));
      },
    });

  const useCreateReminderFromTask = () =>
    useMutation({
      mutationFn: async (variables: CreateReminderFromTaskInput) => {
        return createReminder(
          getContext(),
          {
            task_id: variables.task_id,
            project_id: variables.project_id ?? null,
            title: variables.title,
            remind_at: normalizeDateTimeToIso(variables.remind_at),
            source: 'manual',
          },
          {
            enabled: true,
            action_type: 'create_reminder',
            entity_type: 'task',
            entity_id: variables.task_id,
            task_id: variables.task_id,
            project_id: variables.project_id,
            input_text: `Crear recordatorio desde tarea: ${variables.title}`,
          }
        );
      },
      onSuccess: async () => {
        await invalidateRelevantQueries();
        toast.success('Recordatorio creado desde la tarea');
      },
      onError: (error: unknown) => {
        Alert.error('Error', getErrorMessage(error));
      },
    });

  const useUpdateTaskStatusFromBrief = () =>
    useMutation({
      mutationFn: async (variables: UpdateTaskStatusFromBriefInput) => {
        return updateTaskStatus(
          getContext(),
          {
            task_id: variables.task_id,
            project_id: variables.project_id ?? null,
            status: variables.status,
            review_status: variables.review_status ?? null,
          },
          {
            enabled: true,
            action_type: 'update_task_status',
            entity_type: 'task',
            entity_id: variables.task_id,
            task_id: variables.task_id,
            project_id: variables.project_id,
            input_text: variables.input_text,
          }
        );
      },
      onSuccess: async (_, variables) => {
        await invalidateRelevantQueries();
        toast.success(
          variables.status === 'review' ? 'Tarea enviada a revisión' : 'Tarea marcada en progreso'
        );
      },
      onError: (error: unknown) => {
        Alert.error('Error', getErrorMessage(error));
      },
    });

  const useCreateFinanceReminder = () =>
    useMutation({
      mutationFn: async (variables: CreateFinanceReminderInput) => {
        return createReminder(
          getContext(),
          {
            project_id: variables.project_id ?? null,
            title: variables.title,
            remind_at: normalizeDateTimeToIso(variables.remind_at),
            source: 'manual',
          },
          {
            enabled: true,
            action_type: 'create_reminder',
            entity_type: variables.entity_type,
            entity_id: variables.payment_id ?? variables.recurring_charge_id,
            project_id: variables.project_id,
            payment_id: variables.payment_id,
            recurring_charge_id: variables.recurring_charge_id,
            input_text: `Crear recordatorio financiero: ${variables.title}`,
          }
        );
      },
      onSuccess: async () => {
        await invalidateRelevantQueries();
        toast.success('Recordatorio financiero creado');
      },
      onError: (error: unknown) => {
        Alert.error('Error', getErrorMessage(error));
      },
    });

  return {
    useCompleteReminder,
    useCancelReminder,
    usePostponeReminder,
    useCreateReminderFromTask,
    useUpdateTaskStatusFromBrief,
    useCreateFinanceReminder,
  };
}
