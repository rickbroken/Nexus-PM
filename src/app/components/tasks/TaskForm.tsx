import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateTask, useUpdateTask } from '../../../hooks/useTasks';
import { useProjects } from '../../../hooks/useProjects';
import { useQuery } from '@tanstack/react-query';
import { supabase, Task, UserProfile, Project } from '../../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TaskTagsInput } from './TaskTagsInput';

const taskSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  project_id: z.string().min(1, 'El proyecto es requerido'),
  assigned_to: z.string().nullable(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().transform(val => val === '' ? undefined : val).optional(),
  tags: z.array(z.string()).optional(),
  dev_notes: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultProjectId?: string;
  observationsMode?: boolean; // Nueva prop
}

export function TaskForm({ open, onClose, task, defaultProjectId, observationsMode }: TaskFormProps) {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // Determinar si el developer puede editar la tarea completa
  // Solo puede editar si él creó la tarea, de lo contrario solo puede agregar observaciones
  const isDevCreator = user?.role === 'dev' && task?.created_by === user?.id;
  const isDevAddingNotes = observationsMode && user?.role === 'dev' && !!task;

  // Fetch users for assignment - PM solo ve developers
  const { data: users } = useQuery({
    queryKey: ['users', user?.role],
    queryFn: async () => {
      let query = supabase
        .from('users_profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      // Si el usuario es PM, solo mostrar developers
      if (user?.role === 'pm') {
        query = query.eq('role', 'dev');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      project_id: defaultProjectId || '',
      status: 'todo',
      priority: 'medium',
      tags: [],
    },
  });

  // Observar el developer seleccionado para filtrar proyectos
  const selectedDeveloperId = watch('assigned_to');

  // Obtener proyectos del developer seleccionado
  const { data: developerProjects } = useQuery({
    queryKey: ['developer-projects', selectedDeveloperId],
    queryFn: async () => {
      if (!selectedDeveloperId) return [];

      const { data, error } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', selectedDeveloperId);

      if (error) throw error;
      
      // Extraer los proyectos
      return data.map(pm => pm.projects).filter(Boolean) as Project[];
    },
    enabled: !!selectedDeveloperId && user?.role === 'pm',
  });

  // Determinar qué proyectos mostrar
  const availableProjects = user?.role === 'pm' && selectedDeveloperId 
    ? developerProjects 
    : projects;

  // Limpiar proyecto seleccionado cuando cambia el developer
  useEffect(() => {
    if (user?.role === 'pm' && !task) {
      // Solo limpiar si el proyecto actual no está en la nueva lista de proyectos disponibles
      const currentProjectId = watch('project_id');
      const isProjectAvailable = developerProjects?.some(p => p.id === currentProjectId);
      
      if (currentProjectId && !isProjectAvailable && developerProjects) {
        setValue('project_id', '');
      }
    }
  }, [selectedDeveloperId, developerProjects, user?.role, task, watch, setValue]);

  // Sincronizar formulario cuando cambie la tarea (editar) o se abra el modal
  useEffect(() => {
    if (open) {
      if (task) {
        // Modo edición: cargar datos de la tarea
        reset({
          title: task.title || '',
          description: task.description || '',
          project_id: task.project_id || '',
          assigned_to: task.assigned_to || null,
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          due_date: task.due_date || '',
          tags: task.tags || [],
          dev_notes: task.dev_notes || '',
        });
      } else {
        // Modo creación: valores por defecto
        reset({
          title: '',
          description: '',
          project_id: defaultProjectId || '',
          assigned_to: null,
          status: 'todo',
          priority: 'medium',
          due_date: '',
          tags: [],
          dev_notes: '',
        });
      }
    }
  }, [open, task, defaultProjectId, reset]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (task?.id) {
        // Si el developer solo está agregando observaciones, solo actualizar dev_notes
        if (isDevAddingNotes) {
          await updateTask.mutateAsync({ 
            id: task.id, 
            dev_notes: data.dev_notes,
            dev_notes_timestamp: new Date().toISOString(),
            observation_read_by_pm: false, // Marcar como no leída cuando se crea/modifica
            observation_updated_at: new Date().toISOString()
          });
        } else {
          // Actualización completa
          await updateTask.mutateAsync({ id: task.id, ...data });
        }
      } else {
        // Crear nueva tarea
        const taskData: any = {
          ...data,
          created_by: user?.id,
        };

        // Si el usuario es developer, asignar la tarea automáticamente a él
        if (user?.role === 'dev') {
          taskData.assigned_to = user?.id;
        }

        await createTask.mutateAsync(taskData);
      }
      
      reset();
      onClose();
    } catch (error) {
      // Error already handled by mutation hooks
    }
  };

  // Resetear formulario cuando se abre/cierra
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isDevAddingNotes ? 'Agregar Observaciones' : task ? 'Editar Tarea' : 'Nueva Tarea'}
          </DialogTitle>
          <DialogDescription>
            {isDevAddingNotes 
              ? 'Añade tus observaciones sobre el trabajo realizado en esta tarea'
              : task 
              ? 'Actualiza los detalles de la tarea' 
              : user?.role === 'dev'
              ? 'Crea una nueva tarea personal para organizarte mejor'
              : 'Crea una nueva tarea y asígnala a un desarrollador'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isDevAddingNotes ? (
            // Modo: Developer agregando observaciones a tarea del PM
            <>
              {/* Mostrar información de la tarea (solo lectura) */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <Label className="text-xs text-gray-600">Tarea</Label>
                  <p className="font-medium text-gray-900">{task?.title}</p>
                </div>
                {task?.description && (
                  <div>
                    <Label className="text-xs text-gray-600">Descripción</Label>
                    <p className="text-sm text-gray-700">{task.description}</p>
                  </div>
                )}
              </div>

              {/* Campo de observaciones */}
              <div>
                <Label htmlFor="dev_notes">Observaciones del Desarrollador *</Label>
                <Textarea
                  id="dev_notes"
                  {...register('dev_notes')}
                  placeholder="Describe el trabajo realizado, cambios implementados, problemas encontrados, etc."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Estas observaciones serán visibles para el Product Manager
                </p>
              </div>
            </>
          ) : (
            // Modo: Edición normal (PM o Developer con tarea propia)
            <>
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Título de la tarea"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Campo "Asignar a" solo visible para PM y Admin - PRIMERO */}
              {user?.role !== 'dev' && (
                <div>
                  <Label htmlFor="assigned_to">
                    Asignar a (Desarrollador) *
                  </Label>
                  <Select
                    value={watch('assigned_to') || 'unassigned'}
                    onValueChange={(value) =>
                      setValue('assigned_to', value === 'unassigned' ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar desarrollador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin asignar</SelectItem>
                      {users?.map((assignUser) => (
                        <SelectItem key={assignUser.id} value={assignUser.id}>
                          {assignUser.full_name} ({assignUser.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedDeveloperId && user?.role === 'pm' && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Selecciona un desarrollador para ver sus proyectos asignados
                    </p>
                  )}
                  {selectedDeveloperId && user?.role === 'pm' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Solo se mostrarán los proyectos asignados a este desarrollador
                    </p>
                  )}
                </div>
              )}

              {/* Campo Proyecto - SEGUNDO (filtrado por developer) */}
              <div>
                <Label htmlFor="project_id">Proyecto *</Label>
                <Select
                  value={watch('project_id') || ''}
                  onValueChange={(value) => setValue('project_id', value)}
                  disabled={user?.role === 'pm' && !selectedDeveloperId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      user?.role === 'pm' && !selectedDeveloperId 
                        ? "Primero selecciona un desarrollador" 
                        : "Seleccionar proyecto"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects && availableProjects.length > 0 ? (
                      availableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-projects" disabled>
                        {user?.role === 'pm' 
                          ? 'Este desarrollador no tiene proyectos asignados' 
                          : 'No hay proyectos disponibles'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.project_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.project_id.message}</p>
                )}
                {user?.role === 'pm' && selectedDeveloperId && availableProjects?.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ℹ️ Asigna proyectos a este desarrollador desde el módulo de Proyectos
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Descripción detallada de la tarea"
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={watch('status') || 'todo'}
                    onValueChange={(value) => setValue('status', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {user?.role === 'pm' ? (
                        // Estados para Product Manager
                        <>
                          <SelectItem value="todo">Asignadas</SelectItem>
                          <SelectItem value="review">Por Revisar</SelectItem>
                          <SelectItem value="done">Completadas</SelectItem>
                        </>
                      ) : (
                        // Estados para Developer
                        <>
                          <SelectItem value="todo">Por Hacer</SelectItem>
                          <SelectItem value="in_progress">En Progreso</SelectItem>
                          <SelectItem value="review">Listo para Revisar</SelectItem>
                          <SelectItem value="done">Completadas</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {user?.role === 'pm' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Los estados reflejan tu vista como PM
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select
                    value={watch('priority') || 'medium'}
                    onValueChange={(value) => setValue('priority', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...register('due_date')}
                />
              </div>

              <div>
                <Label htmlFor="tags">Etiquetas</Label>
                <TaskTagsInput
                  value={watch('tags') || []}
                  onValueChange={(value) => setValue('tags', value)}
                />
              </div>

              {/* Campo de observaciones eliminado - ahora se usa el botón dedicado */}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || updateTask.isPending}
            >
              {createTask.isPending || updateTask.isPending
                ? 'Guardando...'
                : task
                ? 'Actualizar'
                : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}