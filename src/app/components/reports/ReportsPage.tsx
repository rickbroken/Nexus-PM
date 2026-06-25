import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentActions, useRecentAgentActions } from '@/hooks/useAgentActions';
import { usePayments, useRecurringCharges } from '@/hooks/useFinances';
import { useProjects } from '@/hooks/useProjects';
import { usePendingReminders } from '@/hooks/useReminders';
import { useTasks } from '@/hooks/useTasks';
import { formatAgentActionStatus, formatAgentActionType } from '@/lib/agentActionLabels';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { ProjectStatus, TaskStatus } from '@/lib/supabase';

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'En revision',
  done: 'Hechas',
  archived: 'Archivadas',
};

const projectStatusLabels: Record<ProjectStatus, string> = {
  planning: 'Planificacion',
  in_development: 'En desarrollo',
  active: 'Activos',
  paused: 'Pausados',
  completed: 'Completados',
  cancelled: 'Cancelados',
};

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-zinc-500">{text}</p>;
}

export function ReportsPage() {
  const { user } = useAuth();
  const canSeeFinance = user?.role === 'admin' || user?.role === 'advisor';

  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const remindersQuery = usePendingReminders({ limit: 5 });
  const recentActionsQuery = useRecentAgentActions(5);
  const failedActionsQuery = useAgentActions({ status: 'failed', limit: 5 });
  const paymentsQuery = usePayments();
  const recurringChargesQuery = useRecurringCharges();

  const taskCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      archived: 0,
    };

    for (const task of tasksQuery.data ?? []) {
      counts[task.status] += 1;
    }

    return counts;
  }, [tasksQuery.data]);

  const projectCounts = useMemo(() => {
    const counts: Record<ProjectStatus, number> = {
      planning: 0,
      in_development: 0,
      active: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const project of projectsQuery.data ?? []) {
      counts[project.status] += 1;
    }

    return counts;
  }, [projectsQuery.data]);

  const financeSummary = useMemo(() => {
    const payments = paymentsQuery.data ?? [];
    const recurringCharges = recurringChargesQuery.data ?? [];

    return {
      pendingPayments: payments.filter((payment) => payment.status === 'pending'),
      overduePayments: payments.filter((payment) => payment.status === 'overdue'),
      activeRecurringCharges: recurringCharges.filter((charge) => charge.is_active),
    };
  }, [paymentsQuery.data, recurringChargesQuery.data]);

  const isLoading =
    tasksQuery.isLoading ||
    projectsQuery.isLoading ||
    remindersQuery.isLoading ||
    recentActionsQuery.isLoading ||
    failedActionsQuery.isLoading ||
    (canSeeFinance && (paymentsQuery.isLoading || recurringChargesQuery.isLoading));

  const error =
    tasksQuery.error ||
    projectsQuery.error ||
    remindersQuery.error ||
    recentActionsQuery.error ||
    failedActionsQuery.error ||
    (canSeeFinance ? paymentsQuery.error || recurringChargesQuery.error : null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="mt-2 text-zinc-600">Cargando resumen operativo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="mt-2 text-sm text-red-600">
            No se pudo cargar el modulo de reportes. {error instanceof Error ? error.message : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="mt-2 max-w-3xl text-zinc-600">
          Vista consolidada del estado operativo de Nexus-PM para tareas, proyectos,
          recordatorios y actividad reciente del agente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tareas activas"
          value={(tasksQuery.data ?? []).length}
          description="Tareas visibles para tu rol, excluyendo archivadas."
        />
        <MetricCard
          title="Proyectos visibles"
          value={(projectsQuery.data ?? []).length}
          description="Proyectos entregados por las politicas actuales."
        />
        <MetricCard
          title="Recordatorios pendientes"
          value={(remindersQuery.data ?? []).length}
          description="Primeros 5 recordatorios pendientes para seguimiento rapido."
        />
        <MetricCard
          title="Acciones recientes"
          value={(recentActionsQuery.data ?? []).length}
          description="Ultimos eventos registrados por el modulo de agente."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Tareas por estado"
          description="Distribucion de las tareas visibles para el usuario actual."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(taskStatusLabels) as TaskStatus[]).map((status) => (
              <div key={status} className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
                <span className="text-sm font-medium text-zinc-700">{taskStatusLabels[status]}</span>
                <Badge variant={taskCounts[status] > 0 ? 'info' : 'secondary'}>{taskCounts[status]}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Proyectos por estado"
          description="Distribucion actual de proyectos cargados en la plataforma."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((status) => (
              <div key={status} className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
                <span className="text-sm font-medium text-zinc-700">{projectStatusLabels[status]}</span>
                <Badge variant={projectCounts[status] > 0 ? 'default' : 'secondary'}>{projectCounts[status]}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Recordatorios pendientes"
          description="Pendientes inmediatos para no perder seguimiento."
        >
          {(remindersQuery.data ?? []).length === 0 ? (
            <EmptyState text="No hay recordatorios pendientes." />
          ) : (
            <div className="space-y-3">
              {(remindersQuery.data ?? []).map((reminder) => (
                <div key={reminder.id} className="rounded-lg border border-zinc-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-900">{reminder.title}</p>
                    <Badge variant="warning">{reminder.priority}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatDateTime(reminder.remind_at)}
                    {reminder.project?.name ? ` · ${reminder.project.name}` : ''}
                  </p>
                  {reminder.description ? (
                    <p className="mt-2 text-sm text-zinc-600">{reminder.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Acciones del agente recientes"
          description="Últimos eventos auditados del agente registrados en agent_actions."
        >
          {(recentActionsQuery.data ?? []).length === 0 ? (
            <EmptyState text="No hay acciones recientes del agente." />
          ) : (
            <div className="space-y-3">
              {(recentActionsQuery.data ?? []).map((action) => (
                <div key={action.id} className="rounded-lg border border-zinc-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-900">
                      {formatAgentActionType(action.action_type)}
                    </p>
                    <Badge variant={action.status === 'failed' ? 'destructive' : 'success'}>
                      {formatAgentActionStatus(action.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatDateTime(action.created_at)}
                    {action.user?.full_name ? ` · ${action.user.full_name}` : ''}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    {action.project?.name || action.task?.title || action.client?.name || action.entity_type || 'Sin entidad'}
                  </p>
                  {action.error_message ? (
                    <p className="mt-2 text-sm text-red-600">{action.error_message}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Acciones fallidas"
          description="Eventos auditados con fallo que requieren revisión manual."
        >
          {(failedActionsQuery.data ?? []).length === 0 ? (
            <EmptyState text="No hay acciones fallidas recientes." />
          ) : (
            <div className="space-y-3">
              {(failedActionsQuery.data ?? []).map((action) => (
                <div key={action.id} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-red-900">
                      {formatAgentActionType(action.action_type)}
                    </p>
                    <Badge variant="destructive">{formatAgentActionStatus(action.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-red-700">{formatDateTime(action.created_at)}</p>
                  <p className="mt-2 text-sm text-red-800">
                    {action.error_message || 'La accion fallo sin mensaje detallado.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {canSeeFinance ? (
          <SectionCard
            title="Resumen financiero"
            description="Seccion visible solo para admin y advisor."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 px-4 py-3">
                <p className="text-sm text-zinc-500">Pagos pendientes</p>
                <p className="mt-2 text-2xl font-semibold">
                  {financeSummary.pendingPayments.length}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 px-4 py-3">
                <p className="text-sm text-zinc-500">Pagos vencidos</p>
                <p className="mt-2 text-2xl font-semibold">
                  {financeSummary.overduePayments.length}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 px-4 py-3">
                <p className="text-sm text-zinc-500">Cobros recurrentes activos</p>
                <p className="mt-2 text-2xl font-semibold">
                  {financeSummary.activeRecurringCharges.length}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {financeSummary.pendingPayments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="rounded-lg border border-zinc-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-900">Pago pendiente</p>
                    <Badge variant="warning">{formatCurrency(payment.amount)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatDate(payment.payment_date)}
                  </p>
                </div>
              ))}

              {financeSummary.overduePayments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-red-900">Pago vencido</p>
                    <Badge variant="destructive">{formatCurrency(payment.amount)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-red-700">
                    {formatDate(payment.payment_date)}
                  </p>
                </div>
              ))}

              {financeSummary.activeRecurringCharges.slice(0, 5).map((charge) => (
                <div key={charge.id} className="rounded-lg border border-zinc-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-900">{charge.description}</p>
                    <Badge variant="info">{formatCurrency(charge.amount)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    Proximo cobro: {formatDate(charge.next_due_date)}
                  </p>
                </div>
              ))}

              {financeSummary.pendingPayments.length === 0 &&
              financeSummary.overduePayments.length === 0 &&
              financeSummary.activeRecurringCharges.length === 0 ? (
                <EmptyState text="No hay movimientos financieros para mostrar." />
              ) : null}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
