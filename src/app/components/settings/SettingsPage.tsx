import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, Bell, Shield, Palette, Database, Clock, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useKanbanColors, KanbanColors } from '../../../hooks/useKanbanColors';
import Swal from 'sweetalert2';

const profileSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  avatar_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  current_password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  new_password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string(),
}).refine(data => data.new_password === data.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Notificaciones
  const [notifications, setNotifications] = useState({
    email_tasks: true,
    email_projects: true,
    email_payments: false,
    push_tasks: true,
    push_mentions: true,
  });

  // Preferencias
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'es',
    timezone: 'America/Mexico_City',
    date_format: 'DD/MM/YYYY',
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      avatar_url: user?.avatar_url || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleProfileUpdate = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users_profiles')
        .update({
          full_name: data.full_name,
          avatar_url: data.avatar_url || null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      refreshUser();

      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    const newPassword = passwordForm.getValues('new_password');
    if (!newPassword) {
      toast.error('Por favor ingresa una nueva contraseña');
      return;
    }

    setIsLoading(true);
    try {
      await supabase.auth.updateUser({ password: newPassword });
      toast.success('Contraseña actualizada correctamente');
      passwordForm.reset();
    } catch (error) {
      toast.error('Error al cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    toast.success('Preferencias de notificación guardadas');
  };

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Kanban colors state
  const { colors: kanbanColors, updateColors: updateKanbanColors } = useKanbanColors();
  const [localKanbanColors, setLocalKanbanColors] = useState<KanbanColors>(kanbanColors);

  // Sync local colors with global colors
  useEffect(() => {
    setLocalKanbanColors(kanbanColors);
  }, [kanbanColors]);

  const COLOR_OPTIONS = [
    { label: 'Gris Claro', value: 'bg-gray-100', preview: '#f3f4f6' },
    { label: 'Gris', value: 'bg-gray-200', preview: '#e5e7eb' },
    { label: 'Azul Claro', value: 'bg-blue-100', preview: '#dbeafe' },
    { label: 'Azul', value: 'bg-blue-200', preview: '#bfdbfe' },
    { label: 'Verde Claro', value: 'bg-green-100', preview: '#dcfce7' },
    { label: 'Verde', value: 'bg-green-200', preview: '#bbf7d0' },
    { label: 'Amarillo Claro', value: 'bg-yellow-100', preview: '#fef9c3' },
    { label: 'Amarillo', value: 'bg-yellow-200', preview: '#fef08a' },
    { label: 'Naranja Claro', value: 'bg-orange-100', preview: '#ffedd5' },
    { label: 'Naranja', value: 'bg-orange-200', preview: '#fed7aa' },
    { label: 'Rojo Claro', value: 'bg-red-100', preview: '#fee2e2' },
    { label: 'Rojo', value: 'bg-red-200', preview: '#fecaca' },
    { label: 'Púrpura Claro', value: 'bg-purple-100', preview: '#f3e8ff' },
    { label: 'Púrpura', value: 'bg-purple-200', preview: '#e9d5ff' },
    { label: 'Rosa Claro', value: 'bg-pink-100', preview: '#fce7f3' },
    { label: 'Rosa', value: 'bg-pink-200', preview: '#fbcfe8' },
    { label: 'Índigo Claro', value: 'bg-indigo-100', preview: '#e0e7ff' },
    { label: 'Índigo', value: 'bg-indigo-200', preview: '#c7d2fe' },
    { label: 'Cyan Claro', value: 'bg-cyan-100', preview: '#cffafe' },
    { label: 'Cyan', value: 'bg-cyan-200', preview: '#a5f3fc' },
  ];

  const handleKanbanColorChange = (role: 'dev' | 'pm', status: string, color: string) => {
    setLocalKanbanColors((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [status]: color,
      },
    }));
  };

  const handleSaveKanbanColors = async () => {
    try {
      await updateKanbanColors.mutateAsync(localKanbanColors);
      await Swal.fire({
        title: 'Colores actualizados',
        text: 'Los colores del Kanban se han actualizado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron actualizar los colores',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-zinc-600 mt-1">
          Administra tu cuenta y preferencias del sistema
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Preferencias</span>
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="system" className="gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Sistema</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Perfil */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Actualiza tu información de perfil y foto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Cambiar foto
                  </Button>
                  <p className="text-sm text-zinc-500 mt-2">
                    JPG, PNG o GIF. Máximo 2MB
                  </p>
                </div>
              </div>

              <Separator />

              <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre completo</Label>
                    <Input
                      id="full_name"
                      {...profileForm.register('full_name')}
                      placeholder="Tu nombre completo"
                    />
                    {profileForm.formState.errors.full_name && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...profileForm.register('email')}
                      disabled
                      className="bg-zinc-50"
                    />
                    <p className="text-xs text-zinc-500">
                      El email no se puede cambiar
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar_url">URL de Avatar (opcional)</Label>
                  <Input
                    id="avatar_url"
                    {...profileForm.register('avatar_url')}
                    placeholder="https://ejemplo.com/avatar.jpg"
                  />
                  {profileForm.formState.errors.avatar_url && (
                    <p className="text-sm text-red-500">
                      {profileForm.formState.errors.avatar_url.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Input
                    value={user?.role?.toUpperCase() || ''}
                    disabled
                    className="bg-zinc-50"
                  />
                  <p className="text-xs text-zinc-500">
                    Solo los administradores pueden cambiar roles
                  </p>
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seguridad */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>
                Actualiza tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Contraseña actual</Label>
                  <Input
                    id="current_password"
                    type="password"
                    {...passwordForm.register('current_password')}
                  />
                  {passwordForm.formState.errors.current_password && (
                    <p className="text-sm text-red-500">
                      {passwordForm.formState.errors.current_password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">Nueva contraseña</Label>
                  <Input
                    id="new_password"
                    type="password"
                    {...passwordForm.register('new_password')}
                  />
                  {passwordForm.formState.errors.new_password && (
                    <p className="text-sm text-red-500">
                      {passwordForm.formState.errors.new_password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    {...passwordForm.register('confirm_password')}
                  />
                  {passwordForm.formState.errors.confirm_password && (
                    <p className="text-sm text-red-500">
                      {passwordForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Cambiando...' : 'Cambiar contraseña'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sesiones Activas</CardTitle>
              <CardDescription>
                Administra tus dispositivos y sesiones conectadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                    <Database className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div>
                    <p className="font-medium">Sesión actual</p>
                    <p className="text-sm text-zinc-500">
                      Última actividad: Ahora
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Activa
                </Button>
              </div>

              <Separator />

              <Button variant="destructive" size="sm">
                Cerrar todas las sesiones
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificaciones */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones por Email</CardTitle>
              <CardDescription>
                Configura qué notificaciones quieres recibir por email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tareas asignadas</Label>
                  <p className="text-sm text-zinc-500">
                    Recibe notificaciones cuando te asignen una tarea
                  </p>
                </div>
                <Switch
                  checked={notifications.email_tasks}
                  onCheckedChange={(checked) => handleNotificationChange('email_tasks', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Actualizaciones de proyectos</Label>
                  <p className="text-sm text-zinc-500">
                    Notificaciones sobre cambios en tus proyectos
                  </p>
                </div>
                <Switch
                  checked={notifications.email_projects}
                  onCheckedChange={(checked) => handleNotificationChange('email_projects', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Recordatorios de pagos</Label>
                  <p className="text-sm text-zinc-500">
                    Alertas sobre pagos pendientes y vencidos
                  </p>
                </div>
                <Switch
                  checked={notifications.email_payments}
                  onCheckedChange={(checked) => handleNotificationChange('email_payments', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificaciones Push</CardTitle>
              <CardDescription>
                Notificaciones en tiempo real en tu navegador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tareas</Label>
                  <p className="text-sm text-zinc-500">
                    Notificaciones instantáneas de tareas
                  </p>
                </div>
                <Switch
                  checked={notifications.push_tasks}
                  onCheckedChange={(checked) => handleNotificationChange('push_tasks', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Menciones</Label>
                  <p className="text-sm text-zinc-500">
                    Cuando alguien te menciona en un comentario
                  </p>
                </div>
                <Switch
                  checked={notifications.push_mentions}
                  onCheckedChange={(checked) => handleNotificationChange('push_mentions', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferencias */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
              <CardDescription>
                La aplicación está configurada en modo claro fijo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    ☀️ <strong>Modo Claro</strong> - El sistema utiliza una interfaz clara optimizada para trabajar durante el día.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Idioma</Label>
                <select
                  className="w-full rounded-md border border-zinc-300 px-3 py-2"
                  value={preferences.language}
                  onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Región y Formato</CardTitle>
              <CardDescription>
                Configura tu zona horaria y formatos de fecha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Zona horaria</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <select
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
                    value={preferences.timezone}
                    onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                  >
                    <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                    <option value="America/New_York">Nueva York (GMT-5)</option>
                    <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                    <option value="Europe/Madrid">Madrid (GMT+1)</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Formato de fecha</Label>
                <select
                  className="w-full rounded-md border border-zinc-300 px-3 py-2"
                  value={preferences.date_format}
                  onChange={(e) => setPreferences(prev => ({ ...prev, date_format: e.target.value }))}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <Button onClick={() => toast.success('Preferencias guardadas')}>
                Guardar preferencias
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sistema (Solo Admin) */}
        {user?.role === 'admin' && (
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Colores del Kanban</CardTitle>
                <CardDescription>
                  Personaliza los colores de los contenedores de estados del tablero Kanban
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Colores para Developers */}
                <div className="border rounded-lg p-4 bg-zinc-50">
                  <h3 className="font-semibold mb-4">Developers</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Por Hacer</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((option) => (
                          <button
                            key={`dev-todo-${option.value}`}
                            type="button"
                            onClick={() => handleKanbanColorChange('dev', 'todo', option.value)}
                            className={`p-3 rounded border-2 transition-all ${
                              localKanbanColors.dev.todo === option.value
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: option.preview }}
                            title={option.label}
                          >
                            <span className="sr-only">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">En Progreso</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((option) => (
                          <button
                            key={`dev-in_progress-${option.value}`}
                            type="button"
                            onClick={() => handleKanbanColorChange('dev', 'in_progress', option.value)}
                            className={`p-3 rounded border-2 transition-all ${
                              localKanbanColors.dev.in_progress === option.value
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: option.preview }}
                            title={option.label}
                          >
                            <span className="sr-only">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Listo para Revisar</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((option) => (
                          <button
                            key={`dev-review-${option.value}`}
                            type="button"
                            onClick={() => handleKanbanColorChange('dev', 'review', option.value)}
                            className={`p-3 rounded border-2 transition-all ${
                              localKanbanColors.dev.review === option.value
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: option.preview }}
                            title={option.label}
                          >
                            <span className="sr-only">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colores para Product Managers */}
                <div className="border rounded-lg p-4 bg-zinc-50">
                  <h3 className="font-semibold mb-4">Product Managers</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Asignadas</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((option) => (
                          <button
                            key={`pm-todo-${option.value}`}
                            type="button"
                            onClick={() => handleKanbanColorChange('pm', 'todo', option.value)}
                            className={`p-3 rounded border-2 transition-all ${
                              localKanbanColors.pm.todo === option.value
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: option.preview }}
                            title={option.label}
                          >
                            <span className="sr-only">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Por Revisar</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((option) => (
                          <button
                            key={`pm-review-${option.value}`}
                            type="button"
                            onClick={() => handleKanbanColorChange('pm', 'review', option.value)}
                            className={`p-3 rounded border-2 transition-all ${
                              localKanbanColors.pm.review === option.value
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: option.preview }}
                            title={option.label}
                          >
                            <span className="sr-only">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Completadas</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((option) => (
                          <button
                            key={`pm-done-${option.value}`}
                            type="button"
                            onClick={() => handleKanbanColorChange('pm', 'done', option.value)}
                            className={`p-3 rounded border-2 transition-all ${
                              localKanbanColors.pm.done === option.value
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: option.preview }}
                            title={option.label}
                          >
                            <span className="sr-only">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveKanbanColors} disabled={updateKanbanColors.isPending}>
                  {updateKanbanColors.isPending ? 'Guardando...' : 'Guardar Colores del Kanban'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}