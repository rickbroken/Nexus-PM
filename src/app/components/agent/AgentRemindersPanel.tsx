import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { createReminderSchema, type CreateReminderInput } from '@/lib/agentValidations';
import type { Reminder, Task } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import {
  useCancelReminder,
  useCompleteReminder,
  useCreateReminder,
} from '@/hooks/useReminders';

type ReminderFormValues = Omit<CreateReminderInput, 'user_id'> & {
  remind_at: string;
};

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
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks(undefined, false);
  const createReminder = useCreateReminder();
  const cancelReminder = useCancelReminder();
  const completeReminder = useCompleteReminder();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(createReminderSchema.omit({ user_id: true })),
    defaultValues: {
      title: '',
      description: '',
      remind_at: '',
      project_id: null,
      task_id: null,
      priority: 'medium',
      recurrence_rule: '',
      source: 'manual',
      metadata: null,
    },
  });

  const selectedProjectId = watch('project_id');

  const projectTasks = useMemo(() => {
    return tasks.filter((task: Task) => !selectedProjectId || task.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  useEffect(() => {
    const currentTaskId = watch('task_id');
    if (currentTaskId && !projectTasks.some((task) => task.id === currentTaskId)) {
      setValue('task_id', null);
    }
  }, [projectTasks, setValue, watch]);

  const onSubmit = async (data: ReminderFormValues) => {
    await createReminder.mutateAsync({
      ...data,
      remind_at: new Date(data.remind_at).toISOString(),
      description: data.description || null,
      recurrence_rule: data.recurrence_rule || null,
      metadata: data.metadata ?? null,
      project_id: data.project_id || null,
      task_id: data.task_id || null,
    });

    reset({
      title: '',
      description: '',
      remind_at: '',
      project_id: null,
      task_id: null,
      priority: 'medium',
      recurrence_rule: '',
      source: 'manual',
      metadata: null,
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div>
          <h3 className="text-lg font-semibold">Crear recordatorio interno</h3>
          <p className="text-sm text-zinc-500">
            Las tareas representan trabajo. Los recordatorios representan alertas internas del sistema.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Titulo</Label>
            <Input id="title" {...register('title')} placeholder="Ej. Revisar cobro del proyecto X" />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Descripcion</Label>
            <Textarea id="description" {...register('description')} placeholder="Detalle opcional del recordatorio" />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="remind_at">Fecha y hora</Label>
            <Input id="remind_at" type="datetime-local" {...register('remind_at')} />
            {errors.remind_at && <p className="mt-1 text-sm text-red-600">{errors.remind_at.message}</p>}
          </div>

          <div>
            <Label>Prioridad</Label>
            <Select value={watch('priority') || 'medium'} onValueChange={(value) => setValue('priority', value as Reminder['priority'])}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Proyecto opcional</Label>
            <Select
              value={watch('project_id') || '__none__'}
              onValueChange={(value) => setValue('project_id', value === '__none__' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin proyecto</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tarea opcional</Label>
            <Select
              value={watch('task_id') || '__none__'}
              onValueChange={(value) => setValue('task_id', value === '__none__' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin tarea" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin tarea</SelectItem>
                {projectTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="recurrence_rule">Recurrencia opcional</Label>
            <Input
              id="recurrence_rule"
              {...register('recurrence_rule')}
              placeholder="Ej. FREQ=WEEKLY;BYDAY=MO,FR o texto libre"
            />
            {errors.recurrence_rule && (
              <p className="mt-1 text-sm text-red-600">{errors.recurrence_rule.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Se registrara a nombre de {user?.full_name || 'usuario actual'}.</p>
          <Button type="submit" disabled={createReminder.isPending}>
            {createReminder.isPending ? 'Guardando...' : 'Crear recordatorio'}
          </Button>
        </div>
      </form>

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
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => completeReminder.mutate(reminder.id)}
                      disabled={reminder.status !== 'pending' || completeReminder.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Completar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 text-red-600 hover:text-red-700"
                      onClick={() => cancelReminder.mutate(reminder.id)}
                      disabled={reminder.status !== 'pending' || cancelReminder.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
