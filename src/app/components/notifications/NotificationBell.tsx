import { Bell, Check, CheckCheck, X, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllRead,
  useNotificationsRealtime,
} from '../../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '../ui/scroll-area';
import { memo } from 'react';

export const NotificationBell = memo(function NotificationBell() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllRead = useDeleteAllRead();

  // Activar realtime - Solo se ejecuta una vez por usuario
  useNotificationsRealtime();

  // Contar notificaciones leídas
  const readCount = notifications.filter(n => n.is_read).length;

  const handleNotificationClick = (notification: any) => {
    // Marcar como leída
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navegar si tiene URL
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    console.log('[NotificationBell] handleDelete called for:', notificationId);
    e.stopPropagation();
    deleteNotification.mutate(notificationId);
    console.log('[NotificationBell] Delete mutation triggered');
  };

  const handleDeleteAllRead = () => {
    console.log('[NotificationBell] handleDeleteAllRead called');
    deleteAllRead.mutate();
    console.log('[NotificationBell] Delete all read mutation triggered');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return '📋';
      case 'task_ready_review':
        return '✅';
      case 'task_approved':
        return '🎉';
      case 'task_rejected':
        return '❌';
      case 'task_commented':
        return '💬';
      case 'payment_received':
        return '💵';
      case 'payment_large':
        return '💰';
      case 'recurring_charge_due_soon':
        return '💳';
      case 'user_registered':
        return '👤';
      case 'project_created':
        return '🚀';
      case 'project_updated':
        return '📝';
      default:
        return '🔔';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0" style={{ backgroundColor: '#ffffff' }}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              className="h-7 px-2 text-xs hover:bg-gray-100"
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Cargando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">Sin notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative px-4 py-2.5 cursor-pointer transition-colors group ${
                    !notification.is_read 
                      ? 'bg-blue-50/30 hover:bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Indicador de no leída */}
                  {!notification.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* Icono */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h4 className={`text-sm leading-tight ${
                          !notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        <span className="absolute top-2.5 right-4 text-[11px] text-gray-400 opacity-100 group-hover:opacity-0 transition-opacity">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: es,
                          }).replace('hace ', '')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-snug line-clamp-2">
                        {notification.message}
                      </p>
                    </div>

                    {/* Acciones - visible al hover */}
                    <div className="absolute top-2.5 right-4 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <button
                          className="p-1 rounded hover:bg-blue-100 text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead.mutate(notification.id);
                          }}
                          title="Marcar como leída"
                          disabled={markAsRead.isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                        onClick={(e) => handleDelete(e, notification.id)}
                        title="Eliminar"
                        disabled={deleteNotification.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {readCount > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{readCount} leída{readCount !== 1 ? 's' : ''}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteAllRead()}
              className="h-7 px-2 text-xs hover:bg-red-50 text-red-600 hover:text-red-700"
              disabled={deleteAllRead.isPending}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Eliminar leídas
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});