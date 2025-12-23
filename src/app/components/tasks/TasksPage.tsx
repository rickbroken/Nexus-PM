import { useState, useEffect } from 'react';
import { Plus, Archive, LayoutGrid } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTasksRealtime } from '../../../hooks/useRealtime';
import { useDeleteTask, useTasks } from '../../../hooks/useTasks';
import Alert from '@/lib/alert';
import { LoadingSpinner } from '../ui/loading-spinner';
import { useAuth } from '../../../contexts/AuthContext';
import { Task, supabase } from '../../../lib/supabase';
import { Button } from '../ui/button';
import { KanbanBoard } from './KanbanBoard';
import { TaskForm } from './TaskForm';
import { TaskDetailModal } from './TaskDetailModal';
import { TasksStats } from './TasksStats';
import { ArchivedTasksTable } from './ArchivedTasksTable';

type ViewMode = 'kanban' | 'archived';

export function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [observationsMode, setObservationsMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban'); // Estado para cambiar entre vistas
  const deleteTask = useDeleteTask();
  const { isLoading } = useTasks(undefined, false); // Solo para el loading inicial

  // Enable realtime updates
  useTasksRealtime();

  // Cargar tarea desde URL si existe taskId
  useEffect(() => {
    const loadTaskFromUrl = async () => {
      if (taskId && user) {
        try {
          // Obtener la tarea desde Supabase con todos los datos necesarios
          const { data: task, error } = await supabase
            .from('tasks')
            .select(`
              *,
              project:projects(id, name),
              assignee:users_profiles!assigned_to(id, email, full_name)
            `)
            .eq('id', taskId)
            .single();

          if (error) throw error;

          if (!task) {
            Alert.error(
              'Tarea no encontrada',
              'La tarea que intentas ver no existe.'
            );
            const basePath = location.pathname.includes('/my-tasks') ? '/my-tasks' : '/tasks';
            navigate(basePath, { replace: true });
            return;
          }

          // Validar permisos: 
          // - Admin puede ver todas
          // - PM puede ver todas las tareas de sus proyectos
          // - Dev solo puede ver las que tiene asignadas
          let hasAccess = false;

          if (user.role === 'admin') {
            hasAccess = true;
          } else if (user.role === 'pm') {
            // PM puede ver todas las tareas (ya que gestiona todos los proyectos)
            hasAccess = true;
          } else if (user.role === 'dev') {
            // Dev solo puede ver si está asignado
            hasAccess = task.assigned_to === user.id;
          }

          if (!hasAccess) {
            Alert.error(
              'Acceso Denegado',
              'No tienes permisos para ver esta tarea. Solo puedes ver las tareas que tienes asignadas.'
            );
            const basePath = location.pathname.includes('/my-tasks') ? '/my-tasks' : '/tasks';
            navigate(basePath, { replace: true });
            return;
          }

          // Si tiene acceso, abrir la tarea
          setSelectedTask(task as Task);
          setDetailModalOpen(true);
        } catch (error: any) {
          console.error('Error al cargar tarea desde URL:', error);
          Alert.error(
            'Error',
            'No se pudo cargar la tarea. Por favor, intenta nuevamente.'
          );
          const basePath = location.pathname.includes('/my-tasks') ? '/my-tasks' : '/tasks';
          navigate(basePath, { replace: true });
        }
      }
    };

    loadTaskFromUrl();
  }, [taskId, user?.id, navigate, location.pathname]);

  const handleCreate = () => {
    setSelectedTask(null);
    setObservationsMode(false);
    setFormOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
    // Actualizar la URL con el ID de la tarea
    const basePath = location.pathname.includes('/my-tasks') ? '/my-tasks' : '/tasks';
    navigate(`${basePath}/${task.id}`, { replace: false });
  };

  const handleClose = () => {
    setFormOpen(false);
    setSelectedTask(null);
    setObservationsMode(false);
  };

  const handleDetailModalClose = () => {
    setDetailModalOpen(false);
    setSelectedTask(null);
    // Regresar a la URL base al cerrar el modal
    const basePath = location.pathname.includes('/my-tasks') ? '/my-tasks' : '/tasks';
    navigate(basePath, { replace: false });
  };

  const handleEditTask = (task: Task) => {
    setDetailModalOpen(false);
    setSelectedTask(task);
    setObservationsMode(false);
    setFormOpen(true);
  };

  const handleEditObservations = (task: Task) => {
    setDetailModalOpen(false);
    setSelectedTask(task);
    setObservationsMode(true);
    setFormOpen(true);
  };

  const handleDeleteTask = async (task: Task) => {
    const result = await Alert.fire({
      title: '¿Eliminar tarea?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        await deleteTask.mutateAsync(task.id);
        Alert.success('Eliminada', 'La tarea ha sido eliminada correctamente');
        setDetailModalOpen(false);
        setSelectedTask(null);
        // Regresar a la URL base después de eliminar
        const basePath = location.pathname.includes('/my-tasks') ? '/my-tasks' : '/tasks';
        navigate(basePath, { replace: false });
      } catch (error: any) {
        console.error('Error al eliminar tarea:', error);
        Alert.error('Error', error.message || 'No se pudo eliminar la tarea');
      }
    }
  };

  // Título dinámico según el rol
  const getPageTitle = () => {
    if (user?.role === 'pm') {
      return 'Gestión de Tareas';
    } else if (user?.role === 'dev') {
      return 'Mis Tareas Asignadas';
    }
    return 'Tablero Kanban';
  };

  const getPageDescription = () => {
    if (user?.role === 'pm') {
      return 'Crea y asigna tareas a los desarrolladores del equipo';
    } else if (user?.role === 'dev') {
      return 'Visualiza y actualiza el estado de tus tareas';
    }
    return null;
  };

  // Mostrar loading centralizado
  if (isLoading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
            {getPageDescription() && (
              <p className="text-gray-600 mt-1">{getPageDescription()}</p>
            )}
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {user?.role === 'pm' ? 'Asignar Tarea' : 'Nueva Tarea'}
          </Button>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solo mostrar header y contenido si NO hay tarea seleccionada */}
      {!selectedTask ? (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
              {getPageDescription() && (
                <p className="text-gray-600 mt-1">{getPageDescription()}</p>
              )}
            </div>
            <div className="flex gap-2">
              {/* Botones para cambiar vista (solo para PM) */}
              {user?.role === 'pm' && (
                <>
                  <Button
                    variant={viewMode === 'kanban' ? 'default' : 'outline'}
                    onClick={() => setViewMode('kanban')}
                    className="gap-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Kanban
                  </Button>
                  <Button
                    variant={viewMode === 'archived' ? 'default' : 'outline'}
                    onClick={() => setViewMode('archived')}
                    className="gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    Archivadas
                  </Button>
                </>
              )}
              {/* Botón crear tarea - deshabilitado en vista archivadas */}
              <Button 
                onClick={handleCreate}
                disabled={viewMode === 'archived'}
              >
                <Plus className="mr-2 h-4 w-4" />
                {user?.role === 'pm' ? 'Asignar Tarea' : 'Nueva Tarea'}
              </Button>
            </div>
          </div>

          {/* Mostrar estadísticas solo para PM y solo en vista Kanban */}
          {user?.role === 'pm' && viewMode === 'kanban' && <TasksStats />}

          {/* Renderizar vista según el modo seleccionado */}
          {viewMode === 'kanban' ? (
            <KanbanBoard onTaskClick={handleTaskClick} />
          ) : (
            <ArchivedTasksTable onTaskClick={handleTaskClick} />
          )}
        </>
      ) : (
        /* Mostrar vista completa de la tarea */
        <TaskDetailModal
          open={true}
          onClose={handleDetailModalClose}
          task={selectedTask}
          onEdit={handleEditTask}
          onEditObservations={handleEditObservations}
          onDelete={handleDeleteTask}
        />
      )}

      <TaskForm 
        open={formOpen} 
        onClose={handleClose} 
        task={selectedTask} 
        observationsMode={observationsMode}
      />
    </div>
  );
}