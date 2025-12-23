import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Notification } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useViewingTaskStore } from '../stores/useViewingTaskStore';

// =====================================================
// QUERY: Obtener notificaciones del usuario
// =====================================================

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('[useNotifications] Fetching notifications for user:', user.id);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useNotifications] Error fetching:', error);
        throw error;
      }
      console.log('[useNotifications] Fetched', data?.length, 'notifications');
      return data as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minuto
    gcTime: 300000, // 5 minutos
  });
}

// =====================================================
// QUERY: Contar notificaciones no leídas
// =====================================================

export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minuto
    gcTime: 300000, // 5 minutos
    // NO usar refetchInterval - se actualiza con realtime
  });
}

// =====================================================
// MUTATION: Marcar notificación como leída
// =====================================================

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      console.log('[useMarkAsRead] Marking notification as read:', notificationId);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      console.log('[useMarkAsRead] Successfully marked as read:', notificationId);
    },
    // Actualización optimista
    onMutate: async (notificationId: string) => {
      console.log('[useMarkAsRead] onMutate - Updating optimistically:', notificationId);
      
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread-count', user?.id] });

      // Snapshot del estado anterior (para rollback)
      const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);
      const previousUnreadCount = queryClient.getQueryData(['notifications', 'unread-count', user?.id]);

      // Actualizar optimísticamente las notificaciones
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
        if (!old) return old;
        const updated = old.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        );
        console.log('[useMarkAsRead] Optimistic update - marked notification:', notificationId);
        return updated;
      });

      // Actualizar optimísticamente el contador
      queryClient.setQueryData(['notifications', 'unread-count', user?.id], (old: number | undefined) => {
        const newCount = Math.max(0, (old || 0) - 1);
        console.log('[useMarkAsRead] Unread count updated from', old, 'to', newCount);
        return newCount;
      });

      // Retornar contexto para rollback
      return { previousNotifications, previousUnreadCount };
    },
    onSuccess: () => {
      console.log('[useMarkAsRead] Successfully marked as read, keeping optimistic update');
      // NO invalidamos aquí - la actualización optimista es suficiente
    },
    onError: (error: any, notificationId, context) => {
      console.error('[useMarkAsRead] Error marking notification as read:', notificationId, error);
      // Rollback en caso de error
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.previousNotifications);
        console.log('[useMarkAsRead] Rolled back notifications');
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(['notifications', 'unread-count', user?.id], context.previousUnreadCount);
        console.log('[useMarkAsRead] Rolled back unread count');
      }
      toast.error('Error al marcar como leída');
    },
    // NO usamos onSettled para evitar invalidaciones innecesarias
  });
}

// =====================================================
// MUTATION: Marcar todas como leídas
// =====================================================

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');

      console.log('[useMarkAllAsRead] Marking all as read for user:', user.id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('[useMarkAllAsRead] Error from Supabase:', error);
        throw error;
      }
      console.log('[useMarkAllAsRead] Successfully marked all as read');
    },
    // Actualización optimista
    onMutate: async () => {
      console.log('[useMarkAllAsRead] onMutate - Marking all as read optimistically');
      
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread-count', user?.id] });

      // Snapshot del estado anterior (para rollback)
      const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);
      const previousUnreadCount = queryClient.getQueryData(['notifications', 'unread-count', user?.id]);

      // Actualizar optimísticamente todas las notificaciones
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
        if (!old) return old;
        const updated = old.map((notif) => ({ ...notif, is_read: true }));
        console.log('[useMarkAllAsRead] Optimistic update - marked all as read');
        return updated;
      });

      // Actualizar optimísticamente el contador a 0
      queryClient.setQueryData(['notifications', 'unread-count', user?.id], 0);
      console.log('[useMarkAllAsRead] Unread count set to 0');

      // Retornar contexto para rollback
      return { previousNotifications, previousUnreadCount };
    },
    onSuccess: () => {
      console.log('[useMarkAllAsRead] Successfully marked all as read, keeping optimistic update');
      toast.success('Todas las notificaciones marcadas como leídas');
      // NO invalidamos aquí - la actualización optimista es suficiente
    },
    onError: (error: any, variables, context) => {
      console.error('[useMarkAllAsRead] Error marking all as read:', error);
      // Rollback en caso de error
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.previousNotifications);
        console.log('[useMarkAllAsRead] Rolled back notifications');
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(['notifications', 'unread-count', user?.id], context.previousUnreadCount);
        console.log('[useMarkAllAsRead] Rolled back unread count');
      }
      toast.error('Error al marcar notificaciones como leídas');
    },
    // NO usamos onSettled para evitar invalidaciones innecesarias
  });
}

