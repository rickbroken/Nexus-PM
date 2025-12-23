import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase, type UserProfile } from '@/lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile | null | undefined>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    // Durante HMR (Hot Module Reload), React puede intentar renderizar componentes
    // antes de que el AuthProvider esté disponible. En lugar de lanzar un error
    // inmediatamente, retornamos valores por defecto temporales para evitar crashes.
    if (import.meta.env.DEV) {
      return {
        user: null,
        loading: true,
        signIn: async () => {},
        signOut: async () => {},
        refreshUser: async () => {},
      } as AuthContextType;
    }
    
    // En producción, sí lanzamos el error
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const isMounted = useRef(true);

  // Función para cargar el profile del usuario
  const loadUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (err) {
      return null;
    }
  }, []);

  // Función para refrescar el usuario actual
  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && isMounted.current) {
        const profile = await loadUserProfile(session.user.id);
        if (isMounted.current) {
          setUser(profile);
        }
      } else if (isMounted.current) {
        setUser(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setUser(null);
      }
    }
  }, [loadUserProfile]);

  // Inicializar auth UNA SOLA VEZ
  useEffect(() => {
    isMounted.current = true;

    if (initialized.current) {
      return;
    }

    initialized.current = true;

    // Verificar sesión actual
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted.current) return;

      if (error) {
        setLoading(false);
        return;
      }

      if (session?.user) {
        const profile = await loadUserProfile(session.user.id);
        if (isMounted.current) {
          setUser(profile);
        }
      } else {
        if (isMounted.current) {
          setUser(null);
        }
      }

      if (isMounted.current) {
        setLoading(false);
      }
    });

    // Listener SIMPLE solo para SIGNED_OUT y TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted.current) return;
      
      // SIGNED_OUT - limpiar el user
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      
      // TOKEN_REFRESHED - recargar profile para mantener RLS activo
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        loadUserProfile(session.user.id).then(profile => {
          if (profile && isMounted.current) {
            setUser(profile);
          }
        });
      }
      
      // Ignorar TODOS los demás eventos (SIGNED_IN, USER_UPDATED, etc.)
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && isMounted.current) {
        const profile = await loadUserProfile(data.user.id);
        if (isMounted.current) {
          setUser(profile);
        }
        return profile; // Retornar el perfil del usuario
      }
    } catch (error) {
      throw error;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [loadUserProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    setLoading(true);

    try {
      await supabase.auth.signOut();
      if (isMounted.current) {
        setUser(null);
      }
    } catch (error) {
      throw error;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}