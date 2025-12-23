import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recurringChargeSchema, RecurringChargeFormData } from '@/lib/validations';
import { useCreateRecurringCharge, useUpdateRecurringCharge } from '@/hooks/useFinances';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { RecurringCharge } from '@/lib/supabase';
import { format } from 'date-fns';
import { useEffect } from 'react';

interface RecurringChargeFormProps {
  open: boolean;
  onClose: () => void;
  charge?: RecurringCharge | null;
}

export function RecurringChargeForm({ open, onClose, charge }: RecurringChargeFormProps) {
  const { data: projects } = useProjects();
  const createCharge = useCreateRecurringCharge();
  const updateCharge = useUpdateRecurringCharge();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<RecurringChargeFormData>({
    resolver: zodResolver(recurringChargeSchema),
    defaultValues: {
      period: 'monthly',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      next_due_date: format(new Date(), 'yyyy-MM-dd'),
      is_active: true,
      type: 'income',
    },
  });

  // Resetear el formulario cuando se abre/cierra el dialog
  useEffect(() => {
    if (open) {
      if (charge) {
        reset(charge);
      } else {
        reset({
          period: 'monthly',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          next_due_date: format(new Date(), 'yyyy-MM-dd'),
          is_active: true,
          type: 'income',
        });
      }
    }
  }, [open, charge, reset]);

  const onSubmit = async (data: RecurringChargeFormData) => {
    try {
      // Solo crear - no editar
      await createCharge.mutateAsync(data);
      reset();
      onClose();
    } catch (error) {
      // Error already handled by mutation hooks
    }
  };

  const isCustomPeriod = watch('period') === 'custom';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo Cobro Recurrente</DialogTitle>
          <DialogDescription>
            Añade un nuevo cobro recurrente al sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Selector de Tipo */}
          <div>
            <Label>Tipo *</Label>
            <RadioGroup
              value={watch('type') || 'income'}
              onValueChange={(value) => setValue('type', value as 'income' | 'expense')}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="income" id="type-income" />
                <Label htmlFor="type-income" className="cursor-pointer">
                  💰 Ingreso
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="expense" id="type-expense" />
                <Label htmlFor="type-expense" className="cursor-pointer">
                  💸 Egreso
                </Label>
              </div>
            </RadioGroup>
            {errors.type && (
              <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="project_id">Proyecto *</Label>
            <Select
              value={watch('project_id') || ''}
              onValueChange={(value) => setValue('project_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.project_id && (
              <p className="text-sm text-red-600 mt-1">{errors.project_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descripción *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Mantenimiento mensual, hosting, etc."
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Monto *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="period">Periodo</Label>
              <Select
                value={watch('period') || 'monthly'}
                onValueChange={(value) => setValue('period', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCustomPeriod && (
            <div>
              <Label htmlFor="custom_days">Días del Periodo Personalizado</Label>
              <Input
                id="custom_days"
                type="number"
                {...register('custom_days', { valueAsNumber: true })}
                placeholder="30"
              />
              {errors.custom_days && (
                <p className="text-sm text-red-600 mt-1">{errors.custom_days.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Fecha de Inicio *</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
            </div>

            <div>
              <Label htmlFor="next_due_date">Próximo Vencimiento *</Label>
              <Input id="next_due_date" type="date" {...register('next_due_date')} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={watch('is_active')}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
            <Label htmlFor="is_active">Activo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createCharge.isPending}
            >
              {createCharge.isPending ? 'Guardando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}