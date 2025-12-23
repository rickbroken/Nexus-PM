import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project, ProjectInsert, ProjectUpdate } from '../lib/supabase';
import Alert from '@/lib/alert';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function useProjects() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['projects', user?.id, user?.role],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false });

      // Si es developer, solo mostrar proyectos asignados
      if (user?.role === 'dev') {
        const { data: memberProjects, error: memberError } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        const projectIds = memberProjects.map(m => m.project_id);
        
        // Si no tiene proyectos asignados, retornar array vacío
        if (projectIds.length === 0) return [];

        query = query.in('id', projectIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
    // Evitar queries colgadas
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('projects')
        .select('*, client:clients(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProject: ProjectInsert) => {
      console.log('Creating project with data:', newProject);
      
      // Step 1: Create the project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single();

      console.log('Project insert result. Data:', projectData, 'Error:', projectError);

      if (projectError) {
        console.error('Supabase error creating project:', projectError);
        throw projectError;
      }
      
      // Step 2: Create default project finances (manually, bypassing the trigger issue)
      console.log('Creating default finances for project:', projectData.id);
      const { error: financeError } = await supabase
        .from('project_finances')
        .insert([{
          project_id: projectData.id,
          total_value: 0,
          currency: 'USD'
        }]);

      if (financeError) {
        console.warn('Warning: Could not create project finances:', financeError);
        // Don't throw - the project was created successfully
      }
      
      console.log('Project created successfully:', projectData);
      return projectData;
    },
    onSuccess: () => {
      // Invalidar todas las queries de proyectos (con cualquier userId/role)
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false });
      toast.success('Proyecto creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating project:', error);
      Alert.error(
        'Error al crear proyecto',
        error.message || 'No se pudo crear el proyecto'
      );
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProjectUpdate) => {
      console.log('Updating project with id:', id, 'data:', updates);
      
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating project:', error);
        throw error;
      }
      
      console.log('Project updated successfully:', data);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidar todas las queries de proyectos (con cualquier userId/role)
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false });
      toast.success('Proyecto actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating project:', error);
      Alert.error(
        'Error al actualizar proyecto',
        error.message || 'No se pudo actualizar el proyecto'
      );
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar todas las queries de proyectos (con cualquier userId/role)
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false });
      toast.success('Proyecto eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting project:', error);
      Alert.error(
        'Error',
        error.message || 'No se pudo eliminar el proyecto'
      );
    },
  });
}