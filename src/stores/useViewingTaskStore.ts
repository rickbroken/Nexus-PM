import { create } from 'zustand';

interface ViewingTaskStore {
  viewingTaskId: string | null;
  setViewingTask: (taskId: string | null) => void;
  isViewingTask: (taskId: string) => boolean;
}

export const useViewingTaskStore = create<ViewingTaskStore>((set, get) => ({
  viewingTaskId: null,
  
  setViewingTask: (taskId: string | null) => set({ viewingTaskId: taskId }),
  
  isViewingTask: (taskId: string) => get().viewingTaskId === taskId,
}));
