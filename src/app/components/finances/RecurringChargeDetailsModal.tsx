import { RecurringCharge } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { Calendar, DollarSign, FileText, Tag, Clock, AlertCircle, Repeat } from 'lucide-react';

interface RecurringChargeDetailsModalProps {
  charge: RecurringCharge | null;
  open: boolean;
  onClose: () => void;
}

const periodLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
  custom: 'Personalizado',
};

const typeLabels = {
  income: '💰 Ingreso',
  expense: '💸 Egreso',
};

export function RecurringChargeDetailsModal({ charge, open, onClose }: RecurringChargeDetailsModalProps) {
  if (!charge) return null;

  const isIncome = charge.type === 'income' || !charge.type;
  const isActive = charge.is_active;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Detalles del Cobro Recurrente
          </DialogTitle>
          <DialogDescription>
            Aquí puedes ver los detalles del cobro recurrente seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipo y Estado */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4" />
                Tipo
              </label>
              <Badge className={isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {typeLabels[charge.type || 'income']}
              </Badge>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                Estado
              </label>
              <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" />
              Descripción
            </label>
            <p className="text-lg font-medium">{charge.description}</p>
          </div>

          {/* Monto */}
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4" />
              Monto
            </label>
            <p className={`text-3xl font-bold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(charge.amount)}
            </p>
          </div>

          {/* Proyecto */}
          {charge.project && (
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Proyecto
              </label>
              <p className="text-lg">{charge.project.name}</p>
            </div>
          )}

          {/* Periodo */}
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
              <Repeat className="h-4 w-4" />
              Periodo de Recurrencia
            </label>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">
                {periodLabels[charge.period]}
              </Badge>
              {charge.period === 'custom' && charge.custom_period_days && (
                <span className="text-sm text-gray-600">
                  (cada {charge.custom_period_days} días)
                </span>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Fecha de Inicio
              </label>
              <p className="text-lg">
                {format(new Date(charge.start_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Próximo Vencimiento
              </label>
              <p className="text-lg font-medium text-orange-600">
                {format(new Date(charge.next_due_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          </div>

          {/* Fecha de Fin (si existe) */}
          {charge.end_date && (
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Fecha de Finalización
              </label>
              <p className="text-lg">
                {format(new Date(charge.end_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          )}

          {/* Notas */}
          {charge.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Notas
              </label>
              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                {charge.notes}
              </p>
            </div>
          )}

          {/* Fechas de Creación y Actualización */}
          <div className="pt-4 border-t">
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Información del Sistema
            </label>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Creado:</span>{' '}
                {format(new Date(charge.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
              {charge.updated_at && (
                <div>
                  <span className="font-medium">Actualizado:</span>{' '}
                  {format(new Date(charge.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}