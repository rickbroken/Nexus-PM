import { create } from 'zustand';
import { Project } from '../lib/supabase';

interface ProjectState {
  selectedProject: Project | null;
  projectFilters: {
    status?: string;
    clientId?: string;
    search?: string;
  };
  setSelectedProject: (project: Project | null) => void;
  setProjectFilters: (filters: ProjectState['projectFilters']) => void;
  clearFilters: () => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  selectedProject: null,
  projectFilters: {},

  setSelectedProject: (project) => set({ selectedProject: project }),
  
  setProjectFilters: (filters) => 
    set((state) => ({ 
      projectFilters: { ...state.projectFilters, ...filters } 
    })),
  
  clearFilters: () => set({ projectFilters: {} }),
}));
