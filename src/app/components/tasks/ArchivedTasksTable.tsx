import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '../../utils/dateHelpers';
import { useTasks } from '../../../hooks/useTasks';
import { Task } from '../../../lib/supabase';
import { useProjects } from '../../../hooks/useProjects';
import { useUsers } from '../../../hooks/useUsers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Search, ChevronLeft, ChevronRight, Eye, Calendar } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface ArchivedTasksTableProps {
  onTaskClick: (task: Task) => void;
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

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function ArchivedTasksTable({ onTaskClick }: ArchivedTasksTableProps) {
  const { data: allTasks, isLoading } = useTasks(undefined, true); // Traer todas las tareas incluyendo archivadas
  const { data: projects } = useProjects();
  const { data: users } = useUsers();

  // Filtrar solo las archivadas
  const archivedTasks = useMemo(() => {
    return allTasks?.filter(task => task.status === 'archived') || [];
  }, [allTasks]);

  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Aplicar filtros
  const filteredTasks = useMemo(() => {
    let filtered = [...archivedTasks];

    // Filtro de búsqueda por título o descripción
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    // Filtro por proyecto
    if (selectedProject !== 'all') {
      filtered = filtered.filter((task) => task.project_id === selectedProject);
    }

    // Filtro por developer
    if (selectedDeveloper !== 'all') {
      filtered = filtered.filter((task) => task.assigned_to === selectedDeveloper);
    }

    // Ordenar por fecha de archivo (más recientes primero)
    filtered.sort((a, b) => {
      const dateA = a.archived_at ? new Date(a.archived_at).getTime() : 0;
      const dateB = b.archived_at ? new Date(b.archived_at).getTime() : 0;
      return dateB - dateA;
    });

    return filtered;
  }, [archivedTasks, searchQuery, selectedProject, selectedDeveloper]);

  // Paginación
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTasks.slice(startIndex, endIndex);
  }, [filteredTasks, currentPage, itemsPerPage]);

  // Resetear página cuando cambian los filtros
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedProject('all');
    setSelectedDeveloper('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedProject !== 'all' || selectedDeveloper !== 'all';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por título o descripción..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filtro por Proyecto */}
            <div>
              <Select
                value={selectedProject}
                onValueChange={(value) => {
                  setSelectedProject(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los proyectos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Developer */}
            <div>
              <Select
                value={selectedDeveloper}
                onValueChange={(value) => {
                  setSelectedDeveloper(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los developers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los developers</SelectItem>
                  {users
                    ?.filter((user) => user.role === 'dev')
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {paginatedTasks.length} de {filteredTasks.length} tareas archivadas
        </p>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Tarea</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Fecha Archivado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      {hasActiveFilters
                        ? 'No se encontraron tareas archivadas con estos filtros'
                        : 'No hay tareas archivadas'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          📁 {task.project?.name || 'Sin proyecto'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {task.assignee?.full_name || 'Sin asignar'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                          {priorityLabels[task.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {task.archived_at
                            ? format(new Date(task.archived_at), 'dd/MM/yyyy HH:mm', {
                                locale: es,
                              })
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTaskClick(task)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">
            Página {totalPages > 0 ? currentPage : 0} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Mostrar:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
              disabled={filteredTasks.length === 0}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || filteredTasks.length === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || filteredTasks.length === 0}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}