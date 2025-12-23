import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userProfileSchema } from '../../../lib/validations';
import { UserProfile } from '../../../lib/supabase';
import { useCreateUser, useUpdateUserProfile } from '../../../hooks/useUsers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Extended schema for creating new users
const createUserSchema = userProfileSchema.extend({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type UserFormData = z.infer<typeof userProfileSchema>;
type CreateUserFormData = z.infer<typeof createUserSchema>;

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  user?: UserProfile | null;
}

export function UserForm({ open, onClose, user }: UserFormProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUserProfile();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(user ? userProfileSchema : createUserSchema),
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          avatar_url: user.avatar_url || '',
        });
      } else {
        reset({
          email: '',
          full_name: '',
          role: 'dev',
          avatar_url: '',
          password: '',
        });
      }
    }
  }, [open, user, reset]);

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      if (user) {
        // Update existing user
        const { password, ...updateData } = data;
        await updateUser.mutateAsync({
          id: user.id,
          ...updateData,
        });
      } else {
        // Create new user
        await createUser.mutateAsync(data);
      }
      reset();
      onClose();
    } catch (error) {
      // Error already handled by mutation hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? 'Actualiza la información del usuario'
              : 'Crea un nuevo usuario en el sistema'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">
              Nombre Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="Juan Pérez"
            />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="juan@empresa.com"
              disabled={!!user}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
            {user && (
              <p className="text-xs text-gray-500">El email no puede ser modificado</p>
            )}
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="Mínimo 6 caracteres"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">
              Rol <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Administrador</span>
                    <span className="text-xs text-gray-500">Control total del sistema</span>
                  </div>
                </SelectItem>
                <SelectItem value="pm">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Project Manager</span>
                    <span className="text-xs text-gray-500">Gestión de proyectos y tareas</span>
                  </div>
                </SelectItem>
                <SelectItem value="dev">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Developer</span>
                    <span className="text-xs text-gray-500">Desarrollo de proyectos</span>
                  </div>
                </SelectItem>
                <SelectItem value="advisor">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Asesor Financiero</span>
                    <span className="text-xs text-gray-500">Gestión financiera</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_url">URL de Avatar (opcional)</Label>
            <Input
              id="avatar_url"
              type="url"
              {...register('avatar_url')}
              placeholder="https://ejemplo.com/avatar.jpg"
            />
            {errors.avatar_url && (
              <p className="text-sm text-red-500">{errors.avatar_url.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : user ? 'Actualizar' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}