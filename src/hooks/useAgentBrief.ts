import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getDailyBrief, type AgentBriefData } from '@/lib/agent-api';

export function useAgentBrief() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-brief', user?.id, user?.role],
    queryFn: async (): Promise<AgentBriefData> => {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      return getDailyBrief({
        supabaseClient: supabase,
        userId: user.id,
        userRole: user.role,
      });
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
