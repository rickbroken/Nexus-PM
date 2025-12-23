import { usePayments } from '@/hooks/useFinances';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, DollarSign, Scale } from 'lucide-react';
import { formatCurrencyWithSymbol } from '@/lib/formatters';
import { Payment } from '@/lib/supabase';

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

export function FinancialSummary() {
  const { data: payments } = usePayments();

  // Filtrar solo pagos activos (no cancelados) y completados/pagados
  const activePayments = payments?.filter(p => p.status !== 'cancelled') || [];
  
  // Solo incluir pagos completados para los cálculos financieros
  const paidPayments = activePayments.filter(p => p.status === 'paid');

  // Calcular ingresos de pagos pagados
  const paymentsIncome = paidPayments
    .filter(p => p.type === 'income' || !p.type) // Por defecto es income si no tiene type
    .reduce((sum, p) => sum + calculatePaymentTotal(p), 0);

  // Calcular egresos de pagos pagados
  const paymentsExpense = paidPayments
    .filter(p => p.type === 'expense')
    .reduce((sum, p) => sum + calculatePaymentTotal(p), 0);

  // Totales generales (solo pagos completados)
  const totalIncome = paymentsIncome;
  const totalExpense = paymentsExpense;
  const netBalance = totalIncome - totalExpense;
  const totalTransactions = activePayments.length;

  const stats = [
    {
      title: 'Total Ingresos',
      value: formatCurrencyWithSymbol(totalIncome),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      subtitle: `${paidPayments.filter(p => p.type === 'income' || !p.type).length} pagos completados`,
    },
    {
      title: 'Total Egresos',
      value: formatCurrencyWithSymbol(totalExpense),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      subtitle: `${paidPayments.filter(p => p.type === 'expense').length} pagos completados`,
    },
    {
      title: 'Balance Neto',
      value: formatCurrencyWithSymbol(netBalance),
      icon: Scale,
      color: netBalance >= 0 ? 'text-blue-600' : 'text-red-600',
      bgColor: netBalance >= 0 ? 'bg-blue-50' : 'bg-red-50',
      iconColor: netBalance >= 0 ? 'text-blue-600' : 'text-red-600',
      subtitle: netBalance >= 0 ? '✓ Balance positivo' : '⚠ Balance negativo',
    },
    {
      title: 'Total Pagos',
      value: totalTransactions.toString(),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      subtitle: `${activePayments.filter(p => p.status === 'paid').length} completados | ${activePayments.filter(p => p.status === 'pending').length} pendientes`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`${stat.bgColor} p-2 rounded-full`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}