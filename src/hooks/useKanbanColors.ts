import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const projectId = import.meta.env.VITE_SUPABASE_PROYECT_ID;
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface KanbanColors {
  dev: {
    todo: string;
    in_progress: string;
    review: string;
  };
  pm: {
    todo: string;
    review: string;
    done: string;
  };
}

const DEFAULT_COLORS: KanbanColors = {
  dev: {
    todo: 'bg-gray-100',
    in_progress: 'bg-blue-100',
    review: 'bg-yellow-100',
  },
  pm: {
    todo: 'bg-purple-100',
    review: 'bg-yellow-100',
    done: 'bg-green-100',
  },
};

const KV_KEY = 'kanban_colors';

export function useKanbanColors() {
  const queryClient = useQueryClient();

  const { data: colors, isLoading } = useQuery({
    queryKey: ['kanban-colors'],
    queryFn: async () => {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/kv/${KV_KEY}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        // Si no existe, devolver colores por defecto
        if (response.status === 404) {
          return DEFAULT_COLORS;
        }
        throw new Error('Error al obtener colores');
      }

      const data = await response.json();
      
      // Si value es null o undefined, retornar colores por defecto
      if (!data.value) {
        return DEFAULT_COLORS;
      }
      
      return data.value as KanbanColors;
    },
    placeholderData: DEFAULT_COLORS,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const updateColors = useMutation({
    mutationFn: async (newColors: KanbanColors) => {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/kv/${KV_KEY}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ value: newColors }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al actualizar colores');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-colors'] });
    },
  });

  return {
    colors: colors || DEFAULT_COLORS,
    isLoading,
    updateColors,
  };
}