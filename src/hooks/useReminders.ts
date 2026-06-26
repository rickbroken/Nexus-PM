import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type Reminder } from '@/lib/supabase';
import {
  reminderFiltersSchema,
  type ReminderFiltersInput,
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
