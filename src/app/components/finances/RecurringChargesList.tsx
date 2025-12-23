import { RecurringChargeForm } from './RecurringChargeForm';
import { RecurringChargesHistoryView } from './RecurringChargesHistoryView';
import { RecurringChargeDetailsModal } from './RecurringChargeDetailsModal';
import { LoadingSpinner } from '../ui/loading-spinner';
import { formatCurrency } from '@/lib/formatters';
import { Pagination } from '../ui/pagination';
import { useRecurringCharges, useDeleteRecurringCharge } from '@/hooks/useFinances';
import { RecurringCharge, RecurringChargeType } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Plus, AlertCircle, History, ArrowLeft, Ban } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';

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

export function RecurringChargesList() {
  const { data: charges, isLoading } = useRecurringCharges();
  const deleteCharge = useDeleteRecurringCharge();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<RecurringCharge | null>(null);
  const [filterType, setFilterType] = useState<'all' | RecurringChargeType>('all');
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [chargeForDetails, setChargeForDetails] = useState<RecurringCharge | null>(null);

  // Función para cambiar items por página y resetear a página 1
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Función para abrir el modal de detalles
  const handleRowClick = (charge: RecurringCharge) => {
    setChargeForDetails(charge);
    setDetailsModalOpen(true);
  };

  // Función para cerrar el modal de detalles
  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setChargeForDetails(null);
  };

  // Resetear página cuando cambie el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  // Función para determinar si un cobro está por vencer (próximos 7 días)
  const isDueSoon = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    return days >= 0 && days <= 7;
  };

  // Función para obtener el mensaje de días restantes
  const getDaysUntilDue = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    if (days < 0) return 'Vencido';
    return `${days} días`;
  };

  const handleEdit = (charge: RecurringCharge) => {
    setSelectedCharge(charge);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedCharge(null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setSelectedCharge(null);
  };

  const handleDelete = async (charge: RecurringCharge) => {
    const typeLabel = charge.type === 'expense' ? 'Pago recurrente' : 'Cobro recurrente';
    
    const result = await Swal.fire({
      title: `¿Anular ${typeLabel.toLowerCase()}?`,
      html: `
        <div class="text-left mb-4">
          <p class="mb-2"><strong>Descripción:</strong> ${charge.description}</p>
          <p class="mb-2"><strong>Proyecto:</strong> ${charge.project?.name || 'N/A'}</p>
          <p class="mb-2"><strong>Monto:</strong> ${formatCurrency(charge.amount)}</p>
          <p class="mb-2"><strong>Periodo:</strong> ${periodLabels[charge.period]}</p>
        </div>
        <div class="text-left">
          <label for="cancel-reason" class="block text-sm font-medium text-gray-700 mb-2">
            Motivo de anulación *
          </label>
          <textarea 
            id="cancel-reason" 
            class="swal2-textarea w-full p-2 border rounded" 
            placeholder="Describe el motivo de la anulación..."
            rows="3"
          ></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const reason = (document.getElementById('cancel-reason') as HTMLTextAreaElement)?.value;
        if (!reason || reason.trim() === '') {
          Swal.showValidationMessage('El motivo de anulación es obligatorio');
          return false;
        }
        return reason;
      },
    });

    if (result.isConfirmed && result.value) {
      deleteCharge.mutate({ id: charge.id, reason: result.value });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Filtrar cobros según el tipo seleccionado
  const filteredCharges = charges?.filter(charge => {
    if (filterType === 'all') return true;
    // Tratar cobros sin tipo como 'income' para compatibilidad
    const chargeType = charge.type || 'income';
    return chargeType === filterType;
  });

  // Calcular totales
  const activeIncomeCharges = charges?.filter(c => c.is_active && (c.type === 'income' || !c.type)) || [];
  const activeExpenseCharges = charges?.filter(c => c.is_active && c.type === 'expense') || [];
  const totalIncome = activeIncomeCharges.reduce((sum, c) => sum + c.amount, 0);
  const totalExpense = activeExpenseCharges.reduce((sum, c) => sum + c.amount, 0);
  const netFlow = totalIncome - totalExpense;

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
              <h2 className="text-xl font-semibold">Historial de Cobros Anulados</h2>
            </div>
          </div>
          <RecurringChargesHistoryView />
        </>
      ) : (
        <>
          {/* Banner de alertas y resumen financiero */}
          <div className="flex flex-col gap-4">
            {/* Alerta de cobros por vencer */}
            {charges && charges.filter(c => c.is_active && isDueSoon(c.next_due_date)).length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-orange-800">
                  <strong>{charges.filter(c => c.is_active && isDueSoon(c.next_due_date)).length}</strong> cobro
                  {charges.filter(c => c.is_active && isDueSoon(c.next_due_date)).length !== 1 ? 's' : ''} por vencer 
                  en los próximos 7 días
                </span>
              </div>
            )}

            {/* Resumen Financiero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 mb-1">💰 Ingresos Recurrentes</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                <p className="text-xs text-gray-500">{activeIncomeCharges.length} activos</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">💸 Egresos Recurrentes</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                <p className="text-xs text-gray-500">{activeExpenseCharges.length} activos</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">📈 Flujo Neto</p>
                <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(netFlow)}
                </p>
                <p className="text-xs text-gray-500">
                  {totalIncome > 0 ? `${((netFlow / totalIncome) * 100).toFixed(1)}% margen` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Filtros y botón de crear */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex gap-2">
              <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="w-auto">
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="income">💰 Ingresos</TabsTrigger>
                  <TabsTrigger value="expense">💸 Egresos</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button 
                variant="outline" 
                onClick={() => setViewMode('history')}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Historial
              </Button>
            </div>
            
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cobro Recurrente
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Próximo Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCharges?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((charge) => {
                  const dueSoon = charge.is_active && isDueSoon(charge.next_due_date);
                  // Tratar cobros sin tipo como 'income' para compatibilidad
                  const isIncome = charge.type === 'income' || !charge.type;
                  
                  return (
                    <TableRow 
                      key={charge.id}
                      className={`cursor-pointer hover:bg-gray-50 ${dueSoon ? 'bg-orange-50/50' : ''}`}
                      onClick={() => handleRowClick(charge)}
                    >
                      <TableCell>
                        <Badge className={isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {typeLabels[charge.type || 'income']}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {dueSoon && (
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                          )}
                          {charge.description}
                        </div>
                      </TableCell>
                      <TableCell>{charge.project?.name || '-'}</TableCell>
                      <TableCell className={`font-medium ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(charge.amount)}
                      </TableCell>
                      <TableCell>{periodLabels[charge.period]}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span>{format(new Date(charge.next_due_date), 'dd MMM yyyy', { locale: es })}</span>
                          {charge.is_active && dueSoon && (
                            <Badge className="w-fit bg-orange-100 text-orange-800 text-xs">
                              {getDaysUntilDue(charge.next_due_date)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            charge.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {charge.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(charge);
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Anular cobro recurrente"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredCharges?.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No hay cobros recurrentes registrados
              </div>
            )}
          </div>

          {/* Paginación */}
          {filteredCharges && filteredCharges.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredCharges.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredCharges.length}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </>
      )}

      <RecurringChargeForm
        open={formOpen}
        onClose={handleClose}
        charge={selectedCharge}
      />

      <RecurringChargeDetailsModal
        open={detailsModalOpen}
        onClose={handleCloseDetails}
        charge={chargeForDetails}
      />
    </div>
  );
}