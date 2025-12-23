import { Payment } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { Calendar, DollarSign, FileText, Tag, CreditCard, Hash, Clock, AlertCircle } from 'lucide-react';

interface PaymentDetailsModalProps {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
  projectName?: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  pending: 'Pendiente',
  paid: 'Pagado',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

const typeLabels = {
  income: '💰 Ingreso',
  expense: '💸 Egreso',
};

export function PaymentDetailsModal({ payment, open, onClose, projectName }: PaymentDetailsModalProps) {
  if (!payment) return null;

  const isIncome = payment.type === 'income' || !payment.type;
  const isCancelled = payment.status === 'cancelled';
  
  // Extraer motivo de anulación si existe
  const cancelReason = payment.notes?.match(/\[ANULADO\] (.+?)(?:\n|$)/)?.[1] || null;
  const notesWithoutCancel = payment.notes?.replace(/\[ANULADO\] .+?(?:\n\n?)?/g, '').trim() || null;

  // Calcular costos adicionales y total
  const hostingCost = payment.hosting_cost || 0;
  const domainCost = payment.domain_cost || 0;
  const otherCost = payment.other_cost || 0;
  const totalCosts = hostingCost + domainCost + otherCost;
  const hasAdditionalCosts = totalCosts > 0;
  const totalPayment = isIncome ? payment.amount - totalCosts : payment.amount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Detalles del Pago
          </DialogTitle>
          <DialogDescription>
            Información detallada sobre el pago realizado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo y Estado */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tipo
              </label>
              <Badge className={isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {typeLabels[payment.type || 'income']}
              </Badge>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Estado
              </label>
              <Badge className={statusColors[payment.status]}>
                {statusLabels[payment.status]}
              </Badge>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {hasAdditionalCosts ? 'Monto Base' : 'Monto'}
            </label>
            <p className={`text-2xl font-bold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(payment.amount)}
            </p>
          </div>

          {/* Fecha de Pago */}
          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Fecha de Pago
            </label>
            <p className="text-sm">
              {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>

          {/* Proyecto */}
          {projectName && (
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5" />
                Proyecto
              </label>
              <p className="text-sm">{projectName}</p>
            </div>
          )}

          {/* Método de Pago */}
          {payment.payment_method && (
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Método de Pago
              </label>
              <p className="text-sm">{payment.payment_method}</p>
            </div>
          )}

          {/* Referencia */}
          {payment.reference && (
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <Hash className="h-3.5 w-3.5" />
                Referencia
              </label>
              <p className="text-sm font-mono">{payment.reference}</p>
            </div>
          )}

          {/* Motivo de Anulación */}
          {isCancelled && cancelReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <label className="text-xs font-medium text-red-700 flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Motivo de Anulación
              </label>
              <p className="text-sm text-red-800">{cancelReason}</p>
            </div>
          )}

          {/* Notas */}
          {notesWithoutCancel && (
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5" />
                Notas
              </label>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2.5 rounded border">
                {notesWithoutCancel}
              </p>
            </div>
          )}

          {/* Fechas de Creación y Actualización */}
          <div className="pt-3 border-t">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
              <Clock className="h-3.5 w-3.5" />
              Información del Sistema
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div>
                <span className="font-medium">Creado:</span>{' '}
                {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
              {payment.updated_at && (
                <div>
                  <span className="font-medium">Actualizado:</span>{' '}
                  {format(new Date(payment.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
              )}
            </div>
          </div>

          {/* Costos Adicionales */}
          {hasAdditionalCosts && (
            <div className="pt-3 border-t">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
                <DollarSign className="h-3.5 w-3.5" />
                Costos Adicionales
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Costo de Hosting:</span>{' '}
                  {formatCurrency(hostingCost)}
                </div>
                <div>
                  <span className="font-medium">Costo de Dominio:</span>{' '}
                  {formatCurrency(domainCost)}
                </div>
                <div>
                  <span className="font-medium">Otros Costos:</span>{' '}
                  {formatCurrency(otherCost)}
                </div>
                <div>
                  <span className="font-medium">Total de Costos:</span>{' '}
                  {formatCurrency(totalCosts)}
                </div>
              </div>
            </div>
          )}

          {/* Total del Pago */}
          {hasAdditionalCosts && (
            <div className="pt-3 border-t">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Total del Pago
              </label>
              <p className={`text-2xl font-bold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
                {isIncome ? '+' : '-'}{formatCurrency(totalPayment)}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}