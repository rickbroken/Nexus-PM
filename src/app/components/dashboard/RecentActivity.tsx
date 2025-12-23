import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FolderKanban,
  CheckSquare,
  DollarSign,
  UserPlus,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'project' | 'task' | 'payment' | 'user' | 'project_member';
  action: 'created' | 'updated' | 'completed' | 'assigned';
  title: string;
  description: string;
  user: {
    full_name: string;
    avatar_url?: string;
  } | null;
  timestamp: Date;
  metadata?: any;
}

export function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const activities: Activity[] = [];

      // Obtener proyectos recientes
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          created_at,
          users_profiles!projects_created_by_fkey (
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (projects) {
        projects.forEach(project => {
          activities.push({
            id: `project-${project.id}`,
            type: 'project',
            action: 'created',
            title: 'Nuevo proyecto creado',
            description: project.name,
            user: project.users_profiles,
            timestamp: new Date(project.created_at),
          });
        });
      }

      // Obtener tareas recientes
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          created_at,
          completed_at,
          users_profiles!tasks_created_by_fkey (
            full_name,
            avatar_url
          ),
          assignee:users_profiles!tasks_assigned_to_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (tasks) {
        tasks.forEach(task => {
          activities.push({
            id: `task-${task.id}`,
            type: 'task',
            action: task.status === 'done' ? 'completed' : 'created',
            title: task.status === 'done' ? 'Tarea completada' : 'Nueva tarea',
            description: task.title,
            user: task.users_profiles,
            timestamp: new Date(task.completed_at || task.created_at),
            metadata: {
              assignee: task.assignee?.full_name,
              status: task.status,
            },
          });
        });
      }

      // Obtener pagos recientes
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          status,
          projects (name),
          users_profiles!payments_created_by_fkey (
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (payments) {
        payments.forEach(payment => {
          activities.push({
            id: `payment-${payment.id}`,
            type: 'payment',
            action: 'created',
            title: 'Pago registrado',
            description: `$${payment.amount} - ${payment.projects?.name || 'Sin proyecto'}`,
            user: payment.users_profiles,
            timestamp: new Date(payment.payment_date),
            metadata: {
              status: payment.status,
              amount: payment.amount,
            },
          });
        });
      }

      // Obtener nuevos miembros de proyecto
      const { data: members } = await supabase
        .from('project_members')
        .select(`
          id,
          added_at,
          projects (name),
          users_profiles!project_members_user_id_fkey (
            full_name,
            avatar_url
          ),
          added_by:users_profiles!project_members_added_by_fkey (
            full_name
          )
        `)
        .order('added_at', { ascending: false })
        .limit(5);

      if (members) {
        members.forEach(member => {
          activities.push({
            id: `member-${member.id}`,
            type: 'project_member',
            action: 'assigned',
            title: 'Miembro añadido a proyecto',
            description: `${member.users_profiles?.full_name || 'Usuario'} → ${member.projects?.name || 'Proyecto'}`,
            user: member.added_by ? { full_name: member.added_by.full_name } : null,
            timestamp: new Date(member.added_at),
          });
        });
      }

      // Ordenar todas las actividades por fecha
      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="h-4 w-4 text-blue-500" />;
      case 'task':
        return <CheckSquare className="h-4 w-4 text-green-500" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-yellow-500" />;
      case 'project_member':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadge = (action: Activity['action']) => {
    const variants: Record<string, { label: string; color: string }> = {
      created: { label: 'Creado', color: 'bg-blue-100 text-blue-800' },
      updated: { label: 'Actualizado', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completado', color: 'bg-green-100 text-green-800' },
      assigned: { label: 'Asignado', color: 'bg-purple-100 text-purple-800' },
    };

    const variant = variants[action] || { label: action, color: 'bg-gray-100 text-gray-800' };

    return (
      <Badge className={`text-xs ${variant.color}`}>
        {variant.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimas acciones en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Actividad Reciente
        </CardTitle>
        <CardDescription>
          Últimas acciones en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0"
                >
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{activity.title}</p>
                          {getActionBadge(activity.action)}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {activity.description}
                        </p>
                        {activity.metadata?.assignee && (
                          <p className="text-xs text-gray-500 mt-1">
                            Asignado a: {activity.metadata.assignee}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {activity.user && (
                        <>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={activity.user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {activity.user.full_name
                                ?.split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-500">
                            {activity.user.full_name}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                        </>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(activity.timestamp, {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No hay actividad reciente</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
