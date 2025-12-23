import { useState } from 'react';
import { usePayments, useUpdatePayment } from '@/hooks/useFinances';
import { useProjects } from '@/hooks/useProjects';
import { Payment } from '@/lib/supabase';
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
import { Plus, XCircle, History, ArrowLeft, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import { PaymentForm } from './PaymentForm';
import { PaymentsHistoryView } from './PaymentsHistoryView';
import { PaymentDetailsModal } from './PaymentDetailsModal';
import { LoadingSpinner } from '../ui/loading-spinner';
import { formatCurrency } from '@/lib/formatters';
import { PaymentType } from '@/lib/supabase';
import { Pagination } from '../ui/pagination';

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

export function PaymentsList() {
  const { data: payments, isLoading } = usePayments();
  const { data: projects } = useProjects();
  const updatePayment = useUpdatePayment();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [paymentForDetails, setPaymentForDetails] = useState<Payment | null>(null);

  // Función para cambiar items por página y resetear a página 1
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Función para abrir el modal de detalles
  const handleRowClick = (payment: Payment) => {
    setPaymentForDetails(payment);
    setDetailsModalOpen(true);
  };

  // Función para cerrar el modal de detalles
  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setPaymentForDetails(null);
  };

  // Función helper para obtener el nombre del proyecto
  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return '-';
    const project = projects?.find(p => p.id === projectId);
    return project?.name || 'Sin proyecto';
  };

  const handleCreate = () => {
    setSelectedPayment(null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setSelectedPayment(null);
  };

  const handleCancel = async (payment: Payment) => {
    const result = await Swal.fire({
      title: '¿Anular este pago?',
      html: `
        <div class="text-left">
          <p class="mb-2">Este pago será marcado como <strong>Cancelado</strong>.</p>
          <p class="text-sm text-gray-600"><strong>Monto:</strong> $${formatCurrency(payment.amount)}</p>
          <p class="text-sm text-gray-600"><strong>Fecha:</strong> ${format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: es })}</p>
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Motivo de anulación *
            </label>
            <textarea 
              id="cancel-reason" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Ejemplo: Pago duplicado, error en el monto, etc."
            ></textarea>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, anular pago',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const reason = (document.getElementById('cancel-reason') as HTMLTextAreaElement)?.value;
        if (!reason || reason.trim().length === 0) {
          Swal.showValidationMessage('Debes ingresar un motivo para anular el pago');
          return false;
        }
        if (reason.trim().length < 10) {
          Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres');
          return false;
        }
        return reason.trim();
      }
    });

    if (result.isConfirmed && result.value) {
      await updatePayment.mutateAsync({ 
        id: payment.id, 
        status: 'cancelled',
        notes: payment.notes 
          ? `${payment.notes}\n\n[ANULADO] ${result.value}` 
          : `[ANULADO] ${result.value}`
      });
      
      Swal.fire({
        title: '¡Pago anulado!',
        text: 'El pago ha sido marcado como cancelado',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleMarkAsPaid = async (payment: Payment) => {
    const typeLabel = payment.type === 'expense' ? 'egreso' : 'ingreso';
    
    const result = await Swal.fire({
      title: `¿Marcar ${typeLabel} como pagado?`,
      html: `
        <div class="text-left">
          <p class="mb-2">Este pago será marcado como <strong>Pagado</strong>.</p>
          <p class="text-sm text-gray-600"><strong>Monto:</strong> ${formatCurrency(payment.amount)}</p>
          <p class="text-sm text-gray-600"><strong>Fecha:</strong> ${format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: es })}</p>
          <p class="text-sm text-gray-600"><strong>Proyecto:</strong> ${getProjectName(payment.project_id)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '✓ Marcar como pagado',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      await updatePayment.mutateAsync({ 
        id: payment.id, 
        status: 'paid'
      });
      
      Swal.fire({
        title: '¡Pago actualizado!',
        text: 'El pago ha sido marcado como pagado',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Filtrar solo los pagos activos (no cancelados)
  const activePayments = payments?.filter(p => p.status !== 'cancelled') || [];

  // Paginación
  const totalPages = Math.ceil(activePayments.length / itemsPerPage);
  const currentPayments = activePayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Mostrar vista de historial */}
      {viewMode === 'history' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setViewMode('active')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a Activos
              </Button>
              <h2 className="text-xl font-semibold">Historial de Pagos Anulados</h2>
            </div>
          </div>
          <PaymentsHistoryView />
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setViewMode('history')}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Historial
            </Button>
            
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Pago
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPayments.map((payment) => {
                  const isIncome = payment.type === 'income' || !payment.type;
                  const totalPayment = calculatePaymentTotal(payment);
                  
                  return (
                    <TableRow key={payment.id} onClick={() => handleRowClick(payment)} className="cursor-pointer hover:bg-gray-50">
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
                      <TableCell>
                        <Badge className={statusColors[payment.status]}>
                          {statusLabels[payment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.payment_method || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {payment.notes?.replace(/\[ANULADO\].+?(\n|$)/g, '').trim() || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {payment.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsPaid(payment);
                              }}
                              className="text-green-600 hover:text-green-700"
                              title="Marcar como pagado"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(payment);
                            }}
                            className="text-orange-600 hover:text-orange-700"
                            title="Anular pago"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {activePayments.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No hay pagos registrados
              </div>
            )}
          </div>

          {/* Paginación */}
          {activePayments.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={activePayments.length}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </>
      )}

      <PaymentForm open={formOpen} onClose={handleClose} payment={selectedPayment} />
      <PaymentDetailsModal 
        open={detailsModalOpen} 
        onClose={handleCloseDetails} 
        payment={paymentForDetails}
        projectName={paymentForDetails ? getProjectName(paymentForDetails.project_id) : undefined}
      />
    </div>
  );
}