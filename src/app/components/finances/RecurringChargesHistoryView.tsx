import { 
  useCancelledRecurringCharges
} from '@/hooks/useFinances';
import { RecurringCharge, RecurringChargeType } from '@/lib/supabase';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import { LoadingSpinner } from '../ui/loading-spinner';
import { formatCurrency } from '@/lib/formatters';

const periodLabels: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
  custom: 'Personalizado',
};

const typeLabels: Record<RecurringChargeType, string> = {
  income: '💰 Ingreso',
  expense: '💸 Egreso',
};

export function RecurringChargesHistoryView() {
  const { data: cancelledCharges, isLoading } = useCancelledRecurringCharges();

  const handleViewDetails = (charge: RecurringCharge) => {
    Swal.fire({
      title: 'Detalles del cobro anulado',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Tipo:</strong> ${typeLabels[charge.type || 'income']}</p>
          <p class="mb-2"><strong>Descripción:</strong> ${charge.description}</p>
          <p class="mb-2"><strong>Proyecto:</strong> ${charge.project?.name || 'N/A'}</p>
          <p class="mb-2"><strong>Monto:</strong> ${formatCurrency(charge.amount)}</p>
          <p class="mb-2"><strong>Periodo:</strong> ${periodLabels[charge.period]}</p>
          ${charge.custom_days ? `<p class="mb-2"><strong>Días personalizados:</strong> ${charge.custom_days}</p>` : ''}
          <p class="mb-2"><strong>Fecha de inicio:</strong> ${format(new Date(charge.start_date), 'dd MMM yyyy', { locale: es })}</p>
          <p class="mb-2"><strong>Próximo vencimiento:</strong> ${format(new Date(charge.next_due_date), 'dd MMM yyyy', { locale: es })}</p>
          <p class="mb-2"><strong>Fecha de anulación:</strong> ${format(new Date(charge.cancelled_at!), "dd MMM yyyy 'a las' HH:mm", { locale: es })}</p>
          <hr class="my-3" />
          <p class="text-sm text-gray-600"><strong>Motivo de anulación:</strong></p>
          <p class="text-sm italic">${charge.cancelled_reason || 'N/A'}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!cancelledCharges || cancelledCharges.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 border rounded-lg">
        No hay cobros recurrentes anulados en el historial
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Proyecto</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Periodo</TableHead>
            <TableHead>Fecha Anulación</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Ver Detalles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cancelledCharges.map((charge) => {
            const isIncome = charge.type === 'income' || !charge.type;
            
            return (
              <TableRow key={charge.id}>
                <TableCell>
                  <Badge className={isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {typeLabels[charge.type || 'income']}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{charge.description}</TableCell>
                <TableCell>{charge.project?.name || '-'}</TableCell>
                <TableCell className={`font-medium ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(charge.amount)}
                </TableCell>
                <TableCell>{periodLabels[charge.period]}</TableCell>
                <TableCell>
                  {charge.cancelled_at && format(new Date(charge.cancelled_at), 'dd MMM yyyy', { locale: es })}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate text-sm text-gray-600">
                    {charge.cancelled_reason || 'Sin motivo especificado'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(charge)}
                    title="Ver detalles"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}