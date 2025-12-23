import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { clientSchema, ClientFormData } from '../../../lib/validations';
import { useCreateClient, useUpdateClient } from '../../../hooks/useClients';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Client } from '../../../lib/supabase';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
}

export function ClientForm({ open, onClose, client }: ClientFormProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      is_active: true,
    },
  });

  // Reset form when client changes or dialog opens
  useEffect(() => {
    if (open) {
      if (client) {
        reset({
          name: client.name,
          contact_name: client.contact_name || '',
          contact_email: client.contact_email || '',
          contact_phone: client.contact_phone || '',
          address: client.address || '',
          notes: client.notes || '',
          is_active: client.is_active,
        });
      } else {
        reset({
          name: '',
          contact_name: '',
          contact_email: '',
          contact_phone: '',
          address: '',
          notes: '',
          is_active: true,
        });
      }
    }
  }, [open, client, reset]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (client?.id) {
        await updateClient.mutateAsync({ id: client.id, ...data });
      } else {
        await createClient.mutateAsync(data);
      }
      reset();
      onClose();
    } catch (error) {
      // Error already handled by mutation hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          <DialogDescription>
            {client ? 'Actualiza la información del cliente' : 'Añade un nuevo cliente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Cliente *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Nombre de la empresa"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contact_name">Nombre de Contacto</Label>
            <Input
              id="contact_name"
              {...register('contact_name')}
              placeholder="Juan Pérez"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email">Email de Contacto</Label>
              <Input
                id="contact_email"
                type="email"
                {...register('contact_email')}
                placeholder="contacto@empresa.com"
              />
              {errors.contact_email && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.contact_email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="contact_phone">Teléfono de Contacto</Label>
              <Input
                id="contact_phone"
                {...register('contact_phone')}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Dirección física"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notas adicionales sobre el cliente"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createClient.isPending || updateClient.isPending}
            >
              {createClient.isPending || updateClient.isPending
                ? 'Guardando...'
                : client
                ? 'Actualizar'
                : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}