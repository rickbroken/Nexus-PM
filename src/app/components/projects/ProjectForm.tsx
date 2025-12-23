import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateProject, useUpdateProject } from '../../../hooks/useProjects';
import { useClients } from '../../../hooks/useClients';
import { useUsers } from '../../../hooks/useUsers';
import { useProjectMembers, useAddProjectMembers } from '../../../hooks/useProjectMembers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
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
import { Plus, Trash2, Eye, EyeOff, X, Users } from 'lucide-react';
import { Project } from '../../../lib/supabase';
import { toast } from 'sonner';
import { Checkbox } from '../ui/checkbox';

const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  client_id: z.string().nullable(),
  description: z.string().optional(),
  status: z.enum(['planning', 'in_development', 'active', 'paused', 'completed', 'cancelled']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  repo_url: z.string().url('URL inválida').or(z.literal('')).optional(),
  staging_url: z.string().url('URL inválida').or(z.literal('')).optional(),
  prod_url: z.string().url('URL inválida').or(z.literal('')).optional(),
  deployment_platform: z.string().optional(),
  deployment_platform_other: z.string().optional(),
  domain_platform: z.string().optional(),
  domain_platform_other: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface EnvVariable {
  id: string;
  key: string;
  value: string;
  visible: boolean;
}

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}

