import { useMemo, useState } from 'react';
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
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import Alert from '@/lib/alert';
import { formatAgentActionStatus, formatAgentActionType } from '@/lib/agentActionLabels';
import { useAgentBrief } from '@/hooks/useAgentBrief';
import { useAgentQuickActions } from '@/hooks/useAgentQuickActions';
import { formatCurrencyWithSymbol } from '@/lib/formatters';

type ScheduleDialogState =
  | {
      open: false;
      mode: null;
      itemId?: string;
      value: string;
    }
  | {
      open: true;
      mode: 'postpone-reminder' | 'task-reminder' | 'finance-reminder';
      itemId: string;
      value: string;
      title: string;
      description: string;
      submitLabel: string;
      reminderTitle: string;
      reminderId?: string;
      taskId?: string;
      projectId?: string;
      paymentId?: string;
      recurringChargeId?: string;
      entityType?: 'payment' | 'recurring_charge';
    };

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

function QuickActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
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
  const {
    useCompleteReminder,
    useCancelReminder,
    usePostponeReminder,
    useCreateReminderFromTask,
    useUpdateTaskStatusFromBrief,
    useCreateFinanceReminder,
  } = useAgentQuickActions();
  const completeReminder = useCompleteReminder();
  const cancelReminder = useCancelReminder();
  const postponeReminder = usePostponeReminder();
  const createReminderFromTask = useCreateReminderFromTask();
  const updateTaskStatus = useUpdateTaskStatusFromBrief();
  const createFinanceReminder = useCreateFinanceReminder();

  const [scheduleDialog, setScheduleDialog] = useState<ScheduleDialogState>({
    open: false,
    mode: null,
    value: '',
  });

  const activePendingId = useMemo(() => {
    if (completeReminder.isPending) return `complete:${completeReminder.variables?.reminderId}`;
    if (cancelReminder.isPending) return `cancel:${cancelReminder.variables?.reminderId}`;
    if (postponeReminder.isPending) return `postpone:${postponeReminder.variables?.reminderId}`;
    if (createReminderFromTask.isPending) return `task-reminder:${createReminderFromTask.variables?.task_id}`;
    if (updateTaskStatus.isPending) return `task-status:${updateTaskStatus.variables?.task_id}:${updateTaskStatus.variables?.status}`;
    if (createFinanceReminder.isPending) {
      return `finance-reminder:${createFinanceReminder.variables?.payment_id ?? createFinanceReminder.variables?.recurring_charge_id}`;
    }
    return null;
  }, [
    cancelReminder.isPending,
    cancelReminder.variables,
    completeReminder.isPending,
    completeReminder.variables,
    createFinanceReminder.isPending,
    createFinanceReminder.variables,
    createReminderFromTask.isPending,
    createReminderFromTask.variables,
    postponeReminder.isPending,
    postponeReminder.variables,
    updateTaskStatus.isPending,
    updateTaskStatus.variables,
  ]);

  const isBusy = (key: string) => activePendingId === key;

  const closeDialog = () => {
    if (
      postponeReminder.isPending ||
      createReminderFromTask.isPending ||
      createFinanceReminder.isPending
    ) {
      return;
    }

    setScheduleDialog({
      open: false,
      mode: null,
      value: '',
    });
  };

  const openPostponeDialog = (reminder: { id: string; title: string; remind_at: string }) => {
    setScheduleDialog({
      open: true,
      mode: 'postpone-reminder',
      itemId: reminder.id,
      reminderId: reminder.id,
      title: 'Posponer recordatorio',
      description: `Selecciona una nueva fecha y hora para "${reminder.title}".`,
      submitLabel: 'Posponer',
      reminderTitle: reminder.title,
      value: formatToDateTimeLocal(reminder.remind_at),
    });
  };

  const openTaskReminderDialog = (task: { id: string; project_id?: string; title: string }) => {
    setScheduleDialog({
      open: true,
      mode: 'task-reminder',
      itemId: task.id,
      taskId: task.id,
      projectId: task.project_id,
      title: 'Crear recordatorio desde tarea',
      description: `Se creará el recordatorio "Revisar: ${task.title}".`,
      submitLabel: 'Crear recordatorio',
      reminderTitle: `Revisar: ${task.title}`,
      value: '',
    });
  };

  const openFinanceReminderDialog = (item: {
    id: string;
    project_id?: string;
    entityType: 'payment' | 'recurring_charge';
  }) => {
    setScheduleDialog({
      open: true,
      mode: 'finance-reminder',
      itemId: item.id,
      projectId: item.project_id,
      paymentId: item.entityType === 'payment' ? item.id : undefined,
      recurringChargeId: item.entityType === 'recurring_charge' ? item.id : undefined,
      entityType: item.entityType,
      title: 'Crear recordatorio financiero',
      description: 'Se creará el recordatorio "Revisar cobro/pago pendiente".',
      submitLabel: 'Crear recordatorio',
      reminderTitle: 'Revisar cobro/pago pendiente',
      value: '',
    });
  };

  const handleCompleteReminder = async (reminderId: string, reminderTitle: string) => {
    const result = await Alert.fire({
      title: '¿Completar recordatorio?',
      text: `Se marcará como completado: ${reminderTitle}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, completar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    await completeReminder.mutateAsync({
      reminderId,
      input_text: `Completar recordatorio: ${reminderTitle}`,
    });
  };

  const handleCancelReminder = async (reminderId: string, reminderTitle: string) => {
    const result = await Alert.fire({
      title: '¿Cancelar recordatorio?',
      text: `Se cancelará el recordatorio: ${reminderTitle}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
    });

    if (!result.isConfirmed) return;

    await cancelReminder.mutateAsync({
      reminderId,
      input_text: `Cancelar recordatorio: ${reminderTitle}`,
    });
  };

  const handleTaskStatusChange = async (
    task: { id: string; project_id?: string; title: string },
    status: 'in_progress' | 'review'
  ) => {
    const statusLabel = status === 'review' ? 'enviar a revisión' : 'marcar en progreso';
    const result = await Alert.fire({
      title: '¿Confirmar acción?',
      text: `Se va a ${statusLabel} la tarea: ${task.title}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    await updateTaskStatus.mutateAsync({
      task_id: task.id,
      project_id: task.project_id,
      status,
      review_status: status === 'review' ? 'pending' : null,
      input_text:
        status === 'review'
          ? `Enviar tarea a revisión: ${task.title}`
          : `Marcar tarea en progreso: ${task.title}`,
    });
  };

  const handleSubmitScheduleDialog = async () => {
    if (!scheduleDialog.open || !scheduleDialog.value) {
      Alert.error('Error', 'Debes seleccionar una fecha y hora.');
      return;
    }

    if (scheduleDialog.mode === 'postpone-reminder' && scheduleDialog.reminderId) {
      await postponeReminder.mutateAsync({
        reminderId: scheduleDialog.reminderId,
        remind_at: scheduleDialog.value,
        input_text: `Posponer recordatorio: ${scheduleDialog.reminderTitle}`,
      });
      closeDialog();
      return;
    }

    if (scheduleDialog.mode === 'task-reminder' && scheduleDialog.taskId) {
      await createReminderFromTask.mutateAsync({
        task_id: scheduleDialog.taskId,
        project_id: scheduleDialog.projectId,
        title: scheduleDialog.reminderTitle,
        remind_at: scheduleDialog.value,
      });
      closeDialog();
      return;
    }

    if (scheduleDialog.mode === 'finance-reminder' && scheduleDialog.entityType) {
      await createFinanceReminder.mutateAsync({
        entity_type: scheduleDialog.entityType,
        payment_id: scheduleDialog.paymentId,
        recurring_charge_id: scheduleDialog.recurringChargeId,
        project_id: scheduleDialog.projectId,
        title: scheduleDialog.reminderTitle,
        remind_at: scheduleDialog.value,
      });
      closeDialog();
    }
  };

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
            Vista interna del estado actual de tareas, recordatorios y finanzas visibles para tu rol.
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <QuickActionButton
                        onClick={() =>
                          openTaskReminderDialog({
                            id: task.id,
                            project_id: task.project_id,
                            title: task.title,
                          })
                        }
                        disabled={isBusy(`task-reminder:${task.id}`)}
                      >
                        Crear recordatorio
                      </QuickActionButton>
                      <QuickActionButton
                        onClick={() =>
                          handleTaskStatusChange(
                            { id: task.id, project_id: task.project_id, title: task.title },
                            'in_progress'
                          )
                        }
                        disabled={isBusy(`task-status:${task.id}:in_progress`)}
                      >
                        En progreso
                      </QuickActionButton>
                      <QuickActionButton
                        onClick={() =>
                          handleTaskStatusChange(
                            { id: task.id, project_id: task.project_id, title: task.title },
                            'review'
                          )
                        }
                        disabled={isBusy(`task-status:${task.id}:review`)}
                      >
                        A revisión
                      </QuickActionButton>
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
                      <div className="mt-3 flex flex-wrap gap-2">
                        <QuickActionButton
                          onClick={() => handleCompleteReminder(reminder.id, reminder.title)}
                          disabled={isBusy(`complete:${reminder.id}`)}
                        >
                          Completar
                        </QuickActionButton>
                        <QuickActionButton
                          onClick={() => handleCancelReminder(reminder.id, reminder.title)}
                          disabled={isBusy(`cancel:${reminder.id}`)}
                        >
                          Cancelar
                        </QuickActionButton>
                        <QuickActionButton
                          onClick={() =>
                            openPostponeDialog({
                              id: reminder.id,
                              title: reminder.title,
                              remind_at: reminder.remind_at,
                            })
                          }
                          disabled={isBusy(`postpone:${reminder.id}`)}
                        >
                          Posponer
                        </QuickActionButton>
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <QuickActionButton
                      onClick={() => handleCompleteReminder(reminder.id, reminder.title)}
                      disabled={isBusy(`complete:${reminder.id}`)}
                    >
                      Completar
                    </QuickActionButton>
                    <QuickActionButton
                      onClick={() => handleCancelReminder(reminder.id, reminder.title)}
                      disabled={isBusy(`cancel:${reminder.id}`)}
                    >
                      Cancelar
                    </QuickActionButton>
                    <QuickActionButton
                      onClick={() =>
                        openPostponeDialog({
                          id: reminder.id,
                          title: reminder.title,
                          remind_at: reminder.remind_at,
                        })
                      }
                      disabled={isBusy(`postpone:${reminder.id}`)}
                    >
                      Posponer
                    </QuickActionButton>
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <QuickActionButton
                        onClick={() =>
                          openFinanceReminderDialog({
                            id: payment.id,
                            project_id: payment.project_id,
                            entityType: 'payment',
                          })
                        }
                        disabled={isBusy(`finance-reminder:${payment.id}`)}
                      >
                        Crear recordatorio
                      </QuickActionButton>
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <QuickActionButton
                        onClick={() =>
                          openFinanceReminderDialog({
                            id: payment.id,
                            project_id: payment.project_id,
                            entityType: 'payment',
                          })
                        }
                        disabled={isBusy(`finance-reminder:${payment.id}`)}
                      >
                        Crear recordatorio
                      </QuickActionButton>
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <QuickActionButton
                        onClick={() =>
                          openFinanceReminderDialog({
                            id: charge.id,
                            project_id: charge.project_id,
                            entityType: 'recurring_charge',
                          })
                        }
                        disabled={isBusy(`finance-reminder:${charge.id}`)}
                      >
                        Crear recordatorio
                      </QuickActionButton>
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <QuickActionButton
                        onClick={() =>
                          openFinanceReminderDialog({
                            id: charge.id,
                            project_id: charge.project_id,
                            entityType: 'recurring_charge',
                          })
                        }
                        disabled={isBusy(`finance-reminder:${charge.id}`)}
                      >
                        Crear recordatorio
                      </QuickActionButton>
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

      <Dialog open={scheduleDialog.open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{scheduleDialog.open ? scheduleDialog.title : ''}</DialogTitle>
            <DialogDescription>{scheduleDialog.open ? scheduleDialog.description : ''}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="quick-action-datetime">Fecha y hora</Label>
            <Input
              id="quick-action-datetime"
              type="datetime-local"
              value={scheduleDialog.open ? scheduleDialog.value : ''}
              onChange={(event) =>
                scheduleDialog.open
                  ? setScheduleDialog({
                      ...scheduleDialog,
                      value: event.target.value,
                    })
                  : undefined
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={!!activePendingId}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmitScheduleDialog}
              disabled={
                !scheduleDialog.open ||
                !scheduleDialog.value ||
                postponeReminder.isPending ||
                createReminderFromTask.isPending ||
                createFinanceReminder.isPending
              }
            >
              {scheduleDialog.open ? scheduleDialog.submitLabel : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
