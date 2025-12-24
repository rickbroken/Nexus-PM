import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  deleted_at: string | null;
  read_by?: string[]; // Array de user_ids que han leído el comentario
  author: {
    id: string;
    full_name: string;
    role: string;
  };
}

// Hook para obtener el conteo de comentarios sin leer de una tarea
export function useUnreadCommentsCount(taskId: string | undefined, userId: string | undefined, userRole: string | undefined) {
  return useQuery({
    queryKey: ['unread-comments-count', taskId, userId],
    queryFn: async () => {
      if (!taskId || !userId || !userRole) return 0;

      try {
        const { data, error } = await supabase
          .from('task_comments')
          .select('id, read_by, user_id')
          .eq('task_id', taskId)
          .neq('user_id', userId); // No contar comentarios propios

        if (error) {
          console.error('Error contando comentarios sin leer:', error);
          return 0;
        }

        // Contar comentarios que no han sido leídos por el usuario
        const unreadCount = (data || []).filter(comment => {
          return !comment.read_by?.includes(userId);
        }).length;

        return unreadCount;
      } catch (error) {
        console.error('Error contando comentarios sin leer:', error);
        return 0;
      }
    },
    enabled: !!taskId && !!userId && !!userRole,
    refetchInterval: 3000, // Actualizar cada 3 segundos
    staleTime: 1000,
  });
}

