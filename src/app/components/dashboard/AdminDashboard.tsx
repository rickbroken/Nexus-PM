import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { FolderKanban, CheckSquare, DollarSign, Users, AlertCircle } from 'lucide-react';

export function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [projects, tasks, users, recurringCharges] = await Promise.all([
        supabase.from('projects').select('id, status').eq('status', 'active'),
        supabase.from('tasks').select('id, status'),
        supabase.from('users_profiles').select('id, is_active').eq('is_active', true),
        supabase.from('recurring_charges').select('id, next_due_date, is_active').eq('is_active', true),
      ]);

      const openTasks = tasks.data?.filter(t => !['done', 'cancelled'].includes(t.status)).length || 0;
      const dueSoon = recurringCharges.data?.filter(c => {
        const daysUntil = Math.ceil((new Date(c.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30 && daysUntil >= 0;
      }).length || 0;

      return {
        activeProjects: projects.data?.length || 0,
        openTasks,
        activeUsers: users.data?.length || 0,
        upcomingCharges: dueSoon,
      };
    },
  });

  const statCards = [
    {
      title: 'Proyectos Activos',
      value: stats?.activeProjects || 0,
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Tareas Abiertas',
      value: stats?.openTasks || 0,
      icon: CheckSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Usuarios Activos',
      value: stats?.activeUsers || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Cobros Próximos (30d)',
      value: stats?.upcomingCharges || 0,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Dashboard Administrativo</h1>
        <p className="text-zinc-600 mt-1">Vista general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-zinc-900">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-500 text-sm">Registro de auditoría disponible próximamente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-500 text-sm">Sin alertas críticas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
