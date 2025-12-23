import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentMethodSchema, PaymentMethodFormData } from '@/lib/validations';
import { useCreatePaymentMethod, useUpdatePaymentMethod } from '@/hooks/useFinances';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { PaymentMethod } from '@/lib/supabase';

interface PaymentMethodFormProps {
  open: boolean;
  onClose: () => void;
  paymentMethod?: PaymentMethod | null;
}

export function PaymentMethodForm({ open, onClose, paymentMethod }: PaymentMethodFormProps) {
  const createPaymentMethod = useCreatePaymentMethod();
  const updatePaymentMethod = useUpdatePaymentMethod();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: paymentMethod || {
      is_active: true,
    },
  });

  const onSubmit = async (data: PaymentMethodFormData) => {
    try {
      if (paymentMethod?.id) {
        await updatePaymentMethod.mutateAsync({ id: paymentMethod.id, ...data });
      } else {
        await createPaymentMethod.mutateAsync(data);
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
            {paymentMethod ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
          </DialogTitle>
          <DialogDescription>
            {paymentMethod
              ? 'Actualiza los detalles del método de pago'
              : 'Añade un nuevo método de pago al sistema'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: Transferencia bancaria, Efectivo, Tarjeta..."
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detalles adicionales del método de pago"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createPaymentMethod.isPending || updatePaymentMethod.isPending}
            >
              {createPaymentMethod.isPending || updatePaymentMethod.isPending
                ? 'Guardando...'
                : paymentMethod
                ? 'Actualizar'
                : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
