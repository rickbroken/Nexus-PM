import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type AgentAction } from '@/lib/supabase';
import {
  agentActionFiltersSchema,
  type AgentActionFiltersInput,
} from '@/lib/agentValidations';

const agentActionSelect = `
  *,
  user:users_profiles(*),
  project:projects(*),
  task:tasks(*),
  client:clients(*),
  payment:payments(*),
  recurring_charge:recurring_charges(*)
`;

export function useAgentActions(filters?: AgentActionFiltersInput) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-actions', filters, user?.id, user?.role],
    queryFn: async () => {
      const parsedFilters = agentActionFiltersSchema.parse(filters ?? {});

      let query = supabase
        .from('agent_actions')
        .select(agentActionSelect)
        .order('created_at', { ascending: false });

      if (parsedFilters.status) {
        query = query.eq('status', parsedFilters.status);
      }

      if (parsedFilters.action_type) {
        query = query.eq('action_type', parsedFilters.action_type);
      }

      if (parsedFilters.user_id) {
        query = query.eq('user_id', parsedFilters.user_id);
      }

      if (parsedFilters.limit) {
        query = query.limit(parsedFilters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAgentActions] Error:', error);
        throw error;
      }

      return (data ?? []) as AgentAction[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useRecentAgentActions(limit = 10) {
  return useAgentActions({ limit });
}
