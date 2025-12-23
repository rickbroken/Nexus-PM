import { useState, useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, Search, Trash2, Edit, ExternalLink, Calendar, Building2, Github, Eye, EyeOff, Copy, Cloud, Server, Zap, Globe } from 'lucide-react';
import Alert from '@/lib/alert';
import { toast } from 'sonner';
import { Project, ProjectStatus } from '../../../lib/supabase';
import { useProjects, useDeleteProject } from '../../../hooks/useProjects';
import { useProjectStore } from '../../../stores/projectStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { format } from 'date-fns';
import { LoadingSpinner } from '../ui/loading-spinner';

interface ProjectsListProps {
  onCreateClick: () => void;
  onEditClick: (project: Project) => void;
}

const statusColors = {
  planning: 'bg-yellow-100 text-yellow-800',
  in_development: 'bg-purple-100 text-purple-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  planning: 'Planificación',
  in_development: 'En Desarrollo',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export function ProjectsList({ onCreateClick, onEditClick }: ProjectsListProps) {
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const { setSelectedProject } = useProjectStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  
  // Estado para el modal de vista del developer
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProjectToView, setSelectedProjectToView] = useState<Project | null>(null);
  const [envVariables, setEnvVariables] = useState<Array<{ key: string; value: string; visible_to_devs: boolean }>>([]);
  const [loadingEnvVars, setLoadingEnvVars] = useState(false);
  const [visibleEnvVars, setVisibleEnvVars] = useState<Set<string>>(new Set());

  // Verificar si es developer
  const isDeveloper = user?.role === 'dev';
  
  // Verificar si es advisor
  const isAdvisor = user?.role === 'advisor';
  
  // Verificar si es solo lectura (dev o advisor)
  const isReadOnly = isDeveloper || isAdvisor;

  // Filtros combinados
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    return projects.filter(project => {
      const matchesSearch = 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ? true : project.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // Paginación
  const totalPages = Math.ceil((filteredProjects?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjects = filteredProjects?.slice(startIndex, endIndex);

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as ProjectStatus | 'all');
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleDelete = async (project: Project) => {
    const result = await Alert.fire({
      title: '¿Eliminar proyecto?',
      text: `¿Estás seguro de eliminar "${project.name}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      deleteProject.mutate(project.id);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return '—';
    }
  };

  // Extraer dominio sin protocolo
  const extractDomain = (url?: string) => {
    if (!url) return null;
    try {
      // Remover protocolo (http://, https://, etc.)
      let domain = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      // Remover www.
      domain = domain.replace(/^www\./, '');
      return domain;
    } catch {
      return null;
    }
  };

  // Cargar variables de entorno del proyecto
  const loadEnvVariables = async (projectIdParam: string) => {
    setLoadingEnvVars(true);
    try {
      // Cargar directamente desde project_env_variables
      const { data, error } = await supabase
        .from('project_env_variables')
        .select('*')
        .eq('project_id', projectIdParam)
        .order('key');

      if (error) {
        // Si la tabla no existe, mostrar mensaje silenciosamente
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          setEnvVariables([]);
          return;
        }
        throw error;
      }

      // Si es developer, solo mostrar las visibles para devs
      const filteredData = isDeveloper 
        ? data?.filter(v => v.visible_to_devs) || []
        : data || [];

      setEnvVariables(filteredData.map(v => ({
        key: v.key,
        value: v.value || '',
        visible_to_devs: v.visible_to_devs
      })));
    } catch (error) {
      setEnvVariables([]);
      toast.error('Error al cargar las variables de entorno');
    } finally {
      setLoadingEnvVars(false);
    }
  };

  // Abrir modal de vista para developer
  const handleViewProject = async (project: Project) => {
    setSelectedProjectToView(project);
    setViewModalOpen(true);
    setVisibleEnvVars(new Set());
    await loadEnvVariables(project.id);
  };

  // Alternar visibilidad de variable
  const toggleEnvVarVisibility = (key: string) => {
    setVisibleEnvVars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Copiar variable al portapapeles
  const copyToClipboard = (text: string) => {
    // Intentar usar el API moderno de Clipboard
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success('Copiado al portapapeles');
        })
        .catch(() => {
          // Fallback al método tradicional
          fallbackCopyToClipboard(text);
        });
    } else {
      // Usar método tradicional
      fallbackCopyToClipboard(text);
    }
  };

  // Método fallback para copiar al portapapeles
  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success('Copiado al portapapeles');
    } catch (err) {
      toast.error('No se pudo copiar al portapapeles');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Proyectos</h1>
        {!isReadOnly && (
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={isReadOnly ? "Buscar por nombre o descripción..." : "Buscar por nombre, cliente o descripción..."}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="planning">Planificación</SelectItem>
            <SelectItem value="in_development">En Desarrollo</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Proyecto</TableHead>
              {!isReadOnly && <TableHead>Cliente</TableHead>}
              <TableHead>Estado</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Enlaces</TableHead>
              <TableHead>URL Producción</TableHead>
              {!isReadOnly && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProjects && currentProjects.length > 0 ? (
              currentProjects.map((project) => (
                <TableRow 
                  key={project.id}
                  className={isReadOnly ? "cursor-pointer hover:bg-gray-50" : ""}
                  onClick={() => isReadOnly && handleViewProject(project)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{project.name}</div>
                      {project.description && (
                        <div className="text-xs text-gray-500 line-clamp-2 max-w-[230px] mt-1">
                          {project.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell>
                      {project.client ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span>{project.client.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge className={statusColors[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      {project.start_date && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(project.start_date)}</span>
                        </div>
                      )}
                      {project.end_date && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(project.end_date)}</span>
                        </div>
                      )}
                      {!project.start_date && !project.end_date && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {project.repo_url && (
                        <a
                          href={project.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Repositorio"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {project.staging_url && (
                        <a
                          href={project.staging_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-800"
                          title="Staging"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {project.prod_url && (
                        <a
                          href={project.prod_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                          title="Producción"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {!project.repo_url && !project.staging_url && !project.prod_url && (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.prod_url ? (
                      <a
                        href={project.prod_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                        title="Producción"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {extractDomain(project.prod_url) || 'Abrir'}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditClick(project)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(project)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isReadOnly ? 5 : 7} className="text-center py-12">
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No se encontraron proyectos con los filtros aplicados'
                      : 'No hay proyectos registrados'}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación y controles */}
      {filteredProjects && filteredProjects.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Mostrar</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">
              por página
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredProjects.length)} de {filteredProjects.length}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              Primera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-2 px-3">
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Última
            </Button>
          </div>
        </div>
      )}

      {/* Modal de vista para developers */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedProjectToView?.name}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Información técnica del proyecto
            </DialogDescription>
          </DialogHeader>

          {selectedProjectToView && (
            <div className="space-y-4">
              {/* Descripción */}
              {selectedProjectToView.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1.5">Descripción</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedProjectToView.description}</p>
                </div>
              )}

              {/* Estado y Fechas - Grid compacto */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="text-xs font-semibold text-gray-700 mb-1.5">Estado</h3>
                  <Badge className={statusColors[selectedProjectToView.status]}>
                    {statusLabels[selectedProjectToView.status]}
                  </Badge>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="text-xs font-semibold text-gray-700 mb-1.5">Fechas</h3>
                  <div className="text-sm space-y-0.5">
                    {selectedProjectToView.start_date && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">Inicio: {formatDate(selectedProjectToView.start_date)}</span>
                      </div>
                    )}
                    {selectedProjectToView.end_date && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">Fin: {formatDate(selectedProjectToView.end_date)}</span>
                      </div>
                    )}
                    {!selectedProjectToView.start_date && !selectedProjectToView.end_date && (
                      <span className="text-xs text-gray-400">Sin fechas</span>
                    )}
                  </div>
                </div>
              </div>

              {/* URLs de despliegue */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Enlaces de despliegue</h3>
                <div className="space-y-2">
                  {selectedProjectToView.repo_url && (
                    <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded">
                          <Github className="h-3.5 w-3.5 text-blue-700" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Repositorio</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={selectedProjectToView.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          Abrir
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copyToClipboard(selectedProjectToView.repo_url!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {selectedProjectToView.staging_url && (
                    <div className="flex items-center justify-between p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-100 rounded">
                          <ExternalLink className="h-3.5 w-3.5 text-orange-700" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Staging</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={selectedProjectToView.staging_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium underline"
                        >
                          Abrir
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copyToClipboard(selectedProjectToView.staging_url!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {selectedProjectToView.prod_url && (
                    <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-100 rounded">
                          <ExternalLink className="h-3.5 w-3.5 text-green-700" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Producción</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={selectedProjectToView.prod_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-800 font-medium underline"
                        >
                          Abrir
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copyToClipboard(selectedProjectToView.prod_url!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {!selectedProjectToView.repo_url && !selectedProjectToView.staging_url && !selectedProjectToView.prod_url && (
                    <p className="text-xs text-gray-400 py-2">No hay URLs configuradas</p>
                  )}
                </div>
              </div>

              {/* Plataforma de administración de dominio con icono */}
              {selectedProjectToView.domain_platform && selectedProjectToView.domain_platform !== 'none' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Plataforma de administración de dominio</h3>
                  <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="p-1.5 bg-blue-100 rounded">
                      {selectedProjectToView.domain_platform === 'godaddy' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'namecheap' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'squarespace' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'cloudflare' && <Cloud className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'route53' && <Server className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'hostinger' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'hostgator' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'domain_com' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'google_domains' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'hover' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'name_com' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'ionos' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                      {selectedProjectToView.domain_platform === 'other' && <Globe className="h-3.5 w-3.5 text-blue-700" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {selectedProjectToView.domain_platform === 'other' 
                        ? selectedProjectToView.domain_platform_other 
                        : selectedProjectToView.domain_platform === 'route53' 
                          ? 'Route 53 (AWS)'
                          : selectedProjectToView.domain_platform === 'domain_com'
                            ? 'Domain.com'
                            : selectedProjectToView.domain_platform === 'google_domains'
                              ? 'Google Domains'
                              : selectedProjectToView.domain_platform === 'name_com'
                                ? 'Name.com'
                                : selectedProjectToView.domain_platform === 'squarespace'
                                  ? 'Squarespace (Google Domains)'
                                  : selectedProjectToView.domain_platform === 'ionos'
                                    ? 'IONOS'
                                    : selectedProjectToView.domain_platform === 'hostgator'
                                      ? 'HostGator'
                                      : selectedProjectToView.domain_platform.charAt(0).toUpperCase() + selectedProjectToView.domain_platform.slice(1)}
                    </span>
                  </div>
                </div>
              )}

              {/* Plataforma de despliegue con icono */}
              {selectedProjectToView.deployment_platform && selectedProjectToView.deployment_platform !== 'none' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Plataforma de despliegue</h3>
                  <div className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="p-1.5 bg-purple-100 rounded">
                      {selectedProjectToView.deployment_platform === 'vercel' && <Zap className="h-3.5 w-3.5 text-purple-700" />}
                      {selectedProjectToView.deployment_platform === 'netlify' && <Cloud className="h-3.5 w-3.5 text-purple-700" />}
                      {selectedProjectToView.deployment_platform === 'aws' && <Server className="h-3.5 w-3.5 text-purple-700" />}
                      {selectedProjectToView.deployment_platform === 'heroku' && <Server className="h-3.5 w-3.5 text-purple-700" />}
                      {selectedProjectToView.deployment_platform === 'digitalocean' && <Cloud className="h-3.5 w-3.5 text-purple-700" />}
                      {selectedProjectToView.deployment_platform === 'railway' && <Zap className="h-3.5 w-3.5 text-purple-700" />}
                      {selectedProjectToView.deployment_platform === 'render' && <Cloud className="h-3.5 w-3.5 text-purple-700" />}
                      {selectedProjectToView.deployment_platform === 'other' && <Server className="h-3.5 w-3.5 text-purple-700" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {selectedProjectToView.deployment_platform === 'other' 
                        ? selectedProjectToView.deployment_platform_other 
                        : selectedProjectToView.deployment_platform === 'aws' 
                          ? 'AWS (Amazon Web Services)'
                          : selectedProjectToView.deployment_platform === 'digitalocean'
                            ? 'DigitalOcean'
                            : selectedProjectToView.deployment_platform.charAt(0).toUpperCase() + selectedProjectToView.deployment_platform.slice(1)}
                    </span>
                  </div>
                </div>
              )}

              {/* Stack tecnológico */}
              {selectedProjectToView.tech_stack && selectedProjectToView.tech_stack.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Stack tecnológico</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectToView.tech_stack.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables de entorno - Solo para developers */}
              {!isAdvisor && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Variables de entorno</h3>
                  {loadingEnvVars ? (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : envVariables.length > 0 ? (
                    <div className="space-y-2">
                      {envVariables.map((envVar, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-700">{envVar.key}</div>
                            <div className="text-xs text-gray-600 font-mono mt-0.5 truncate">
                              {visibleEnvVars.has(envVar.key) ? envVar.value : '••••••••••••'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleEnvVarVisibility(envVar.key)}
                            >
                              {visibleEnvVars.has(envVar.key) ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => copyToClipboard(envVar.value)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-2">No hay variables de entorno visibles para developers</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}