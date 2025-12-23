import { Payment } from '@/lib/supabase';
import { useDeletedPayments, useRestorePayment, usePermanentDeletePayment } from '@/hooks/useFinances';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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
import { RotateCcw, Trash2, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import { formatCurrency } from '@/lib/formatters';

interface PaymentsHistoryModalProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
}

export function PaymentsHistoryModal({ open, onClose, projectId }: PaymentsHistoryModalProps) {
  const { data: deletedPayments, isLoading } = useDeletedPayments(projectId);
  const restorePayment = useRestorePayment();
  const permanentDeletePayment = usePermanentDeletePayment();

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const statusLabels = {
    pending: 'Pendiente',
    paid: 'Pagado',
    overdue: 'Vencido',
    cancelled: 'Cancelado',
  };

  const handleRestore = async (payment: Payment) => {
    const result = await Swal.fire({
      title: '¿Restaurar este pago?',
      html: `
        <div class="text-left">
          <p><strong>Monto:</strong> $${formatCurrency(payment.amount)}</p>
          <p><strong>Fecha:</strong> ${format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: es })}</p>
          ${payment.deleted_reason ? `
            <div class="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
              <p class="text-xs font-semibold text-gray-600 mb-1">Motivo de eliminación:</p>
              <p class="text-sm text-gray-700">${payment.deleted_reason}</p>
            </div>
          ` : ''}
          <p class="text-sm text-gray-500 mt-3">El pago volverá a aparecer en la lista principal.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
    });

    if (result.isConfirmed) {
      restorePayment.mutate(payment.id);
    }
  };

  const handlePermanentDelete = async (payment: Payment) => {
    const result = await Swal.fire({
      title: '¿Eliminar permanentemente?',
      html: `
        <div class="text-left">
          <p><strong>Monto:</strong> $${formatCurrency(payment.amount)}</p>
          <p><strong>Fecha:</strong> ${format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: es })}</p>
          ${payment.deleted_reason ? `
            <div class="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
              <p class="text-xs font-semibold text-gray-600 mb-1">Motivo de eliminación:</p>
              <p class="text-sm text-gray-700">${payment.deleted_reason}</p>
            </div>
          ` : ''}
          <p class="text-sm text-red-600 mt-3 font-semibold">⚠️ Esta acción NO se puede deshacer.</p>
          <p class="text-sm text-gray-500">El pago será eliminado permanentemente de la base de datos.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar permanentemente',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    });

    if (result.isConfirmed) {
      permanentDeletePayment.mutate(payment.id);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-gray-600" />
            Historial de Pagos Eliminados
          </DialogTitle>
          <DialogDescription>
            Aquí puedes ver todos los pagos que han sido eliminados. Puedes restaurarlos o eliminarlos permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : deletedPayments && deletedPayments.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Motivo de Eliminación</TableHead>
                    <TableHead>Eliminado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedPayments.map((payment) => (
                    <TableRow key={payment.id} className="bg-red-50/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold">
                            ${formatCurrency(payment.amount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{formatDate(payment.payment_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[payment.status]}>
                          {statusLabels[payment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-700 line-clamp-2" title={payment.deleted_reason || ''}>
                            {payment.deleted_reason || '—'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-500">
                          {payment.deleted_at && formatDateTime(payment.deleted_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(payment)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Restaurar pago"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePermanentDelete(payment)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No hay pagos eliminados</p>
              <p className="text-sm text-gray-400 mt-1">
                Los pagos eliminados aparecerán aquí y podrás restaurarlos si lo necesitas
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}