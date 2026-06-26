import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CreditCard,
  FileClock,
  ListTodo,
  ReceiptText,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { formatAgentActionStatus, formatAgentActionType } from '@/lib/agentActionLabels';
import { useAgentBrief } from '@/hooks/useAgentBrief';
import { formatCurrencyWithSymbol } from '@/lib/formatters';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-CO');
}

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString('es-CO');
}

function formatToDateTimeLocal(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function getPriorityVariant(priority?: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'warning';
    case 'low':
      return 'secondary';
    default:
      return 'info';
  }
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-zinc-500">{text}</p>;
}

function BriefListSection({
  title,
  description,
  emptyText,
  children,
}: {
  title: string;
  description?: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {hasItems ? <div className="space-y-3">{children}</div> : <EmptyState text={emptyText} />}
      </CardContent>
    </Card>
  );
}

export function AgentOperationalBrief() {
  const { data, isLoading, error } = useAgentBrief();
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen operativo</CardTitle>
          <CardDescription>Cargando datos reales de Nexus-PM...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen operativo</CardTitle>
          <CardDescription>No se pudo cargar el resumen operativo en este momento.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statCards = [
    {
      key: 'pendingTasks',
      title: 'Tareas pendientes',
      value: data.stats.pendingTasks,
      icon: ListTodo,
      show: data.showTasks,
    },
    {
      key: 'overdueTasks',
      title: 'Tareas vencidas',
      value: data.stats.overdueTasks,
      icon: AlertTriangle,
      show: data.showTasks,
    },
    {
      key: 'pendingReminders',
      title: 'Recordatorios pendientes',
      value: data.stats.pendingReminders,
      icon: BellRing,
      show: true,
    },
    {
      key: 'upcomingReminders24h',
      title: 'Próximos 24h',
      value: data.stats.upcomingReminders24h,
      icon: CalendarClock,
      show: true,
    },
    {
      key: 'pendingPayments',
      title: 'Pagos pendientes',
      value: data.stats.pendingPayments,
      icon: CreditCard,
      show: data.canSeeFinance,
    },
    {
      key: 'overduePayments',
      title: 'Pagos vencidos',
      value: data.stats.overduePayments,
      icon: Wallet,
      show: data.canSeeFinance,
    },
    {
      key: 'upcomingRecurringCharges',
      title: 'Cobros próximos',
      value: data.stats.upcomingRecurringCharges,
      icon: ReceiptText,
      show: data.canSeeFinance,
    },
    {
      key: 'overdueRecurringCharges',
      title: 'Cobros vencidos',
      value: data.stats.overdueRecurringCharges,
      icon: FileClock,
      show: data.canSeeFinance,
    },
  ].filter((item) => item.show);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Resumen operativo</CardTitle>
          <CardDescription>
            Vista de monitoreo del estado actual de tareas, recordatorios y finanzas visibles para tu rol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">{stat.title}</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-900">{stat.value}</p>
                  </div>
                  <stat.icon className="h-5 w-5 text-zinc-500" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {data.showTasks ? (
              <BriefListSection
                title="Tareas vencidas"
                description="Tareas activas con fecha menor a hoy."
                emptyText="Sin tareas vencidas."
              >
                {data.tasks.overdue.map((task) => (
                  <div key={task.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{task.title}</p>
                        <p className="text-sm text-zinc-500">{task.project?.name || 'Sin proyecto'}</p>
                        <p className="text-xs text-zinc-400">
                          Vence: {task.due_date ? formatDateOnly(task.due_date) : 'Sin fecha'}
                        </p>
                      </div>
                      <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                    </div>
                  </div>
                ))}
              </BriefListSection>
            ) : null}

            <BriefListSection
              title="Recordatorios próximos"
              description="Ventana de 24 horas y lista general ordenada."
              emptyText="Sin recordatorios próximos."
            >
              {data.reminders.upcoming24h.length > 0
                ? data.reminders.upcoming24h.map((reminder) => (
                    <div key={reminder.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-900">{reminder.title}</p>
                          <p className="text-sm text-zinc-500">
                            {reminder.project?.name || 'Sin proyecto'} · {reminder.task?.title || 'Sin tarea'}
                          </p>
                          <p className="text-xs text-zinc-400">{formatDateTime(reminder.remind_at)}</p>
                        </div>
                        <Badge variant={getPriorityVariant(reminder.priority)}>{reminder.priority}</Badge>
                      </div>
                    </div>
                  ))
                : null}
            </BriefListSection>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <BriefListSection
              title="Próximos recordatorios"
              description="Listado general ordenado por fecha."
              emptyText="Sin recordatorios próximos."
            >
              {data.reminders.upcomingGeneral.map((reminder) => (
                <div key={reminder.id} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">{reminder.title}</p>
                      <p className="text-sm text-zinc-500">{reminder.project?.name || 'Sin proyecto'}</p>
                      <p className="text-xs text-zinc-400">{formatDateTime(reminder.remind_at)}</p>
                    </div>
                    <Badge variant={getPriorityVariant(reminder.priority)}>{reminder.priority}</Badge>
                  </div>
                </div>
              ))}
            </BriefListSection>

            {data.canSeeFinance ? (
              <BriefListSection
                title="Pagos pendientes"
                description="Pagos visibles con estado pendiente."
                emptyText="Sin pagos pendientes."
              >
                {data.finances.pendingPayments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{payment.project?.name || 'Sin proyecto'}</p>
                        <p className="text-sm text-zinc-500">{payment.reference || 'Sin referencia'}</p>
                        <p className="text-xs text-zinc-400">Fecha: {formatDateOnly(payment.payment_date)}</p>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">
                        {formatCurrencyWithSymbol(payment.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </BriefListSection>
            ) : null}
          </div>

          {data.canSeeFinance ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <BriefListSection
                title="Pagos vencidos"
                description="Pagos marcados como vencidos."
                emptyText="Sin pagos vencidos."
              >
                {data.finances.overduePayments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{payment.project?.name || 'Sin proyecto'}</p>
                        <p className="text-sm text-zinc-500">{payment.reference || 'Sin referencia'}</p>
                        <p className="text-xs text-zinc-400">Fecha: {formatDateOnly(payment.payment_date)}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        {formatCurrencyWithSymbol(payment.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </BriefListSection>

              <BriefListSection
                title="Cobros recurrentes próximos"
                description="Cobros activos con vencimiento cercano."
                emptyText="Sin cobros próximos."
              >
                {data.finances.upcomingRecurringCharges.map((charge) => (
                  <div key={charge.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{charge.description}</p>
                        <p className="text-sm text-zinc-500">{charge.project?.name || 'Sin proyecto'}</p>
                        <p className="text-xs text-zinc-400">Vence: {formatDateOnly(charge.next_due_date)}</p>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">
                        {formatCurrencyWithSymbol(charge.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </BriefListSection>
            </div>
          ) : null}

          {data.canSeeFinance ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <BriefListSection
                title="Cobros recurrentes vencidos"
                description="Cobros activos con fecha menor a hoy."
                emptyText="Sin cobros vencidos."
              >
                {data.finances.overdueRecurringCharges.map((charge) => (
                  <div key={charge.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{charge.description}</p>
                        <p className="text-sm text-zinc-500">{charge.project?.name || 'Sin proyecto'}</p>
                        <p className="text-xs text-zinc-400">Vence: {formatDateOnly(charge.next_due_date)}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        {formatCurrencyWithSymbol(charge.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </BriefListSection>

              <BriefListSection
                title="Acciones financieras recientes"
                description="Auditoría breve de eventos recientes sobre pagos y cobros."
                emptyText="Sin acciones financieras recientes."
              >
                {data.actions.recentFinancial.map((action) => (
                  <div key={action.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">
                          {formatAgentActionType(action.action_type)}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {action.project?.name || action.user?.full_name || 'Sin contexto'}
                        </p>
                        <p className="text-xs text-zinc-400">{formatDateTime(action.created_at)}</p>
                      </div>
                      <Badge
                        variant={
                          action.status === 'failed'
                            ? 'destructive'
                            : action.status === 'success'
                              ? 'success'
                              : 'warning'
                        }
                      >
                        {formatAgentActionStatus(action.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </BriefListSection>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
