import { TaskTagsInput } from './TaskTagsInput';
import { TaskAttachments } from './TaskAttachments';
import { TaskComments } from './TaskComments';
import { useUpdateTask, useArchiveTask } from '../../../hooks/useTasks';
import { Task, supabase } from '../../../lib/supabase';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  User, 
  FolderKanban, 
  Calendar, 
  Clock, 
  FileText, 
  Flag, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit, 
  Trash2,
  MessageSquarePlus,
  Check,
  ArrowLeft,
  Link2,
  Archive
} from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isDateOverdue, parseLocalDate } from '../../utils/dateHelpers';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit?: (task: Task) => void;
  onEditObservations?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const priorityColors = {
  low: 'bg-gray-200 text-gray-800',
  medium: 'bg-blue-200 text-blue-800',
  high: 'bg-orange-200 text-orange-800',
  urgent: 'bg-red-200 text-red-800',
};

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const statusLabels = {
  todo: 'Por Hacer',
  in_progress: 'En Progreso',
  review: 'En Revisión',
  done: 'Completada',
  archived: 'Archivada',
};

const statusColors = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

export function TaskDetailModal({
  open,
  onClose,
  task,
  onEdit,
  onEditObservations,
  onDelete,
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const queryClient = useQueryClient();

  // Marcar observación como leída cuando el PM abre el modal
  useEffect(() => {
    if (open && task && user?.role === 'pm' && task.dev_notes && !task.observation_read_by_pm) {
      // Marcar como leída automáticamente
      updateTask.mutate({
        id: task.id,
        observation_read_by_pm: true,
      });
    }
  }, [open, task?.id, user?.role, task?.dev_notes, task?.observation_read_by_pm]);

  // Marcar motivo de devolución como leído cuando el Dev abre el modal
  useEffect(() => {
    if (open && task && user?.role === 'dev' && task.rejection_reason && !task.rejection_read_by_dev) {
      // Marcar como leída automáticamente
      updateTask.mutate({
        id: task.id,
        rejection_read_by_dev: true,
      });
    }
  }, [open, task?.id, user?.role, task?.rejection_reason, task?.rejection_read_by_dev]);

  // Forzar refetch de attachments cuando se abre la tarea
  useEffect(() => {
    if (open && task) {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', task.id] });
      queryClient.refetchQueries({ queryKey: ['task-attachments', task.id] });
    }
  }, [open, task?.id, queryClient]);

  // Detectar cuando la tarea actual es eliminada por otro usuario
  useEffect(() => {
    if (!open || !task) return;

    // Suscripción a cambios en la tabla tasks
    const channel = supabase
      .channel(`task-deletion-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${task.id}`,
        },
        () => {
          // Mostrar alerta y cerrar el modal
          Swal.fire({
            icon: 'warning',
            title: 'Tarea Eliminada',
            html: `
              <p>Esta tarea ha sido eliminada por otro usuario.</p>
              <p class="text-sm text-gray-600 mt-2">El modal se cerrará automáticamente.</p>
            `,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#3b82f6',
            allowOutsideClick: false,
            allowEscapeKey: false,
          }).then(() => {
            onClose();
          });
        }
      )
      .subscribe();

    // Cleanup: desuscribirse cuando el componente se desmonte o la tarea cambie
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, task?.id, onClose]);

  if (!task) return null;

  const isOverdue = isDateOverdue(task.due_date) && task.status !== 'done';

  const canEdit = user?.role === 'pm' || user?.id === task.assigned_to;
  // PM puede eliminar cualquier tarea, Developer solo las que él creó
  const canDelete = user?.role === 'pm' || (user?.role === 'dev' && user?.id === task.created_by);
  // Solo PM puede archivar tareas completadas
  const canArchive = user?.role === 'pm' && task.status === 'done';
  
  // Determinar si el developer está trabajando en una tarea (asignada a él)
  const isDevWorkingOnTask = user?.role === 'dev' && user?.id === task.assigned_to;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleEditObservations = () => {
    if (onEditObservations) {
      onEditObservations(task);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task);
    }
  };

  const handleArchive = async () => {
    const result = await Swal.fire({
      title: '¿Archivar tarea?',
      text: `La tarea "${task.title}" se archivará y ya no aparecerá en el Kanban`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, archivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6366f1',
    });

    if (result.isConfirmed) {
      archiveTask.mutate(task.id, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };
  
  const handleTagsChange = (tags: string[]) => {
    updateTask.mutate({
      id: task.id,
      tags,
    });
  };

  const handleCopyLink = async () => {
    try {
      // Determinar la ruta base según el contexto
      const basePath = window.location.pathname.includes('/my-tasks') ? '/my-tasks' : '/tasks';
      const taskUrl = `${window.location.origin}${basePath}/${task.id}`;
      
      // Copiar al portapapeles
      await navigator.clipboard.writeText(taskUrl);
      
      // Mostrar notificación de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Link Copiado!',
        text: 'El enlace de la tarea se ha copiado al portapapeles',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    } catch (error) {
      console.error('Error al copiar link:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo copiar el enlace',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header con botón de volver */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onClose}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a las tareas
        </Button>
      </div>

      {/* Contenedor principal con ancho máximo */}
      <div className="max-w-5xl mx-auto">
        {/* Card principal */}
        <div className="bg-whit mb-16">
          {/* Título y badges */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {task.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${statusColors[task.status]}`}>
                {statusLabels[task.status]}
              </Badge>
              <Badge className={`${priorityColors[task.priority]}`}>
                <Flag className="h-3 w-3 mr-1" />
                {priorityLabels[task.priority]}
              </Badge>
              {task.review_status === 'approved' && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Aprobada
                </Badge>
              )}
              {task.review_status === 'rejected' && (
                <Badge className="bg-orange-100 text-orange-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  Requiere cambios
                </Badge>
              )}
              {isOverdue && (
                <Badge className="bg-red-100 text-red-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Vencida
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Descripción */}
          {task.description && (
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <FileText className="h-4 w-4" />
                <h3 className="font-semibold">Descripción</h3>
              </div>
              <p className="text-gray-600 whitespace-pre-wrap pl-6">
                {task.description}
              </p>
            </div>
          )}

          <Separator className="my-6" />

          {/* Notas de revisión */}
          {task.review_notes && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText className="h-4 w-4" />
                  <h3 className="font-semibold">Notas de revisión</h3>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {task.review_notes}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Observaciones del developer */}
          {task.dev_notes && (
            <>
              <Separator className="my-6" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText className="h-4 w-4" />
                    <h3 className="font-semibold">Observaciones del Desarrollador</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.dev_notes_timestamp && (
                      <span className="text-sm text-gray-500">
                        {format(new Date(task.dev_notes_timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    )}
                    {/* Chulitos de lectura para el Developer */}
                    {user?.role === 'dev' && (
                      <div className="flex items-center gap-0.5" title={task.observation_read_by_pm ? 'Leído por PM' : 'No leído'}>
                        <Check className={`h-4 w-4 ${task.observation_read_by_pm ? 'text-blue-600' : 'text-gray-400'}`} />
                        <Check className={`h-4 w-4 -ml-2 ${task.observation_read_by_pm ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {task.dev_notes}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Motivo de rechazo del PM */}
          {task.rejection_reason && (
            <>
              <Separator className="my-6" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-700">
                    <XCircle className="h-4 w-4" />
                    <h3 className="font-semibold">Motivo de Devolución</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.rejection_timestamp && (
                      <span className="text-sm text-orange-600">
                        {format(new Date(task.rejection_timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    )}
                    {/* Chulitos de lectura para el PM */}
                    {user?.role === 'pm' && (
                      <div className="flex items-center gap-0.5" title={task.rejection_read_by_dev ? 'Leído por Developer' : 'No leído'}>
                        <Check className={`h-4 w-4 ${task.rejection_read_by_dev ? 'text-blue-600' : 'text-gray-400'}`} />
                        <Check className={`h-4 w-4 -ml-2 ${task.rejection_read_by_dev ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {task.rejection_reason}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Adjuntos */}
          <TaskAttachments taskId={task.id} task={task} />

          {/* Comentarios */}
          <Separator className="my-6" />
          <TaskComments 
            taskId={task.id} 
            taskAssignedTo={task.assigned_to}
            taskCreatedBy={task.created_by}
          />

          {/* Etiquetas */}
          <Separator className="my-6" />
          <TaskTagsInput
            tags={task.tags || []}
            onTagsChange={handleTagsChange}
            readOnly={!canEdit}
          />

          {/* Información compacta */}
          <Separator className="my-6" />
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Asignado a */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-gray-500">
                  <User className="h-3 w-3" />
                  <span className="font-medium">Asignado</span>
                </div>
                {task.assignee ? (
                  <p className="text-gray-900 truncate">{task.assignee.full_name}</p>
                ) : (
                  <p className="text-gray-500">Sin asignar</p>
                )}
              </div>

              {/* Proyecto */}
              {task.project && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-gray-500">
                    <FolderKanban className="h-3 w-3" />
                    <span className="font-medium">Proyecto</span>
                  </div>
                  <p className="text-gray-900 truncate">{task.project.name}</p>
                </div>
              )}

              {/* Fecha de vencimiento */}
              {task.due_date && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">Vencimiento</span>
                  </div>
                  <p className={`truncate ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {format(parseLocalDate(task.due_date)!, "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              )}

              {/* Fecha de completado o info */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{task.completed_at ? 'Completada' : 'Creada'}</span>
                </div>
                <p className="text-gray-900 truncate">
                  {task.completed_at 
                    ? format(new Date(task.completed_at), "dd/MM/yyyy", { locale: es })
                    : format(new Date(task.created_at), "dd/MM/yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <Separator className="my-6" />
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {/* Developer trabajando en tarea: mostrar ambos botones */}
              {isDevWorkingOnTask ? (
                <>
                  {/* Botón de Editar Tarea (solo si la creó) */}
                  {user?.id === task.created_by && onEdit && (
                    <Button
                      variant="outline"
                      onClick={handleEdit}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Editar Tarea
                    </Button>
                  )}
                  {/* Botón de Observaciones (siempre) */}
                  {onEditObservations && (
                    <Button
                      variant="outline"
                      onClick={handleEditObservations}
                      className="gap-2"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      {task.dev_notes ? 'Editar Observaciones' : 'Agregar Observaciones'}
                    </Button>
                  )}
                </>
              ) : (
                /* Product Manager: solo botón de editar completo */
                canEdit && onEdit && (
                  <Button
                    variant="outline"
                    onClick={handleEdit}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Tarea
                  </Button>
                )
              )}
              
              {/* Botón de Copiar Link */}
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Link2 className="h-4 w-4" />
                Copiar Link
              </Button>
              
              {/* Botón de Eliminar */}
              {canDelete && onDelete && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Tarea
                </Button>
              )}
              
              {/* Botón de Archivar */}
              {canArchive && (
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  className="gap-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                >
                  <Archive className="h-4 w-4" />
                  Archivar Tarea
                </Button>
              )}
            </div>

            <Button
              onClick={onClose}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}