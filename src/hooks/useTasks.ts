import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Task } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import Alert from '@/lib/alert';

export function useTasks(projectId?: string, includeArchived = false) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['tasks', projectId, user?.id, includeArchived],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*, project:projects(*), assignee:users_profiles!assigned_to(*)')
        .order('created_at', { ascending: false });

      // Filtrar tareas archivadas solo si includeArchived es false
      if (!includeArchived) {
        query = query.neq('status', 'archived');
      }

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      // Si es developer, solo ver tareas asignadas a él
      if (user?.role === 'dev') {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTasks] Error:', error);
        throw error;
      }
      
      return data as Task[];
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(*), assignee:users_profiles!assigned_to(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Task;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTask: Partial<Task>) => {
      // Asegurar valores por defecto para evitar undefined
      const taskData = {
        ...newTask,
        tags: newTask.tags || [],
        dev_notes: newTask.dev_notes || '',
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select('*, project:projects(*), assignee:users_profiles!assigned_to(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarea creada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating task:', error);
      Alert.error('Error', error.message || 'No se pudo crear la tarea');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select('*, project:projects(*), assignee:users_profiles!assigned_to(*)')
        .single();

      if (error) throw error;
      return data;
    },
    // Actualización optimista
    onMutate: async (variables) => {
      // Cancelar queries en curso para evitar sobrescrituras
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Guardar snapshot del estado anterior
      const previousTasks = queryClient.getQueryData(['tasks']);

      // Actualizar optimistamente la caché
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: any) => {
        if (!old) return old;
        
        return old.map((task: Task) => 
          task.id === variables.id 
            ? { ...task, ...variables }
            : task
        );
      });

      // Retornar contexto con el snapshot para rollback
      return { previousTasks };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] });
      
      // Solo mostrar toast si es una actualización manual, no drag & drop
      if (!variables.status || Object.keys(variables).length > 2) {
        toast.success('Tarea actualizada exitosamente');
      }
    },
    onError: (error: any, _, context) => {
      // Revertir al estado anterior en caso de error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      
      console.error('Error updating task:', error);
      Alert.error('Error', error.message || 'No se pudo actualizar la tarea');
    },
    // Siempre refrescar después de que la mutación se complete
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Obtener archivos adjuntos antes de eliminar la tarea
      const { data: attachments, error: attachmentsError } = await supabase
        .from('task_attachments')
        .select('file_path')
        .eq('task_id', id);

      if (attachmentsError) {
        // Continuar con la eliminación aunque falle la búsqueda de attachments
      }

      // 2. Eliminar archivos físicos del Storage (si existen)
      if (attachments && attachments.length > 0) {
        const filePaths = attachments.map(a => a.file_path);
        
        const { error: storageError } = await supabase.storage
          .from('task-attachments')
          .remove(filePaths);

        if (storageError) {
          // No lanzar error, continuamos con la eliminación de la tarea
          // Los registros de la DB se eliminarán y los archivos quedarán huérfanos
        }
      }
      
      // 3. Eliminar tarea (CASCADE eliminará task_attachments y task_comments automáticamente)
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarea eliminada exitosamente');
    },
    onError: (error: any) => {
      Alert.error('Error', error.message || 'No se pudo eliminar la tarea');
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*, project:projects(*), assignee:users_profiles!assigned_to(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarea archivada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error archiving task:', error);
      Alert.error('Error', error.message || 'No se pudo archivar la tarea');
    },
  });
}