// Hook para obtener los comentarios de una tarea
export function useTaskComments(taskId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      try {
        const { data, error } = await supabase
          .from('task_comments')
          .select(`
            *,
            author:users_profiles!task_comments_user_id_fkey (
              id,
              full_name,
              role
            )
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

        if (error) {
          // Si la tabla no existe, retornar array vacío en lugar de error
          if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === '42P01') {
            console.warn('La tabla task_comments no existe. Ejecuta el script SQL de migración.');
            return [];
          }
          // Si falta la columna deleted_at, no es un error crítico
          if (error.message.includes('deleted_at') || error.code === '42703') {
            console.warn('⚠️ ========================================');
            console.warn('⚠️  LA COLUMNA deleted_at NO EXISTE');
            console.warn('⚠️ ========================================');
            console.warn('⚠️  Los mensajes se eliminarán completamente');
            console.warn('⚠️  en lugar de mostrar "Mensaje eliminado"');
            console.warn('⚠️ ');
            console.warn('⚠️  SOLUCIÓN: Ejecuta este SQL en Supabase:');
            console.warn('⚠️  ALTER TABLE task_comments ADD COLUMN deleted_at timestamptz;');
            console.warn('⚠️ ');
            console.warn('⚠️  Ver archivo: /EJECUTAR_ESTO_AHORA.md');
            console.warn('⚠️ ========================================');
            // Intentar query sin deleted_at
            const { data: dataWithoutDeleted, error: error2 } = await supabase
              .from('task_comments')
              .select(`
                id, task_id, user_id, content, created_at, updated_at, is_edited, read_by,
                author:users_profiles!task_comments_user_id_fkey (
                  id,
                  full_name,
                  role
                )
              `)
              .eq('task_id', taskId)
              .order('created_at', { ascending: true });

            if (error2) {
              console.error('Error obteniendo comentarios:', error2);
              return [];
            }

            // Agregar deleted_at: null a todos los comentarios
            const commentsWithDeletedAt = (dataWithoutDeleted || []).map(comment => ({
              ...comment,
              deleted_at: null
            }));

            // Filtrar comentarios sin author
            const validComments = commentsWithDeletedAt.filter(comment => {
              if (!comment.author) {
                console.warn('Comentario sin autor - posible usuario eliminado:', comment.id);
                return false;
              }
              return true;
            });

            return validComments as TaskComment[];
          }
          console.error('Error obteniendo comentarios:', error);
          return [];
        }

        // Filtrar comentarios que no tienen author (usuario eliminado o JOIN fallido)
        const validComments = (data || []).filter(comment => {
          if (!comment.author) {
            console.warn('Comentario sin autor - posible usuario eliminado:', comment.id);
            return false;
          }
          return true;
        });

        // Asegurar que deleted_at existe en cada comentario
        const commentsWithDefaults = validComments.map(comment => ({
          ...comment,
          deleted_at: comment.deleted_at || null
        }));

        return commentsWithDefaults as TaskComment[];
      } catch (error) {
        console.error('Error obteniendo comentarios:', error);
        return [];
      }
    },
    enabled: !!taskId,
    retry: false,
  });

  // Suscripción en tiempo real
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-comments-${taskId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          // Refrescar comentarios y conteo en tiempo real
          queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
          queryClient.refetchQueries({ queryKey: ['task-comments', taskId] });
          queryClient.invalidateQueries({ queryKey: ['unread-comments-count', taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  return query;
}

// Hook para crear un comentario
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      content,
      userId,
      userRole,
    }: {
      taskId: string;
      content: string;
      userId: string;
      userRole: string;
    }) => {
      // Validar que el contenido no esté vacío
      if (!content.trim()) {
        throw new Error('El comentario no puede estar vacío');
      }

      try {
        const insertData: any = {
          task_id: taskId,
          user_id: userId,
          content: content.trim(),
          read_by: [userId], // Inicializar array con el ID del creador
        };

        const { data, error } = await supabase
          .from('task_comments')
          .insert(insertData)
          .select(`
            *,
            author:users_profiles!task_comments_user_id_fkey (
              id,
              full_name,
              role
            )
          `)
          .single();

        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === '42P01') {
            throw new Error('La tabla de comentarios no existe. Ejecuta el script SQL de migración primero.');
          }
          throw error;
        }

        return data as TaskComment;
      } catch (error: any) {
        if (error.message && error.message.includes('does not exist')) {
          throw new Error('La tabla de comentarios no existe. Ejecuta el script SQL de migración primero.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
      // Invalidar el conteo de comentarios sin leer para todos los usuarios
      queryClient.invalidateQueries({ queryKey: ['unread-comments-count', data.task_id] });
      toast.success('Comentario agregado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al agregar el comentario');
    },
  });
}

// Hook para editar un comentario (solo dentro de 5 minutos)
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      taskId,
      content,
      userId,
    }: {
      commentId: string;
      taskId: string;
      content: string;
      userId: string;
    }) => {
      // Validar que el contenido no esté vacío
      if (!content.trim()) {
        throw new Error('El comentario no puede estar vacío');
      }

      // Verificar que el comentario pertenece al usuario
      const { data: comment, error: fetchError } = await supabase
        .from('task_comments')
        .select('user_id, created_at')
        .eq('id', commentId)
        .single();

      if (fetchError) throw fetchError;

      if (comment.user_id !== userId) {
        throw new Error('No tienes permiso para editar este comentario');
      }

      // Verificar que no hayan pasado más de 5 minutos
      const createdAt = new Date(comment.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

      if (diffMinutes > 5) {
        throw new Error('Ya no puedes editar este comentario (límite: 5 minutos)');
      }

      const { data, error } = await supabase
        .from('task_comments')
        .update({
          content: content.trim(),
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select(`
          *,
          author:users_profiles!task_comments_user_id_fkey (
            id,
            full_name,
            role
          )
        `)
        .single();

      if (error) throw error;

      return data as TaskComment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
      toast.success('Comentario editado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al editar el comentario');
    },
  });
}

// Hook para eliminar un comentario (soft delete)
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      taskId,
      userId,
    }: {
      commentId: string;
      taskId: string;
      userId: string;
    }) => {
      try {
        // Verificar que el comentario pertenece al usuario y obtener created_at
        const { data: comment, error: fetchError } = await supabase
          .from('task_comments')
          .select('user_id, created_at, deleted_at')
          .eq('id', commentId)
          .single();

        if (fetchError) {
          // Si la columna deleted_at no existe, intentar sin ella
          if (fetchError.message.includes('deleted_at') || fetchError.code === '42703') {
            const { data: commentWithoutDeleted, error: error2 } = await supabase
              .from('task_comments')
              .select('user_id, created_at')
              .eq('id', commentId)
              .single();

            if (error2) throw error2;

            if (commentWithoutDeleted.user_id !== userId) {
              throw new Error('No tienes permiso para eliminar este comentario');
            }

            // Verificar que no hayan pasado más de 5 minutos
            const createdAt = new Date(commentWithoutDeleted.created_at);
            const now = new Date();
            const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

            if (diffMinutes > 5) {
              throw new Error('Ya no puedes eliminar este comentario (límite: 5 minutos)');
            }

            // Si no existe la columna deleted_at, hacer DELETE físico
            console.warn('Columna deleted_at no existe. Haciendo DELETE físico. Ejecuta MIGRATION_soft_delete_comments.sql');
            console.warn('⚠️ ========================================');
            console.warn('⚠️  ELIMINACIÓN FÍSICA ACTIVADA');
            console.warn('⚠️ ========================================');
            console.warn('⚠️  El mensaje se eliminará completamente');
            console.warn('⚠️  NO quedará el rastro "Mensaje eliminado"');
            console.warn('⚠️ ');
            console.warn('⚠️  Para activar soft delete, ejecuta:');
            console.warn('⚠️  Ver archivo: /EJECUTAR_ESTO_AHORA.md');
            console.warn('⚠️ ========================================');

            const { error: deleteError } = await supabase
              .from('task_comments')
              .delete()
              .eq('id', commentId);

            if (deleteError) throw deleteError;

            return { commentId, taskId };
          }
          throw fetchError;
        }

        if (comment.user_id !== userId) {
          throw new Error('No tienes permiso para eliminar este comentario');
        }

        // Verificar que el comentario no haya sido ya eliminado
        if (comment.deleted_at) {
          throw new Error('Este comentario ya fue eliminado');
        }

        // Verificar que no hayan pasado más de 5 minutos
        const createdAt = new Date(comment.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

        if (diffMinutes > 5) {
          throw new Error('Ya no puedes eliminar este comentario (límite: 5 minutos)');
        }

        // Soft delete: marcar como eliminado en lugar de borrar físicamente
        const { error } = await supabase
          .from('task_comments')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', commentId);

        if (error) throw error;

        return { commentId, taskId };
      } catch (error: any) {
        console.error('Error eliminando comentario:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] });
      toast.success('Mensaje eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar el comentario');
    },
  });
}

// Hook para marcar comentarios como leídos
export function useMarkCommentsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentIds,
      taskId,
      userId,
    }: {
      commentIds: string[];
      taskId: string;
      userId: string;
    }) => {
      if (commentIds.length === 0) return;

      // Para cada comentario, agregar el userId al array read_by si no está
      const promises = commentIds.map(async (commentId) => {
        // Obtener el array actual
        const { data: comment, error: fetchError } = await supabase
          .from('task_comments')
          .select('read_by')
          .eq('id', commentId)
          .single();

        if (fetchError) throw fetchError;

        // Agregar userId si no está en el array
        const currentReadBy = comment?.read_by || [];
        if (!currentReadBy.includes(userId)) {
          const { error: updateError } = await supabase
            .from('task_comments')
            .update({ read_by: [...currentReadBy, userId] })
            .eq('id', commentId);

          if (updateError) throw updateError;
        }
      });

      await Promise.all(promises);

      return { taskId, commentIds };
    },
    onSuccess: (data) => {
      if (data) {
        // Invalidar queries para actualizar la UI
        queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] });
        queryClient.invalidateQueries({ queryKey: ['unread-comments-count', data.taskId] });
      }
    },
    onError: (error: Error) => {
      console.error('Error marcando comentarios como leídos:', error);
    },
  });
}

// Utilidad para verificar si un comentario puede ser editado (5 minutos)
export function canEditComment(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - created.getTime()) / 1000 / 60;
  return diffMinutes <= 5;
}

// Utilidad para formatear tiempo relativo
export function getRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffSeconds < 60) return 'Ahora';
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  const days = Math.floor(diffSeconds / 86400);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  const years = Math.floor(days / 365);
  return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
}
