import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema, PaymentFormData } from '@/lib/validations';
import { useCreatePayment, usePaymentMethods } from '@/hooks/useFinances';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Payment } from '@/lib/supabase';
import { format } from 'date-fns';
import { formatCurrencyInput, parseCurrency, formatCurrency } from '@/lib/formatters';
import { useState, useEffect, useMemo } from 'react';

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  payment?: Payment | null;
}

export function PaymentForm({ open, onClose, payment }: PaymentFormProps) {
  const { data: projects } = useProjects();
  const { data: paymentMethods } = usePaymentMethods();
  const createPayment = useCreatePayment();
  
  // Bloquear edición - solo permitir creación
  useEffect(() => {
    if (payment) {
      console.warn('⚠️ PaymentForm: Los pagos no pueden ser editados, solo creados');
      onClose();
    }
  }, [payment, onClose]);
  
  // Estados para el display formateado de cada campo de moneda
  const [amountDisplay, setAmountDisplay] = useState('');
  const [hostingCostDisplay, setHostingCostDisplay] = useState('');
  const [domainCostDisplay, setDomainCostDisplay] = useState('');
  const [otherCostDisplay, setOtherCostDisplay] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: payment || {
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
      type: 'income',
      hosting_cost: 0,
      domain_cost: 0,
      other_cost: 0,
    },
  });

  // Watch de los valores de costos para calcular el total
  const hostingCost = watch('hosting_cost') || 0;
  const domainCost = watch('domain_cost') || 0;
  const otherCost = watch('other_cost') || 0;
  const amount = watch('amount') || 0;

  // Calcular el total sumando todos los costos
  const totalAmount = useMemo(() => {
    return amount - hostingCost - domainCost - otherCost;
  }, [amount, hostingCost, domainCost, otherCost]);

  // Inicializar el display de los montos cuando se abre el formulario para editar
  useEffect(() => {
    if (payment) {
      setAmountDisplay(payment.amount ? formatCurrency(payment.amount) : '');
      setHostingCostDisplay(payment.hosting_cost ? formatCurrency(payment.hosting_cost) : '');
      setDomainCostDisplay(payment.domain_cost ? formatCurrency(payment.domain_cost) : '');
      setOtherCostDisplay(payment.other_cost ? formatCurrency(payment.other_cost) : '');
      
      setValue('amount', payment.amount || 0);
      setValue('hosting_cost', payment.hosting_cost || 0);
      setValue('domain_cost', payment.domain_cost || 0);
      setValue('other_cost', payment.other_cost || 0);
    } else {
      setAmountDisplay('');
      setHostingCostDisplay('');
      setDomainCostDisplay('');
      setOtherCostDisplay('');
      
      setValue('amount', 0);
      setValue('hosting_cost', 0);
      setValue('domain_cost', 0);
      setValue('other_cost', 0);
    }
  }, [payment, setValue]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatCurrencyInput(inputValue);
    setAmountDisplay(formatted);
    
    const numericValue = parseCurrency(formatted);
    console.log('💰 PaymentForm - Amount conversion:', {
      inputValue,
      formatted,
      numericValue,
    });
    setValue('amount', numericValue, { shouldValidate: true });
  };

  const handleHostingCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatCurrencyInput(inputValue);
    setHostingCostDisplay(formatted);
    
    const numericValue = parseCurrency(formatted);
    setValue('hosting_cost', numericValue, { shouldValidate: true });
  };

  const handleDomainCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatCurrencyInput(inputValue);
    setDomainCostDisplay(formatted);
    
    const numericValue = parseCurrency(formatted);
    setValue('domain_cost', numericValue, { shouldValidate: true });
  };

  const handleOtherCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatCurrencyInput(inputValue);
    setOtherCostDisplay(formatted);
    
    const numericValue = parseCurrency(formatted);
    setValue('other_cost', numericValue, { shouldValidate: true });
  };

  const onSubmit = async (data: PaymentFormData) => {
    console.log('💾 PaymentForm - Submitting payment:', {
      formData: data,
      totalAmount,
      displays: {
        amountDisplay,
        hostingCostDisplay,
        domainCostDisplay,
        otherCostDisplay,
      },
    });
    
    try {
      await createPayment.mutateAsync(data);
      reset();
      setAmountDisplay('');
      setHostingCostDisplay('');
      setDomainCostDisplay('');
      setOtherCostDisplay('');
      onClose();
    } catch (error) {
      // Error already handled by mutation hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Añade un nuevo pago al sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={watch('type') || 'income'}
              onValueChange={(value) => setValue('type', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">💰 Ingreso</SelectItem>
                <SelectItem value="expense">💸 Egreso</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Monto Base *</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0"
                value={amountDisplay}
                onChange={handleAmountChange}
              />
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="payment_date">Fecha *</Label>
              <Input id="payment_date" type="date" {...register('payment_date')} />
            </div>
          </div>

          {/* Nueva sección de costos adicionales */}
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Costos Adicionales (Opcionales)</h3>
              {(hostingCost > 0 || domainCost > 0 || otherCost > 0) && (
                <span className="text-xs text-muted-foreground">
                  Total: ${formatCurrency(totalAmount)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="hosting_cost" className="text-sm">Hosting</Label>
                <Input
                  id="hosting_cost"
                  type="text"
                  placeholder="0"
                  value={hostingCostDisplay}
                  onChange={handleHostingCostChange}
                />
                {errors.hosting_cost && (
                  <p className="text-sm text-red-600 mt-1">{errors.hosting_cost.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="domain_cost" className="text-sm">Dominio</Label>
                <Input
                  id="domain_cost"
                  type="text"
                  placeholder="0"
                  value={domainCostDisplay}
                  onChange={handleDomainCostChange}
                />
                {errors.domain_cost && (
                  <p className="text-sm text-red-600 mt-1">{errors.domain_cost.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="other_cost" className="text-sm">Otro</Label>
                <Input
                  id="other_cost"
                  type="text"
                  placeholder="0"
                  value={otherCostDisplay}
                  onChange={handleOtherCostChange}
                />
                {errors.other_cost && (
                  <p className="text-sm text-red-600 mt-1">{errors.other_cost.message}</p>
                )}
              </div>
            </div>

            {otherCost > 0 && (
              <div>
                <Label htmlFor="other_cost_description" className="text-sm">Descripción del otro costo</Label>
                <Input
                  id="other_cost_description"
                  {...register('other_cost_description')}
                  placeholder="Ej: Certificado SSL, Licencia de software, etc."
                />
              </div>
            )}
          </div>

          {/* Mostrar el total si hay costos adicionales */}
          {(hostingCost > 0 || domainCost > 0 || otherCost > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total del Pago:</span>
                <span className="font-bold text-lg">${formatCurrency(totalAmount)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <div className="flex justify-between">
                  <span>Monto base:</span>
                  <span>${formatCurrency(amount)}</span>
                </div>
                {hostingCost > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>- Hosting:</span>
                    <span>-${formatCurrency(hostingCost)}</span>
                  </div>
                )}
                {domainCost > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>- Dominio:</span>
                    <span>-${formatCurrency(domainCost)}</span>
                  </div>
                )}
                {otherCost > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>- Otro descuento:</span>
                    <span>-${formatCurrency(otherCost)}</span>
                  </div>
                )}
                <div className="border-t border-orange-300 mt-1 pt-1 flex justify-between font-medium">
                  <span>Total Final:</span>
                  <span>${formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              value={watch('status') || 'pending'}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment_method">Método de Pago</Label>
            <Select
              value={watch('payment_method') || ''}
              onValueChange={(value) => setValue('payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método de pago" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods && paymentMethods.filter(method => method.is_active).length > 0 ? (
                  paymentMethods
                    .filter(method => method.is_active)
                    .map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        {method.name}
                      </SelectItem>
                    ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No hay métodos de pago configurados
                  </div>
                )}
              </SelectContent>
            </Select>
            {paymentMethods && paymentMethods.filter(method => method.is_active).length === 0 && (
              <p className="text-sm text-amber-600 mt-1">
                💡 Crea métodos de pago en la pestaña "Métodos de Pago"
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="reference">Referencia</Label>
            <Input
              id="reference"
              {...register('reference')}
              placeholder="Número de factura, referencia bancaria, etc."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notas adicionales"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createPayment.isPending}
            >
              {createPayment.isPending ? 'Guardando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}