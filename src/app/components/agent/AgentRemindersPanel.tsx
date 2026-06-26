import { Clock3 } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import type { Reminder } from '@/lib/supabase';

interface AgentRemindersPanelProps {
  reminders: Reminder[];
  isLoading?: boolean;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CO');
}

function getStatusVariant(status: Reminder['status']) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'destructive';
    case 'sent':
      return 'info';
    default:
      return 'warning';
  }
}

function getPriorityVariant(priority: Reminder['priority']) {
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

export function AgentRemindersPanel({ reminders, isLoading }: AgentRemindersPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recordatorios registrados</h3>
        <span className="text-sm text-zinc-500">{reminders.length} elemento(s)</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Cargando recordatorios...</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay recordatorios creados todavia.</p>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-zinc-900">{reminder.title}</h4>
                    <Badge variant={getPriorityVariant(reminder.priority)}>{reminder.priority}</Badge>
                    <Badge variant={getStatusVariant(reminder.status)}>{reminder.status}</Badge>
                  </div>
                  {reminder.description && (
                    <p className="text-sm text-zinc-600">{reminder.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(reminder.remind_at)}
                    </span>
                    <span>Origen: {reminder.source}</span>
                    <span>Proyecto: {reminder.project?.name || 'Sin proyecto'}</span>
                    <span>Tarea: {reminder.task?.title || 'Sin tarea'}</span>
                    <span>Recurrencia: {reminder.recurrence_rule || 'Sin recurrencia'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
