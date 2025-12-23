import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, ProjectMember } from '../lib/supabase';
import { toast } from 'sonner';

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_members')
        .select('*, user:users_profiles!project_members_user_id_fkey(*)')
        .eq('project_id', projectId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

export function useAddProjectMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      userIds, 
      addedBy 
    }: { 
      projectId: string; 
      userIds: string[]; 
      addedBy?: string;
    }) => {
      // Primero eliminamos todos los miembros existentes
      const { error: deleteError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) throw deleteError;

      // Si no hay usuarios para agregar, retornamos
      if (userIds.length === 0) return [];

      // Agregamos los nuevos miembros
      const membersToInsert = userIds.map(userId => ({
        project_id: projectId,
        user_id: userId,
        added_by: addedBy,
      }));

      const { data, error } = await supabase
        .from('project_members')
        .insert(membersToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['developer-projects'] }); // Invalidar también los proyectos filtrados por developer
    },
    onError: (error: any) => {
      console.error('Error managing project members:', error);
      toast.error('Error al gestionar miembros del proyecto');
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      userId 
    }: { 
      projectId: string; 
      userId: string;
    }) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false });
      toast.success('Miembro eliminado del proyecto');
    },
    onError: (error: any) => {
      console.error('Error removing project member:', error);
      toast.error('Error al eliminar miembro del proyecto');
    },
  });
}