// =====================================================
// MUTATION: Eliminar notificación
// =====================================================

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      console.log('[useDeleteNotification] Deleting notification:', notificationId);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('[useDeleteNotification] ❌ Error from Supabase:', error);
        console.error('[useDeleteNotification] ❌ Error code:', error.code);
        console.error('[useDeleteNotification] ❌ Error message:', error.message);
        console.error('[useDeleteNotification] ❌ Error details:', error.details);
        console.error('[useDeleteNotification] ❌ Error hint:', error.hint);
        throw error;
      }
      console.log('[useDeleteNotification] ✅ Successfully deleted:', notificationId);
    },
    // Actualización optimista
    onMutate: async (notificationId: string) => {
      console.log('[useDeleteNotification] onMutate - Deleting optimistically:', notificationId);
      
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread-count', user?.id] });

      // Snapshot del estado anterior (para rollback)
      const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);
      const previousUnreadCount = queryClient.getQueryData(['notifications', 'unread-count', user?.id]);

      // Buscar la notificación a eliminar para saber si era no leída
      const notifications = previousNotifications as Notification[] | undefined;
      const notificationToDelete = notifications?.find((n) => n.id === notificationId);
      const wasUnread = notificationToDelete && !notificationToDelete.is_read;

      console.log('[useDeleteNotification] Notification to delete:', notificationToDelete);
      console.log('[useDeleteNotification] Was unread:', wasUnread);

      // Eliminar optimísticamente la notificación
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
        if (!old) return old;
        const filtered = old.filter((notif) => notif.id !== notificationId);
        console.log('[useDeleteNotification] Optimistic update - removed from list. Before:', old.length, 'After:', filtered.length);
        return filtered;
      });

      // Actualizar optimísticamente el contador si era no leída
      if (wasUnread) {
        queryClient.setQueryData(['notifications', 'unread-count', user?.id], (old: number | undefined) => {
          const newCount = Math.max(0, (old || 0) - 1);
          console.log('[useDeleteNotification] Unread count updated from', old, 'to', newCount);
          return newCount;
        });
      }

      // Retornar contexto para rollback
      return { previousNotifications, previousUnreadCount };
    },
    onSuccess: () => {
      console.log('[useDeleteNotification] Successfully deleted, keeping optimistic update');
      // NO invalidamos aquí - la actualización optimista es suficiente
    },
    onError: (error: any, notificationId, context) => {
      console.error('[useDeleteNotification] Error deleting notification:', notificationId, error);
      // Rollback en caso de error
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.previousNotifications);
        console.log('[useDeleteNotification] Rolled back notifications');
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(['notifications', 'unread-count', user?.id], context.previousUnreadCount);
        console.log('[useDeleteNotification] Rolled back unread count');
      }
      toast.error('Error al eliminar notificación');
    },
    // NO usamos onSettled para evitar invalidaciones innecesarias
  });
}

// =====================================================
// MUTATION: Eliminar todas las notificaciones leídas
// =====================================================

