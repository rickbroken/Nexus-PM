import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { BarChart3, DollarSign, Users, Calendar, Download } from 'lucide-react';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ReportsPage() {
  const [timeRange, setTimeRange] = useState('6months');
  
  // Obtener datos de tareas por estado
  const { data: tasksByStatus } = useQuery({
    queryKey: ['reports', 'tasks-by-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('status');
      
      if (error) throw error;

      const grouped = data.reduce((acc: Record<string, number>, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      const statusLabels: Record<string, string> = {
        todo: 'Por hacer',
        in_progress: 'En progreso',
        review: 'En revisión',
        done: 'Completado',
      };

      return Object.entries(grouped).map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
      }));
    },
  });

  // Obtener datos de proyectos por estado
  const { data: projectsByStatus } = useQuery({
    queryKey: ['reports', 'projects-by-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('status');
      
      if (error) throw error;

      const grouped = data.reduce((acc: Record<string, number>, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {});

      const statusLabels: Record<string, string> = {
        planning: 'Planificación',
        active: 'Activo',
        paused: 'Pausado',
        completed: 'Completado',
        cancelled: 'Cancelado',
      };

      return Object.entries(grouped).map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
      }));
    },
  });

  // Obtener ingresos por mes
  const { data: revenueByMonth } = useQuery({
    queryKey: ['reports', 'revenue-by-month', timeRange],
    queryFn: async () => {
      const months = parseInt(timeRange.replace('months', ''));
      const startDate = startOfMonth(subMonths(new Date(), months - 1));
      
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_date, status')
        .eq('status', 'paid')
        .gte('payment_date', format(startDate, 'yyyy-MM-dd'));
      
      if (error) throw error;

      const grouped = data.reduce((acc: Record<string, number>, payment) => {
        const month = format(new Date(payment.payment_date), 'MMM yyyy', { locale: es });
        acc[month] = (acc[month] || 0) + parseFloat(payment.amount);
        return acc;
      }, {});

      return Object.entries(grouped).map(([month, amount]) => ({
        month,
        ingresos: amount,
      }));
    },
  });

  // Obtener productividad de equipo
  const { data: teamProductivity } = useQuery({
    queryKey: ['reports', 'team-productivity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          assigned_to,
          status,
          users_profiles!tasks_assigned_to_fkey (
            full_name
          )
        `);
      
      if (error) throw error;

      const grouped = data.reduce((acc: Record<string, any>, task) => {
        const userId = task.assigned_to;
        const userName = task.users_profiles?.full_name || 'Sin asignar';
        
        if (!userId) return acc;

        if (!acc[userId]) {
          acc[userId] = {
            name: userName,
            total: 0,
            completadas: 0,
            en_progreso: 0,
          };
        }

        acc[userId].total += 1;
        if (task.status === 'done') acc[userId].completadas += 1;
        if (task.status === 'in_progress') acc[userId].en_progreso += 1;

        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  // Obtener costos vs ingresos
  const { data: costsVsRevenue } = useQuery({
    queryKey: ['reports', 'costs-vs-revenue', timeRange],
    queryFn: async () => {
      const months = parseInt(timeRange.replace('months', ''));
      const startDate = startOfMonth(subMonths(new Date(), months - 1));
      
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('status', 'paid')
        .gte('payment_date', format(startDate, 'yyyy-MM-dd'));

      const { data: costs } = await supabase
        .from('project_costs')
        .select('amount, cost_date')
        .gte('cost_date', format(startDate, 'yyyy-MM-dd'));

      const revenueByMonth: Record<string, number> = {};
      const costsByMonth: Record<string, number> = {};

      payments?.forEach(p => {
        const month = format(new Date(p.payment_date), 'MMM yyyy', { locale: es });
        revenueByMonth[month] = (revenueByMonth[month] || 0) + parseFloat(p.amount);
      });

      costs?.forEach(c => {
        const month = format(new Date(c.cost_date), 'MMM yyyy', { locale: es });
        costsByMonth[month] = (costsByMonth[month] || 0) + parseFloat(c.amount);
      });

      const allMonths = new Set([...Object.keys(revenueByMonth), ...Object.keys(costsByMonth)]);

      return Array.from(allMonths).map(month => ({
        month,
        ingresos: revenueByMonth[month] || 0,
        costos: costsByMonth[month] || 0,
        ganancia: (revenueByMonth[month] || 0) - (costsByMonth[month] || 0),
      }));
    },
  });

  const handleExport = () => {
    // Implementar exportación a CSV/Excel
    Swal.fire({
      title: 'Función de exportación próximamente',
      text: 'Esta función aún no está disponible. Estamos trabajando para agregarla en una próxima actualización.',
      icon: 'info',
      confirmButtonText: 'Entendido'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes y Analytics</h1>
          <p className="text-zinc-600 mt-1">
            Visualiza métricas y estadísticas del sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="12months">Último año</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Calendar className="h-4 w-4" />
            Proyectos
          </TabsTrigger>
        </TabsList>

        {/* Resumen General */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tareas por Estado</CardTitle>
                <CardDescription>Distribución actual de tareas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tasksByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tasksByStatus?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proyectos por Estado</CardTitle>
                <CardDescription>Estado actual de proyectos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reporte Financiero */}
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos vs Costos</CardTitle>
              <CardDescription>Comparación mensual de ingresos y gastos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={costsVsRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="costos" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="ganancia" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingresos Mensuales</CardTitle>
              <CardDescription>Evolución de ingresos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ingresos" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reporte de Equipo */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productividad del Equipo</CardTitle>
              <CardDescription>Tareas completadas por miembro</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={teamProductivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3b82f6" name="Total" />
                  <Bar dataKey="completadas" fill="#10b981" name="Completadas" />
                  <Bar dataKey="en_progreso" fill="#f59e0b" name="En Progreso" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reporte de Proyectos */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Proyectos</CardTitle>
              <CardDescription>Análisis detallado de proyectos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={projectsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectsByStatus?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}