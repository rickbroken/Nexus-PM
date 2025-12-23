import { create } from 'zustand';

export interface UserKanbanColors {
  dev?: {
    todo?: string;
    in_progress?: string;
    review?: string;
  };
  pm?: {
    todo?: string;
    review?: string;
    done?: string;
  };
}

interface KanbanColorsState {
  userColors: UserKanbanColors;
  currentUserId: string | null;
  setColorForStatus: (userId: string, role: 'dev' | 'pm', status: string, color: string) => void;
  resetColors: (userId: string) => void;
  initializeForUser: (userId: string) => void;
}

export const useKanbanColorsStore = create<KanbanColorsState>((set, get) => ({
  userColors: {},
  currentUserId: null,

  // Inicializar colores para un usuario específico
  initializeForUser: (userId: string) => {
    const currentUserId = get().currentUserId;
    
    // Solo cargar si es un usuario diferente o es la primera vez
    if (currentUserId === userId) {
      return;
    }
    
    const stored = localStorage.getItem(`user_kanban_colors_${userId}`);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        set({ userColors: parsed, currentUserId: userId });
      } catch (error) {
        console.error('Error parsing user kanban colors:', error);
        set({ userColors: {}, currentUserId: userId });
      }
    } else {
      set({ userColors: {}, currentUserId: userId });
    }
  },

  // Guardar color para un estado específico
  setColorForStatus: (userId: string, role: 'dev' | 'pm', status: string, color: string) => {
    const currentColors = get().userColors;
    
    const newUserColors = {
      ...currentColors,
      [role]: {
        ...currentColors[role],
        [status]: color,
      },
    };
    
    // Actualizar el estado primero (optimistic update)
    set({ userColors: newUserColors });

    // Guardar en localStorage de forma asíncrona
    requestIdleCallback(() => {
      localStorage.setItem(`user_kanban_colors_${userId}`, JSON.stringify(newUserColors));
    });
  },

  // Resetear colores
  resetColors: (userId: string) => {
    set({ userColors: {} });
    requestIdleCallback(() => {
      localStorage.removeItem(`user_kanban_colors_${userId}`);
    });
  },
}));