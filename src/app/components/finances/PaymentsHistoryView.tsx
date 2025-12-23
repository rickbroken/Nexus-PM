import { usePayments } from '@/hooks/useFinances';
import { useProjects } from '@/hooks/useProjects';
import { Payment, PaymentType } from '@/lib/supabase';
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

const typeLabels: Record<PaymentType, string> = {
  income: '💰 Ingreso',
  expense: '💸 Egreso',
};

// Función para calcular el total del pago (monto - costos adicionales)
const calculatePaymentTotal = (payment: Payment): number => {
  const hostingCost = payment.hosting_cost || 0;
  const domainCost = payment.domain_cost || 0;
  const otherCost = payment.other_cost || 0;
  
  // Para ingresos, restamos los costos. Para egresos, el monto es el total
  if (payment.type === 'income' || !payment.type) {
    return payment.amount - hostingCost - domainCost - otherCost;
  }
  return payment.amount;
};

export function PaymentsHistoryView() {
  const { data: payments, isLoading } = usePayments();
  const { data: projects } = useProjects();

  // Función helper para obtener el nombre del proyecto
  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return '-';
    const project = projects?.find(p => p.id === projectId);
    return project?.name || 'Sin proyecto';
  };

  // Función para extraer el motivo de anulación desde notes
  const extractCancellationReason = (notes: string | null | undefined): string => {
    if (!notes) return 'No se especificó un motivo';
    
    // Buscar el patrón [ANULADO] en las notas
    const match = notes.match(/\[ANULADO\]\s*(.+?)(?:\n|$)/);
    return match ? match[1].trim() : 'No se especificó un motivo';
  };

  // Función para extraer las notas sin el motivo de anulación
  const extractNotes = (notes: string | null | undefined): string => {
    if (!notes) return '-';
    
    // Remover el patrón [ANULADO] y su contenido
    const notesWithoutCancel = notes.replace(/\[ANULADO\].+?(\n\n?)?/g, '').trim();
    return notesWithoutCancel || '-';
  };

  const handleViewDetails = (payment: Payment) => {
    const reason = extractCancellationReason(payment.notes);
    const isIncome = payment.type === 'income' || !payment.type;
    const totalPayment = calculatePaymentTotal(payment);
    
    Swal.fire({
      title: 'Detalles del pago anulado',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Tipo:</strong> ${typeLabels[payment.type || 'income']}</p>
          <p class="mb-2"><strong>Proyecto:</strong> ${getProjectName(payment.project_id)}</p>
          <p class="mb-2"><strong>Total del Pago:</strong> ${isIncome ? '+' : '-'}${formatCurrency(totalPayment)}</p>
          <p class="mb-2"><strong>Fecha de pago:</strong> ${format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es })}</p>
          <p class="mb-2"><strong>Método de pago:</strong> ${payment.payment_method || '-'}</p>
          <p class="mb-2"><strong>Referencia:</strong> ${payment.reference || '-'}</p>
          ${payment.notes && !payment.notes.includes('[ANULADO]') ? `<p class="mb-2"><strong>Notas:</strong> ${extractNotes(payment.notes)}</p>` : ''}
          <hr class="my-3" />
          <p class="text-sm text-gray-600"><strong>Motivo de anulación:</strong></p>
          <p class="text-sm italic">${reason}</p>
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

  // Filtrar solo los pagos cancelados
  const cancelledPayments = payments?.filter(p => p.status === 'cancelled') || [];

  if (cancelledPayments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 border rounded-lg">
        No hay pagos anulados en el historial
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Proyecto</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Observaciones</TableHead>
            <TableHead>Motivo de Anulación</TableHead>
            <TableHead className="text-right">Ver Detalles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cancelledPayments.map((payment) => {
            const isIncome = payment.type === 'income' || !payment.type;
            const totalPayment = calculatePaymentTotal(payment);
            
            return (
              <TableRow key={payment.id}>
                <TableCell>
                  <Badge className={isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {typeLabels[payment.type || 'income']}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es })}
                </TableCell>
                <TableCell>{getProjectName(payment.project_id)}</TableCell>
                <TableCell className={`font-medium ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(totalPayment)}
                </TableCell>
                <TableCell>{payment.payment_method || '-'}</TableCell>
                <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                  {extractNotes(payment.notes)}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate text-sm text-gray-600">
                    {extractCancellationReason(payment.notes)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(payment)}
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