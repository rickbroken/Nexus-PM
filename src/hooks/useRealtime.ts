import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface UseRealtimeOptions {
  table: string;
  event?: RealtimeEvent | '*';
  queryKey?: string[];
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
}

/**
 * Hook para suscribirse a cambios en tiempo real de Supabase
 * Invalida automáticamente las queries de React Query cuando hay cambios
 */
export function useRealtime({
  table,
  event = '*',
  queryKey,
  onInsert,
  onUpdate,
  onDelete,
  filter,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Evitar doble suscripción en React Strict Mode
    if (isSubscribedRef.current) {
      console.log(`[Realtime] Already subscribed to ${table}, skipping...`);
      return;
    }

    console.log(`[Realtime] Setting up subscription for table: ${table}`);
    isSubscribedRef.current = true;

    // Crear canal con nombre único que incluya filtro si existe
    const channelName = filter 
      ? `realtime:${table}:${filter.replace(/[=.]/g, '-')}` 
      : `realtime:${table}`;
    
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Configurar el listener
    channel.on(
      'postgres_changes',
      {
        event: event,
        schema: 'public',
        table: table,
        filter: filter,
      },
      (payload) => {
        console.log(`[Realtime] Event on ${table}:`, payload.eventType);

        // Invalidar queries relacionadas automáticamente
        if (queryKey) {
          queryClient.invalidateQueries({ queryKey, exact: false });
        }

        // Llamar a los callbacks específicos
        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload.new);
            break;
          case 'UPDATE':
            onUpdate?.(payload.new);
            break;
          case 'DELETE':
            onDelete?.(payload.old);
            break;
        }
      }
    );

    // Suscribirse al canal
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✓ Subscribed to ${table} realtime updates`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`✗ Error subscribing to ${table}`);
        console.warn(`Realtime no disponible para ${table}. La app funcionará sin actualizaciones en tiempo real.`);
        isSubscribedRef.current = false;
      } else if (status === 'TIMED_OUT') {
        console.warn(`⏱ Timeout subscribing to ${table}. Continuando sin realtime.`);
        isSubscribedRef.current = false;
      } else if (status === 'CLOSED') {
        console.log(`[Realtime] Channel closed for ${table}`);
        isSubscribedRef.current = false;
      }
    });

    // Cleanup: desuscribirse al desmontar - MUY IMPORTANTE
    return () => {
      console.log(`[Realtime] Cleanup for ${table}`);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isSubscribedRef.current = false;
    };
    // CRÍTICO: Solo re-suscribir si cambia table o filter
  }, [table, filter]); // queryClient es estable, callbacks son opcionales
}

/**
 * Hook específico para tareas en tiempo real
 */
export function useTasksRealtime(projectId?: string) {
  return useRealtime({
    table: 'tasks',
    // Invalidar TODAS las queries de tasks, sin importar los parámetros
    queryKey: ['tasks'],
    filter: projectId ? `project_id=eq.${projectId}` : undefined,
  });
}

/**
 * Hook específico para proyectos en tiempo real
 */
export function useProjectsRealtime() {
  return useRealtime({
    table: 'projects',
    queryKey: ['projects'],
  });
}

/**
 * Hook específico para clientes en tiempo real
 */
export function useClientsRealtime() {
  return useRealtime({
    table: 'clients',
    queryKey: ['clients'],
  });
}

/**
 * Hook específico para pagos en tiempo real
 */
export function usePaymentsRealtime(projectId?: string) {
  return useRealtime({
    table: 'payments',
    // Invalidar TODAS las queries de payments
    queryKey: ['payments'],
    filter: projectId ? `project_id=eq.${projectId}` : undefined,
  });
}

/**
 * Hook específico para credenciales en tiempo real
 */
export function useCredentialsRealtime(projectId?: string) {
  return useRealtime({
    table: 'project_credentials',
    // Invalidar TODAS las queries de credentials
    queryKey: ['credentials'],
    filter: projectId ? `project_id=eq.${projectId}` : undefined,
  });
}

/**
 * Hook específico para usuarios en tiempo real
 */
export function useUsersRealtime() {
  return useRealtime({
    table: 'users_profiles',
    queryKey: ['users'],
  });
}

/**
 * Hook para notificaciones en tiempo real
 * Escucha múltiples tablas y muestra notificaciones toast
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Evitar doble suscripción en React Strict Mode
    if (isSubscribedRef.current) {
      console.log('[RealtimeNotifications] Already subscribed, skipping...');
      return;
    }

    console.log('[RealtimeNotifications] Setting up multi-table subscription');
    isSubscribedRef.current = true;
    const channels: RealtimeChannel[] = [];

    // Suscribirse a múltiples tablas para notificaciones
    const tables = ['tasks', 'projects', 'payments'];

    tables.forEach(table => {
      const channel = supabase
        .channel(`notifications:${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          (payload) => {
            console.log(`[RealtimeNotifications] ${table} changed:`, payload.eventType);
            
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: [table], exact: false });
          }
        )
        .subscribe();

      channels.push(channel);
    });

    channelsRef.current = channels;

    // Cleanup - MUY IMPORTANTE
    return () => {
      console.log('[RealtimeNotifications] Cleanup multi-table subscription');
      channelsRef.current.forEach(channel => {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      isSubscribedRef.current = false;
    };
  }, []); // Sin dependencias - solo montar/desmontar
}