import { create } from 'zustand';
import { supabase, type UserProfile } from '../lib/supabase';
import { queryClient } from '../lib/queryClient'; // 🔥 Importar queryClient

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: false,
  initialized: false,

  setUser: (user) => {
    set({ user });
  },
  
  setLoading: (loading) => set({ loading }),

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      
      // 🔥 INVALIDAR TODO EL CACHÉ DE REACT QUERY
      queryClient.clear();
      
      set({ user: null, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  initialize: async () => {
    set({ initialized: true, loading: false });
  },
}));