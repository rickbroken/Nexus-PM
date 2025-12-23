import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Bell, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useViewingTaskStore } from '@/stores/useViewingTaskStore';

interface Notification {
  id: string;
  type: 'task' | 'project' | 'payment' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: any;
}

export function NotificationsPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Configurar listeners en tiempo real
    const setupRealtimeListeners = () => {
      // Listener para tareas
      const tasksChannel = supabase
        .channel('notifications-tasks')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tasks',
            filter: `assigned_to=eq.${user.id}`,
          },
          (payload) => {
            addNotification({
              type: 'task',
              title: 'Nueva tarea asignada',
              message: `Se te ha asignado: ${payload.new.title}`,
              data: payload.new,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tasks',
            filter: `assigned_to=eq.${user.id}`,
          },
          (payload) => {
            if (payload.old.status !== payload.new.status) {
              addNotification({
                type: 'task',
                title: 'Tarea actualizada',
                message: `"${payload.new.title}" cambió a ${getStatusLabel(payload.new.status)}`,
                data: payload.new,
              });
            }
          }
        )
        .subscribe();

      // Listener para proyectos
      const projectsChannel = supabase
        .channel('notifications-projects')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'project_members',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            // Obtener nombre del proyecto
            const { data: project } = await supabase
              .from('projects')
              .select('name')
              .eq('id', payload.new.project_id)
              .single();

            addNotification({
              type: 'project',
              title: 'Añadido a proyecto',
              message: `Fuiste añadido al proyecto: ${project?.name || 'Sin nombre'}`,
              data: payload.new,
            });
          }
        )
        .subscribe();

      // Listener para comentarios
      const commentsChannel = supabase
        .channel('notifications-comments')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'task_comments',
          },
          async (payload) => {
            // Acceder al store directamente para evitar problemas de closure
            const currentViewingTaskId = useViewingTaskStore.getState().viewingTaskId;
            
            console.log('🔔 Comentario recibido:', {
              taskId: payload.new.task_id,
              comentarioDeUserId: payload.new.user_id,
              miUserId: user.id,
              estoyViendoTarea: currentViewingTaskId,
              esLaMismaTarea: currentViewingTaskId === payload.new.task_id,
            });
            
            // Verificar si es una tarea del usuario
            const { data: task } = await supabase
              .from('tasks')
              .select('title, assigned_to')
              .eq('id', payload.new.task_id)
              .single();

            // Solo notificar si:
            // 1. Es una tarea asignada al usuario
            // 2. El comentario NO es del propio usuario
            // 3. El usuario NO está viendo esa tarea en este momento
            if (
              task?.assigned_to === user.id && 
              payload.new.user_id !== user.id &&
              currentViewingTaskId !== payload.new.task_id
            ) {
              console.log('✅ Mostrando notificación de comentario');
              addNotification({
                type: 'task',
                title: 'Nuevo comentario',
                message: `Nueva respuesta en: ${task.title}`,
                data: payload.new,
              });
            } else {
              console.log('❌ NO mostrando notificación porque:', {
                esAsignadaAMi: task?.assigned_to === user.id,
                noEsMiComentario: payload.new.user_id !== user.id,
                noEstoyViendoLaTarea: currentViewingTaskId !== payload.new.task_id,
              });
            }
          }
        )
        .subscribe();

      // Listener para pagos (solo admins y advisors)
      const paymentsChannel = supabase
        .channel('notifications-payments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              addNotification({
                type: 'payment',
                title: 'Nuevo pago registrado',
                message: `Pago de $${payload.new.amount} registrado`,
                data: payload.new,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(projectsChannel);
        supabase.removeChannel(commentsChannel);
        supabase.removeChannel(paymentsChannel);
      };
    };

    const cleanup = setupRealtimeListeners();

    return () => {
      cleanup();
    };
  }, [user]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      read: false,
      createdAt: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Mantener solo 50

    // Mostrar notificación del navegador si está permitido
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon.png',
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      todo: 'Por hacer',
      in_progress: 'En progreso',
      review: 'En revisión',
      done: 'Completado',
    };
    return labels[status] || status;
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'project':
        return <Info className="h-4 w-4 text-green-500" />;
      case 'payment':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notificaciones</SheetTitle>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Marcar todas como leídas
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs"
                >
                  Limpiar todo
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      notification.read
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${notification.read ? 'font-normal' : 'font-semibold'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {index < notifications.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}