export function ProjectForm({ open, onClose, project }: ProjectFormProps) {
  const { data: clients } = useClients();
  const { data: users } = useUsers();
  const { data: projectMembers } = useProjectMembers(project?.id);
  const addProjectMembers = useAddProjectMembers();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { user } = useAuth();
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [customTech, setCustomTech] = useState<string>('');
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([]);

  const commonTechnologies = [
    'Angular', 'AWS', 'Azure', 'Bootstrap', 'C#', 'Chakra UI', 'Django', 
    'Docker', 'Express', 'FastAPI', 'Firebase', 'Flask', 'GCP', 'Go', 
    'GraphQL', 'Java', 'JavaScript', 'Kubernetes', 'Laravel', 'Material-UI', 
    'MongoDB', 'MySQL', 'NestJS', 'Next.js', 'Node.js', 'Nuxt', 'PHP', 
    'PostgreSQL', 'Python', 'React', 'Redis', 'REST API', 'Ruby on Rails', 
    'Rust', 'Spring Boot', 'Svelte', 'Symfony', 'Tailwind CSS', 'TypeScript', 'Vue'
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'planning',
    },
  });

  // Reset form when project changes or dialog opens
  useEffect(() => {
    if (open) {
      if (project) {
        reset({
          name: project.name,
          client_id: project.client_id,
          description: project.description || '',
          status: project.status,
          start_date: project.start_date || '',
          end_date: project.end_date || '',
          repo_url: project.repo_url || '',
          staging_url: project.staging_url || '',
          prod_url: project.prod_url || '',
          deployment_platform: project.deployment_platform || 'sin especificar',
          deployment_platform_other: project.deployment_platform_other || '',
          domain_platform: project.domain_platform || 'sin especificar',
          domain_platform_other: project.domain_platform_other || '',
        });
        // Load tech stack
        setTechStack(project.tech_stack || []);
        
        // Clear selected developers first - will be loaded by the other useEffect
        setSelectedDevelopers([]);
        
        // Load environment variables
        const loadEnvVariables = async () => {
          try {
            const { data, error } = await supabase
              .from('project_env_variables')
              .select('*')
              .eq('project_id', project.id);
            
            if (error) {
              // Check if it's a "table not found" error - silently ignore
              if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
                // Table doesn't exist yet - user needs to run migration
                setEnvVariables([]);
                return;
              }
            } else if (data) {
              setEnvVariables(data.map((item) => ({
                id: item.id,
                key: item.key,
                value: item.value,
                visible: item.visible_to_devs,
              })));
            }
          } catch (err) {
            // Silently catch unexpected errors
            setEnvVariables([]);
          }
        };
        loadEnvVariables();
      } else {
        reset({
          name: '',
          client_id: null,
          description: '',
          status: 'planning',
          start_date: '',
          end_date: '',
          repo_url: '',
          staging_url: '',
          prod_url: '',
          deployment_platform: 'sin especificar',
          deployment_platform_other: '',
          domain_platform: 'sin especificar',
          domain_platform_other: '',
        });
        setEnvVariables([]);
        setTechStack([]);
        setSelectedDevelopers([]);
      }
    }
  }, [open, project, reset]);

  // Load assigned developers when projectMembers data is available
  useEffect(() => {
    if (project?.id && projectMembers) {
      const developerIds = projectMembers.map(m => m.user_id);
      setSelectedDevelopers(developerIds);
    }
  }, [projectMembers, project?.id]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      // Clean up empty strings to null for optional fields
      const cleanData = {
        name: data.name,
        client_id: data.client_id || null,
        description: data.description?.trim() || null,
        status: data.status || 'planning',
        start_date: data.start_date?.trim() || null,
        end_date: data.end_date?.trim() || null,
        repo_url: data.repo_url?.trim() || null,
        staging_url: data.staging_url?.trim() || null,
        prod_url: data.prod_url?.trim() || null,
        deployment_platform: data.deployment_platform || 'sin especificar',
        deployment_platform_other: data.deployment_platform_other?.trim() || null,
        domain_platform: data.domain_platform || 'sin especificar',
        domain_platform_other: data.domain_platform_other?.trim() || null,
        tech_stack: techStack,
        // ✅ SIEMPRE incluir created_by al crear proyecto (para que funcione el trigger de notificaciones)
        ...(!project?.id && { created_by: user?.id }),
      };

      if (project?.id) {
        const result = await updateProject.mutateAsync({ id: project.id, ...cleanData });
        
        // Update project members (developers)
        try {
          await addProjectMembers.mutateAsync({
            projectId: project.id,
            userIds: selectedDevelopers,
            addedBy: user?.id,
          });
        } catch (memberErr) {
          console.error('Error updating project members:', memberErr);
          toast.warning('Proyecto actualizado pero hubo un error al asignar desarrolladores');
        }
        
        // Update environment variables for existing project
        try {
          // Delete all existing variables for this project first
          await supabase
            .from('project_env_variables')
            .delete()
            .eq('project_id', project.id);

          // Insert new variables only if there are any
          if (envVariables.length > 0) {
            const varsToInsert = envVariables
              .filter(v => v.key.trim() && v.value.trim()) // Only insert non-empty
              .map(v => ({
                project_id: project.id,
                key: v.key.trim(),
                value: v.value.trim(),
                visible_to_devs: v.visible,
                created_by: user?.id,
              }));

            if (varsToInsert.length > 0) {
              const { error: envError } = await supabase
                .from('project_env_variables')
                .insert(varsToInsert);
              
              if (envError) {
                // Check if table doesn't exist
                if (envError.code === 'PGRST205' || envError.message.includes('Could not find the table')) {
                  toast.warning('Proyecto actualizado. Para guardar variables de entorno, ejecuta la migración SQL.');
                } else {
                  toast.error('Proyecto actualizado pero hubo un error al guardar las variables de entorno');
                }
              }
            }
          }
        } catch (envErr) {
          // Don't fail the whole operation
          // Check if it's a "table not found" error - silently ignore
          const error = envErr as any;
          if (!(error.code === 'PGRST205' || error.message?.includes('Could not find the table'))) {
            console.error('Error updating environment variables:', envErr);
          }
        }
      } else {
        const result = await createProject.mutateAsync(cleanData);
        
        // Add project members (developers) for new project
        if (selectedDevelopers.length > 0 && result.id) {
          try {
            await addProjectMembers.mutateAsync({
              projectId: result.id,
              userIds: selectedDevelopers,
              addedBy: user?.id,
            });
          } catch (memberErr) {
            console.error('Error adding project members:', memberErr);
            toast.warning('Proyecto creado pero hubo un error al asignar desarrolladores');
          }
        }
        
        // Insert environment variables for new project
        if (envVariables.length > 0 && result.id) {
          try {
            const varsToInsert = envVariables
              .filter(v => v.key.trim() && v.value.trim()) // Only insert non-empty
              .map(v => ({
                project_id: result.id,
                key: v.key.trim(),
                value: v.value.trim(),
                visible_to_devs: v.visible,
                created_by: user?.id,
              }));

            if (varsToInsert.length > 0) {
              const { error: envError } = await supabase
                .from('project_env_variables')
                .insert(varsToInsert);
              
              if (envError) {
                // Check if table doesn't exist
                if (envError.code === 'PGRST205' || envError.message.includes('Could not find the table')) {
                  toast.warning('Proyecto creado. Para guardar variables de entorno, ejecuta la migración SQL.');
                } else {
                  toast.error('Proyecto creado pero hubo un error al guardar las variables de entorno');
                }
              }
            }
          } catch (envErr) {
            // Don't fail the whole operation
          }
        }
      }
      
      reset();
      setEnvVariables([]);
      setTechStack([]);
      onClose();
    } catch (error) {
      // Error is already handled by the mutation hooks with SweetAlert2
    }
  };

  const addEnvVariable = () => {
    const newId = `env-${Date.now()}`;
    setEnvVariables([...envVariables, { id: newId, key: '', value: '', visible: true }]);
  };

  const removeEnvVariable = (id: string) => {
    setEnvVariables(envVariables.filter((v) => v.id !== id));
  };

  const updateEnvVariable = (id: string, field: 'key' | 'value', value: string) => {
    setEnvVariables(
      envVariables.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      )
    );
  };

  const toggleEnvVisibility = (id: string) => {
    setEnvVariables(
      envVariables.map((v) =>
        v.id === id ? { ...v, visible: !v.visible } : v
      )
    );
  };

  const addTechToStack = () => {
    if (selectedTech && !techStack.includes(selectedTech)) {
      setTechStack([...techStack, selectedTech]);
      setSelectedTech('');
    } else if (customTech && !techStack.includes(customTech.trim())) {
      setTechStack([...techStack, customTech.trim()]);
      setCustomTech('');
    }
  };

  const removeTechFromStack = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </DialogTitle>
          <DialogDescription>
            {project ? 'Actualiza la información del proyecto' : 'Crea un nuevo proyecto'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Proyecto *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Nombre del proyecto"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="client_id">Cliente</Label>
            <Select
              value={watch('client_id') || 'none'}
              onValueChange={(value) =>
                setValue('client_id', value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin cliente</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descripción del proyecto"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              value={watch('status') || 'planning'}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planificación</SelectItem>
                <SelectItem value="in_development">En Desarrollo</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
            </div>
            <div>
              <Label htmlFor="end_date">Fecha de Fin</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="repo_url">URL del Repositorio</Label>
            <Input
              id="repo_url"
              {...register('repo_url')}
              placeholder="https://github.com/..."
            />
            {errors.repo_url && (
              <p className="text-sm text-red-600 mt-1">{errors.repo_url.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="staging_url">URL de Staging</Label>
            <Input
              id="staging_url"
              {...register('staging_url')}
              placeholder="https://staging.example.com"
            />
            {errors.staging_url && (
              <p className="text-sm text-red-600 mt-1">{errors.staging_url.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="prod_url">URL de Producción</Label>
            <Input
              id="prod_url"
              {...register('prod_url')}
              placeholder="https://example.com"
            />
            {errors.prod_url && (
              <p className="text-sm text-red-600 mt-1">{errors.prod_url.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="domain_platform">Plataforma de Administración de Dominio</Label>
            <Select
              value={watch('domain_platform') || 'sin especificar'}
              onValueChange={(value) => setValue('domain_platform', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sin especificar">Sin especificar</SelectItem>
                <SelectItem value="godaddy">GoDaddy</SelectItem>
                <SelectItem value="namecheap">Namecheap</SelectItem>
                <SelectItem value="squarespace">Squarespace (Google Domains)</SelectItem>
                <SelectItem value="cloudflare">Cloudflare</SelectItem>
                <SelectItem value="route53">Route 53 (AWS)</SelectItem>
                <SelectItem value="hostinger">Hostinger</SelectItem>
                <SelectItem value="hostgator">HostGator</SelectItem>
                <SelectItem value="domain_com">Domain.com</SelectItem>
                <SelectItem value="google_domains">Google Domains</SelectItem>
                <SelectItem value="hover">Hover</SelectItem>
                <SelectItem value="name_com">Name.com</SelectItem>
                <SelectItem value="ionos">IONOS</SelectItem>
                <SelectItem value="other">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {watch('domain_platform') === 'other' && (
            <div>
              <Label htmlFor="domain_platform_other">Especificar Otra Plataforma de Dominio</Label>
              <Input
                id="domain_platform_other"
                {...register('domain_platform_other')}
                placeholder="Nombre de la plataforma"
              />
            </div>
          )}

          <div>
            <Label htmlFor="deployment_platform">Plataforma de Despliegue</Label>
            <Select
              value={watch('deployment_platform') || 'sin especificar'}
              onValueChange={(value) => setValue('deployment_platform', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sin especificar">Sin especificar</SelectItem>
                <SelectItem value="vercel">Vercel</SelectItem>
                <SelectItem value="netlify">Netlify</SelectItem>
                <SelectItem value="aws">AWS (Amazon Web Services)</SelectItem>
                <SelectItem value="heroku">Heroku</SelectItem>
                <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                <SelectItem value="railway">Railway</SelectItem>
                <SelectItem value="render">Render</SelectItem>
                <SelectItem value="google_cloud">Google Cloud</SelectItem>
                <SelectItem value="azure">Microsoft Azure</SelectItem>
                <SelectItem value="cloudflare">Cloudflare Pages</SelectItem>
                <SelectItem value="github_pages">GitHub Pages</SelectItem>
                <SelectItem value="other">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {watch('deployment_platform') === 'other' && (
            <div>
              <Label htmlFor="deployment_platform_other">Especificar Otra Plataforma</Label>
              <Input
                id="deployment_platform_other"
                {...register('deployment_platform_other')}
                placeholder="Nombre de la plataforma"
              />
            </div>
          )}

          <div>
            <Label>Variables de Entorno</Label>
            <div className="space-y-2">
              {envVariables.map((varItem) => (
                <div key={varItem.id} className="flex items-center space-x-2">
                  <Input
                    value={varItem.key}
                    onChange={(e) =>
                      updateEnvVariable(varItem.id, 'key', e.target.value)
                    }
                    placeholder="Clave"
                    className="w-1/3"
                  />
                  <Input
                    value={varItem.value}
                    onChange={(e) =>
                      updateEnvVariable(varItem.id, 'value', e.target.value)
                    }
                    placeholder="Valor"
                    className="w-1/3"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleEnvVisibility(varItem.id)}
                  >
                    {varItem.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeEnvVariable(varItem.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addEnvVariable}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Variable de Entorno
              </Button>
            </div>
          </div>

          <div>
            <Label>Tecnologías Utilizadas</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Select
                  value={selectedTech}
                  onValueChange={(value) => setSelectedTech(value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar tecnología" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonTechnologies.filter(tech => !techStack.includes(tech)).map((tech) => (
                      <SelectItem key={tech} value={tech}>
                        {tech}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-gray-500">o</span>
                <Input
                  value={customTech}
                  onChange={(e) => setCustomTech(e.target.value)}
                  placeholder="Tecnología personalizada"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTechToStack();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTechToStack}
                  disabled={!selectedTech && !customTech.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => removeTechFromStack(tech)}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Desarrolladores Asignados
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              Selecciona los desarrolladores que trabajarán en este proyecto
            </p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
              {users?.filter(u => u.role === 'dev').map((developer) => (
                <div key={developer.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dev-${developer.id}`}
                    checked={selectedDevelopers.includes(developer.id)}
                    onCheckedChange={async (checked) => {
                      if (checked) {
                        setSelectedDevelopers([...selectedDevelopers, developer.id]);
                      } else {
                        // Validar si el developer tiene tareas pendientes antes de permitir desmarcarlo
                        if (project?.id) {
                          try {
                            const { data: pendingTasks, error } = await supabase
                              .from('tasks')
                              .select('id, title')
                              .eq('project_id', project.id)
                              .eq('assigned_to', developer.id)
                              .neq('status', 'done');

                            if (error) throw error;

                            if (pendingTasks && pendingTasks.length > 0) {
                              toast.error(
                                `No puedes desasignar a ${developer.full_name}`,
                                {
                                  description: `Tiene ${pendingTasks.length} tarea${pendingTasks.length > 1 ? 's' : ''} pendiente${pendingTasks.length > 1 ? 's' : ''} en este proyecto. Completa o reasigna las tareas primero.`,
                                  duration: 5000,
                                }
                              );
                              return; // No permitir la desasignación
                            }
                          } catch (error) {
                            console.error('Error checking pending tasks:', error);
                            toast.error('Error al verificar tareas pendientes');
                            return;
                          }
                        }
                        
                        // Si no hay tareas pendientes o es un proyecto nuevo, permitir desasignar
                        setSelectedDevelopers(selectedDevelopers.filter(id => id !== developer.id));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`dev-${developer.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {developer.full_name} ({developer.email})
                  </Label>
                </div>
              ))}
              {users?.filter(u => u.role === 'dev').length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  No hay desarrolladores disponibles
                </p>
              )}
            </div>
            {selectedDevelopers.length > 0 && (
              <p className="text-sm text-blue-600 mt-2">
                {selectedDevelopers.length} desarrollador{selectedDevelopers.length > 1 ? 'es' : ''} seleccionado{selectedDevelopers.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createProject.isPending || updateProject.isPending}
            >
              {createProject.isPending || updateProject.isPending
                ? 'Guardando...'
                : project
                ? 'Actualizar'
                : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}