import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, UserProfile } from '../lib/supabase';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { projectId } from '../../utils/supabase/info';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
    // Evitar queries colgadas
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!id,
  });
}

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'pm' | 'dev' | 'advisor';
  avatar_url?: string;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newUser: CreateUserData) => {
      // Get current user session to send auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa');
      }

      // Call backend endpoint to create user with email confirmed
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-17d656ff/users/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(newUser),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear usuario');
      }

      const result = await response.json();
      return result.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado exitosamente');
      Swal.fire({
        icon: 'success',
        title: 'Usuario creado',
        text: 'El usuario ha sido creado y puede iniciar sesión inmediatamente.',
        timer: 3000,
      });
    },
    onError: (error: any) => {
      console.error('Error creating user:', error);
      
      // Check if it's a duplicate email error
      if (error.message && error.message.includes('Ya existe un usuario')) {
        Swal.fire({
          icon: 'warning',
          title: 'Email duplicado',
          text: 'Ya existe un usuario con este email. Por favor usa otro email.',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'No se pudo crear el usuario',
        });
      }
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('users_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      toast.success('Usuario actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating user:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo actualizar el usuario',
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Note: Deleting users from auth.users requires admin privileges
      // This will only delete the profile, not the auth user
      const { error } = await supabase
        .from('users_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting user:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo eliminar el usuario',
      });
    },
  });
}