import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Alert from '@/lib/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type Reminder } from '@/lib/supabase';
import {
  createReminderSchema,
  reminderFiltersSchema,
  updateReminderSchema,
  type CreateReminderInput,
  type ReminderFiltersInput,
  type UpdateReminderInput,
} from '@/lib/agentValidations';

const remindersSelect = `
  *,
  user:users_profiles!user_id(*),
  project:projects(*),
  task:tasks(*),
  canceller:users_profiles!cancelled_by(*)
`;

function normalizeDate(value?: string | null) {
  if (!value) return value ?? null;
  return new Date(value).toISOString();
}

export function useReminders(filters?: ReminderFiltersInput) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reminders', filters, user?.id, user?.role],
    queryFn: async () => {
      const parsedFilters = reminderFiltersSchema.parse(filters ?? {});

      let query = supabase
        .from('reminders')
        .select(remindersSelect)
        .order('remind_at', { ascending: true });

      if (parsedFilters.status) {
        query = query.eq('status', parsedFilters.status);
      }

      if (parsedFilters.project_id) {
        query = query.eq('project_id', parsedFilters.project_id);
      }

      if (parsedFilters.task_id) {
        query = query.eq('task_id', parsedFilters.task_id);
      }

      if (parsedFilters.from) {
        query = query.gte('remind_at', normalizeDate(parsedFilters.from)!);
      }

      if (parsedFilters.to) {
        query = query.lte('remind_at', normalizeDate(parsedFilters.to)!);
      }

      if (parsedFilters.limit) {
        query = query.limit(parsedFilters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useReminders] Error:', error);
        throw error;
      }

      return (data ?? []) as Reminder[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePendingReminders(filters?: Omit<ReminderFiltersInput, 'status'>) {
  return useReminders({ ...filters, status: 'pending' });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: Omit<CreateReminderInput, 'user_id'> & { user_id?: string }) => {
      if (!user?.id) {
        throw new Error('No hay usuario autenticado');
      }

      const parsedPayload = createReminderSchema.parse({
        ...payload,
        user_id: user.id,
      });

      const insertPayload = {
        ...parsedPayload,
        remind_at: normalizeDate(parsedPayload.remind_at),
      };

      const { data, error } = await supabase
        .from('reminders')
        .insert([insertPayload])
        .select(remindersSelect)
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'], exact: false });
      toast.success('Recordatorio creado exitosamente');
    },
    onError: (error: any) => {
      console.error('[useCreateReminder] Error:', error);
      Alert.error('Error', error.message || 'No se pudo crear el recordatorio');
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateReminderInput) => {
      const parsedPayload = updateReminderSchema.parse(payload);
      const { id, ...updates } = parsedPayload;

      const normalizedUpdates = {
        ...updates,
        remind_at: normalizeDate(updates.remind_at),
        notified_at: normalizeDate(updates.notified_at),
        completed_at: normalizeDate(updates.completed_at),
        cancelled_at: normalizeDate(updates.cancelled_at),
      };

      const { data, error } = await supabase
        .from('reminders')
        .update(normalizedUpdates)
        .eq('id', id)
        .select(remindersSelect)
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'], exact: false });
      toast.success('Recordatorio actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('[useUpdateReminder] Error:', error);
      Alert.error('Error', error.message || 'No se pudo actualizar el recordatorio');
    },
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id ?? null,
          completed_at: null,
        })
        .eq('id', id)
        .select(remindersSelect)
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'], exact: false });
      toast.success('Recordatorio cancelado');
    },
    onError: (error: any) => {
      console.error('[useCancelReminder] Error:', error);
      Alert.error('Error', error.message || 'No se pudo cancelar el recordatorio');
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          cancelled_at: null,
          cancelled_by: null,
        })
        .eq('id', id)
        .select(remindersSelect)
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'], exact: false });
      toast.success('Recordatorio completado');
    },
    onError: (error: any) => {
      console.error('[useCompleteReminder] Error:', error);
      Alert.error('Error', error.message || 'No se pudo completar el recordatorio');
    },
  });
}
