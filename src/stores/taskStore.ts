import { create } from 'zustand';
import { Task, TaskStatus } from '../lib/supabase';

interface TaskState {
  selectedTask: Task | null;
  kanbanFilters: {
    projectId?: string;
    assignedTo?: string;
    priority?: string;
  };
  setSelectedTask: (task: Task | null) => void;
  setKanbanFilters: (filters: TaskState['kanbanFilters']) => void;
  clearFilters: () => void;
}

export const useTaskStore = create<TaskState>()((set) => ({
  selectedTask: null,
  kanbanFilters: {},

  setSelectedTask: (task) => set({ selectedTask: task }),
  
  setKanbanFilters: (filters) => 
    set((state) => ({ 
      kanbanFilters: { ...state.kanbanFilters, ...filters } 
    })),
  
  clearFilters: () => set({ kanbanFilters: {} }),
}));
