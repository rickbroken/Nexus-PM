import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate, isDateOverdue } from '../../utils/dateHelpers';
import { useState, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTasks, useUpdateTask } from '../../../hooks/useTasks';
import { Task, TaskStatus } from '../../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Clock, AlertCircle, User, CheckCircle2, XCircle, MessageSquare, Paperclip } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useUserKanbanColors } from '../../../hooks/useUserKanbanColors';
import { KanbanColumnColorPicker } from './KanbanColumnColorPicker';
import { useUnreadCommentsCount } from '../../../hooks/useTaskComments';

interface KanbanBoardProps {
  projectId?: string;
  onTaskClick: (task: Task) => void;
}

// Columnas para Developer (sin colores hardcodeados)
const devColumns: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'Por Hacer' },
  { id: 'in_progress', title: 'En Progreso' },
  { id: 'review', title: 'Listo para Revisar' },
];

// Columnas para Product Manager (sin colores hardcodeados)
const pmColumns: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'Asignadas' },
  { id: 'review', title: 'Por Revisar' },
  { id: 'done', title: 'Completadas' },
];

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

interface TaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  userRole?: string;
}

function TaskCard({ task, onTaskClick, userRole }: TaskCardProps) {
  const { user } = useAuth();
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  // Verificar si la tarea está vencida
  const isOverdue = isDateOverdue(task.due_date) && task.status !== 'done';

  // Obtener conteo de comentarios sin leer
  const { data: unreadCount = 0 } = useUnreadCommentsCount(task.id, user?.id, user?.role);

  // Badge de feedback (solo para developers)
  const getFeedbackBadge = () => {
    if (userRole !== 'dev' || !task.review_status) return null;

    if (task.review_status === 'approved' && task.status === 'done') {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Aprobada
        </Badge>
      );
    }

    if (task.review_status === 'rejected') {
      return (
        <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Requiere cambios
        </Badge>
      );
    }

    return null;
  };

  // Detectar si el usuario está seleccionando texto
  const handleCardClick = (e: React.MouseEvent) => {
    // Si hay texto seleccionado, no abrir el modal
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    
    // Si el clic fue en el área de arrastre, no abrir el modal
    const target = e.target as HTMLElement;
    if (target.closest('[data-drag-handle]')) {
      return;
    }

    onTaskClick(task);
  };

  return (
    <div
      className={`group/card relative ${isDragging ? 'opacity-50' : ''}`}
      onClick={handleCardClick}
    >
      <Card className={`mb-2 hover:shadow-md transition-shadow cursor-pointer ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
        {/* Zona de arrastre con grid de puntos - solo visible en hover */}
        <div
          ref={drag}
          data-drag-handle
          className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-move opacity-0 group-hover/card:opacity-100 transition-opacity bg-gradient-to-b from-gray-50/90 to-transparent rounded-t-lg z-10"
        >
          {/* Grid de puntos: 2 filas x 6 columnas */}
          <div className="grid grid-cols-6 gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-0.5 h-0.5 rounded-full bg-gray-300" />
            ))}
          </div>
        </div>
        
        <CardContent className="p-3 pt-6">
          <div className="space-y-2">
            {/* Nombre del proyecto */}
            {task.project && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-normal text-gray-600 border-gray-300">
                  📁 {task.project.name}
                </Badge>
              </div>
            )}

            {/* Indicador de observación sin leer (solo para PM) */}
            {userRole === 'pm' && task.dev_notes && !task.observation_read_by_pm && (
              <div className="flex items-center gap-1.5">
                <Badge className="text-xs bg-blue-500 text-white animate-pulse">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Nueva observación
                </Badge>
              </div>
            )}

            {/* Indicador de motivo de devolución sin leer (solo para Dev) */}
            {userRole === 'dev' && task.rejection_reason && !task.rejection_read_by_dev && (
              <div className="flex items-center gap-1.5">
                <Badge className="text-xs bg-orange-500 text-white animate-pulse">
                  <XCircle className="h-3 w-3 mr-1" />
                  Motivo de devolución
                </Badge>
              </div>
            )}

            {/* Indicador de adjuntos nuevos (para PM cuando dev sube) */}
            {userRole === 'pm' && task.has_new_attachments_for_pm && (
              <div className="flex items-center gap-1.5">
                <Badge className="text-xs bg-purple-500 text-white animate-pulse">
                  <Paperclip className="h-3 w-3 mr-1" />
                  Nuevo adjunto
                </Badge>
              </div>
            )}

            {/* Indicador de adjuntos nuevos (para Dev cuando PM sube) */}
            {userRole === 'dev' && task.has_new_attachments_for_dev && (
              <div className="flex items-center gap-1.5">
                <Badge className="text-xs bg-purple-500 text-white animate-pulse">
                  <Paperclip className="h-3 w-3 mr-1" />
                  Nuevo adjunto
                </Badge>
              </div>
            )}

            {/* Indicador de comentarios sin leer */}
            {unreadCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Badge className="text-xs bg-blue-500 text-white animate-pulse">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {unreadCount} nuevo{unreadCount > 1 ? 's' : ''} comentario{unreadCount > 1 ? 's' : ''}
                </Badge>
              </div>
            )}

            {/* Badge de feedback en la parte superior */}
            {getFeedbackBadge() && (
              <div className="flex justify-end">
                {getFeedbackBadge()}
              </div>
            )}

            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium line-clamp-2">{task.title}</h4>
              <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                {priorityLabels[task.priority]}
              </Badge>
            </div>

            {task.description && (
              <p className="text-xs text-gray-600 line-clamp-2 leading-tight">{task.description}</p>
            )}

            <div className="flex items-center justify-between gap-2">
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {task.assignee.full_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-900 font-medium">
                      {task.assignee.full_name}
                    </span>
                    {userRole === 'pm' && (
                      <span className="text-xs text-gray-500">
                        Developer
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <User className="h-3 w-3" />
                  <span>Sin asignar</span>
                </div>
              )}

              {task.due_date && (
                <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {isOverdue && <AlertCircle className="h-3 w-3" />}
                  <Clock className="h-3 w-3" />
                  {format(parseLocalDate(task.due_date)!, 'dd/MM', { locale: es })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ColumnProps {
  column: { id: TaskStatus; title: string; color: string };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  userRole?: string;
  onRequestRejection?: (taskId: string, targetColumn: TaskStatus) => void;
}

function Column({ column, tasks, onTaskClick, userRole, onRequestRejection }: ColumnProps) {
  const updateTask = useUpdateTask();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { id: string; status: TaskStatus }) => {
      if (item.status !== column.id) {
        // Si es PM rechazando una tarea (de review a todo), pedir motivo
        if (userRole === 'pm' && item.status === 'review' && column.id === 'todo') {
          onRequestRejection?.(item.id, column.id);
          return;
        }

        // Preparar la actualización
        const updates: any = {
          id: item.id,
          status: column.id,
        };

        // Si es PM moviendo tareas
        if (userRole === 'pm') {
          // De "Por Revisar" a "Completadas" = Aprobar
          if (item.status === 'review' && column.id === 'done') {
            updates.review_status = 'approved';
            updates.completed_at = new Date().toISOString();
            // Limpiar rechazo previo si existía
            updates.rejection_reason = null;
            updates.rejection_timestamp = null;
          }

          // De "Completadas" de vuelta a cualquier lugar = Resetear aprobación
          if (item.status === 'done' && column.id !== 'done') {
            updates.review_status = null;
            updates.completed_at = null;
          }
        }

        // Si es Developer moviendo de "Por hacer" a "En progreso", limpiar rechazo
        if (userRole === 'dev' && item.status === 'todo' && column.id === 'in_progress') {
          updates.review_status = null;
          updates.rejection_reason = null;
          updates.rejection_timestamp = null;
        }

        updateTask.mutate(updates);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [userRole, onRequestRejection]);

  // Determinar si es un color personalizado (empieza con "custom-")
  const isCustomColor = column.color.startsWith('custom-');
  const customColorValue = isCustomColor ? column.color.replace('custom-', '') : null;

  return (
    <div
      ref={drop}
      className={`group border border-gray-100 flex flex-col flex-1 min-w-[280px] ${!isCustomColor ? column.color : ''} rounded-lg mx-1 p-4 h-full ${ isOver ? 'ring-2 ring-blue-500' : ''
      }`}
      style={isCustomColor ? { backgroundColor: customColorValue || undefined } : undefined}
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="font-semibold">{column.title}</h3>
        <div className="flex items-center gap-2">
          <KanbanColumnColorPicker 
            role={userRole === 'pm' ? 'pm' : 'dev'} 
            status={column.id} 
          />
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} userRole={userRole} />
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Sin tareas
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ projectId, onTaskClick }: KanbanBoardProps) {
  const { user } = useAuth();
  const { data: tasks } = useTasks(projectId);
  const updateTask = useUpdateTask();
  const { getColorForStatus, userColors } = useUserKanbanColors(); // Obtener función y datos de colores personalizados
  
  // Estado para el diálogo de rechazo
  const [rejectionDialog, setRejectionDialog] = useState<{
    open: boolean;
    taskId: string | null;
    rejectionReason: string;
  }>({
    open: false,
    taskId: null,
    rejectionReason: '',
  });

  const handleRequestRejection = (taskId: string, targetColumn: TaskStatus) => {
    setRejectionDialog({
      open: true,
      taskId,
      rejectionReason: '',
    });
  };

  const handleConfirmRejection = () => {
    if (!rejectionDialog.taskId || !rejectionDialog.rejectionReason.trim()) {
      return;
    }

    updateTask.mutate({
      id: rejectionDialog.taskId,
      status: 'todo',
      review_status: 'rejected',
      rejection_reason: rejectionDialog.rejectionReason.trim(),
      rejection_timestamp: new Date().toISOString(),
      rejection_read_by_dev: false, // Marcar como no leída cuando se crea/modifica
      rejection_updated_at: new Date().toISOString(),
    });

    setRejectionDialog({
      open: false,
      taskId: null,
      rejectionReason: '',
    });
  };

  const handleCancelRejection = () => {
    setRejectionDialog({
      open: false,
      taskId: null,
      rejectionReason: '',
    });
  };

  const tasksByStatus = useMemo(() => {
    if (!tasks) return {};

    // Para Product Manager: agrupar tareas de forma especial
    if (user?.role === 'pm') {
      const pmTasks = {
        todo: tasks.filter(t => t.status === 'todo' || t.status === 'in_progress'), // Asignadas (Por hacer + En progreso)
        review: tasks.filter(t => t.status === 'review'), // Por revisar
        done: tasks.filter(t => t.status === 'done'), // Completadas
      } as Record<TaskStatus, Task[]>;
      
      return pmTasks;
    }

    // Para Developers: filtrar solo sus tareas asignadas (excluir las completadas y archivadas)
    const devTasks = tasks.filter(t => {
      const isAssignedToMe = t.assigned_to === user?.id;
      const isNotCompleted = t.status !== 'done';
      const isNotArchived = t.status !== 'archived';
      
      return isAssignedToMe && isNotCompleted && isNotArchived;
    });
    
    const grouped = devTasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {} as Record<TaskStatus, Task[]>);
    
    return grouped;
  }, [tasks, user?.id, user?.role]);

  const baseColumns = user?.role === 'pm' ? pmColumns : devColumns;
  
  // Mapear las columnas con sus colores configurados
  const columnsWithColors = useMemo(() => {
    if (user?.role === 'pm') {
      return baseColumns.map((col) => ({
        ...col,
        color: getColorForStatus('pm', col.id) || 'bg-gray-100',
      }));
    } else {
      return baseColumns.map((col) => ({
        ...col,
        color: getColorForStatus('dev', col.id) || 'bg-gray-100',
      }));
    }
  }, [baseColumns, getColorForStatus, user?.role, userColors]); // Agregar userColors como dependencia

  return (
    <div className="flex gap-4 overflow-x-auto py-1 h-[calc(100vh-200px)]">
      {columnsWithColors.map((column) => (
        <Column
          key={column.id}
          column={column}
          tasks={tasksByStatus[column.id] || []}
          onTaskClick={onTaskClick}
          userRole={user?.role}
          onRequestRejection={handleRequestRejection}
        />
      ))}

      {/* Diálogo de rechazo */}
      <Dialog open={rejectionDialog.open} onOpenChange={handleCancelRejection}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Devolver Tarea</DialogTitle>
            <DialogDescription>
              Indica los cambios que se deben realizar para que el desarrollador pueda corregir la tarea.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="rejectionReason">Motivo / Cambios requeridos *</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionDialog.rejectionReason}
              onChange={(e) => setRejectionDialog({ ...rejectionDialog, rejectionReason: e.target.value })}
              placeholder="Describe los cambios que necesita la tarea o por qué se está devolviendo..."
              className="resize-none min-h-[120px]"
              rows={5}
            />
            <p className="text-xs text-gray-500">
              Esta información será visible para el desarrollador
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelRejection}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRejection}
              disabled={!rejectionDialog.rejectionReason.trim()}
            >
              Devolver Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}