export function useDeleteAllRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');

      console.log('[useDeleteAllRead] Deleting all read notifications for user:', user.id);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);

      if (error) {
        console.error('[useDeleteAllRead] ❌ Error from Supabase:', error);
        console.error('[useDeleteAllRead] ❌ Error code:', error.code);
        console.error('[useDeleteAllRead] ❌ Error message:', error.message);
        console.error('[useDeleteAllRead] ❌ Error details:', error.details);
        console.error('[useDeleteAllRead] ❌ Error hint:', error.hint);
        throw error;
      }
      console.log('[useDeleteAllRead] ✅ Successfully deleted all read notifications');
    },
    // Actualización optimista
    onMutate: async () => {
      console.log('[useDeleteAllRead] onMutate - Deleting all read optimistically');
      
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread-count', user?.id] });

      // Snapshot del estado anterior (para rollback)
      const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);
      const previousUnreadCount = queryClient.getQueryData(['notifications', 'unread-count', user?.id]);

      // Eliminar optimísticamente todas las notificaciones leídas
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
        if (!old) return old;
        const filtered = old.filter((notif) => !notif.is_read);
        console.log('[useDeleteAllRead] Optimistic update - kept only unread. Before:', old.length, 'After:', filtered.length);
        return filtered;
      });

      // El contador de no leídas no cambia porque solo eliminamos las leídas
      console.log('[useDeleteAllRead] Unread count unchanged');

      // Retornar contexto para rollback
      return { previousNotifications, previousUnreadCount };
    },
    onSuccess: () => {
      console.log('[useDeleteAllRead] Successfully deleted, keeping optimistic update');
      toast.success('Notificaciones leídas eliminadas');
      // NO invalidamos aquí - la actualización optimista es suficiente
    },
    onError: (error: any, variables, context) => {
      console.error('[useDeleteAllRead] Error deleting all read:', error);
      // Rollback en caso de error
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.previousNotifications);
        console.log('[useDeleteAllRead] Rolled back notifications');
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(['notifications', 'unread-count', user?.id], context.previousUnreadCount);
        console.log('[useDeleteAllRead] Rolled back unread count');
      }
      toast.error('Error al eliminar notificaciones leídas');
    },
    // NO usamos onSettled para evitar invalidaciones innecesarias
  });
}

// =====================================================
// HOOK: Suscribirse a notificaciones en tiempo real
// =====================================================

export function useNotificationsRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Notifications] useNotificationsRealtime called, user:', user);
    
    if (!user?.id) {
      console.log('[Notifications] No user.id, skipping subscription');
      return;
    }

    console.log('[Notifications] Setting up realtime subscription for user:', user.id);

    // Crear un nombre único para el channel
    const channelName = `notifications-${user.id}`;

    // Suscribirse a cambios en la tabla notifications
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          
          // Verificar si el usuario está viendo la tarea relacionada con esta notificación
          const currentViewingTaskId = useViewingTaskStore.getState().viewingTaskId;
          const isTaskCommentNotification = newNotif.type === 'task_commented';
          const isViewingThisTask = currentViewingTaskId === newNotif.entity_id;
          
          // Si es una notificación de comentario Y estoy viendo esa tarea, NO mostrar
          if (isTaskCommentNotification && isViewingThisTask) {
            return; // No agregar al caché ni mostrar toast
          }
          
          // NO invalidamos - agregamos optimísticamente al cache
          queryClient.setQueryData(['notifications', user.id], (old: Notification[] | undefined) => {
            if (!old) return [newNotif];
            
            // Verificar si ya existe (por si acaso)
            const exists = old.some(n => n.id === newNotif.id);
            if (exists) return old;
            
            // Agregar al inicio de la lista
            return [newNotif, ...old];
          });
          
          // Incrementar contador si es no leída
          if (!newNotif.is_read) {
            queryClient.setQueryData(['notifications', 'unread-count', user.id], (old: number | undefined) => {
              return (old || 0) + 1;
            });
          }

          // Mostrar toast con la nueva notificación
          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 5000,
          });
        }
      )
      .subscribe((status) => {
        console.log('[Notifications] Subscription status:', status);
        
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('[Notifications] Error in subscription');
        }
      });

    // Cleanup - MUY IMPORTANTE para evitar memory leaks
    return () => {
      console.log('[Notifications] Cleaning up realtime subscription');
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
    // CRÍTICO: Solo user.id en dependencias - queryClient es estable
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}