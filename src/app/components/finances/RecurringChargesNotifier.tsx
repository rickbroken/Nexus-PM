import { useEffect, useRef } from 'react';
import { useRecurringChargesDueSoon } from '@/hooks/useFinances';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Componente invisible que monitorea cobros recurrentes por vencer
 * y crea notificaciones automáticas para usuarios admin y advisor
 */
export function RecurringChargesNotifier() {
  const { data: chargesDueSoon = [], isLoading } = useRecurringChargesDueSoon();
  const { user } = useAuthStore();
  const processedChargesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Solo procesar si hay cobros y el usuario es admin o advisor
    if (isLoading || !user || !['admin', 'advisor'].includes(user.role)) {
      return;
    }

    // Procesar cada cobro por vencer
    chargesDueSoon.forEach(async (charge) => {
      // Verificar si ya procesamos este cobro para evitar notificaciones duplicadas
      const chargeKey = `${charge.id}-${charge.next_due_date}`;
      
      if (processedChargesRef.current.has(chargeKey)) {
        return;
      }

      const isIncome = charge.type === 'income' || !charge.type; // Tratar sin tipo como 'income'
      const notificationType = isIncome ? 'recurring_charge_due_soon' : 'recurring_expense_due_soon';

      // Verificar si ya existe una notificación para este cobro y fecha
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', notificationType)
        .eq('entity_id', charge.id)
        .like('message', `%${format(new Date(charge.next_due_date), 'dd/MM/yyyy')}%`)
        .limit(1);

      // Si ya existe una notificación, marcar como procesado y continuar
      if (existingNotifications && existingNotifications.length > 0) {
        processedChargesRef.current.add(chargeKey);
        return;
      }

      // Calcular días hasta el vencimiento
      const daysUntilDue = differenceInDays(
        new Date(charge.next_due_date),
        new Date()
      );

      // Crear mensaje dinámico según días restantes
      let timeMessage = '';
      if (daysUntilDue === 0) {
        timeMessage = 'vence hoy';
      } else if (daysUntilDue === 1) {
        timeMessage = 'vence mañana';
      } else {
        timeMessage = `vence en ${daysUntilDue} días`;
      }

      const projectName = charge.project?.name || 'Sin proyecto';
      
      // Tipo de notificación e icono según el tipo de cobro
      const icon = isIncome ? '💳' : '💸';
      const titlePrefix = isIncome ? 'Cobro Recurrente' : 'Pago Recurrente';

      // Crear la notificación
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: notificationType,
          title: `${icon} ${titlePrefix} por Vencer`,
          message: `${charge.description} de $${formatCurrency(charge.amount)} (${projectName}) ${timeMessage} - ${format(new Date(charge.next_due_date), 'dd/MM/yyyy', { locale: es })}`,
          entity_type: 'recurring_charge',
          entity_id: charge.id,
          action_url: '/finances',
          is_read: false,
        });

      if (!error) {
        // Marcar como procesado
        processedChargesRef.current.add(chargeKey);
        console.log(`[RecurringChargesNotifier] Notificación creada para cobro: ${charge.description}`);
      } else {
        console.error('[RecurringChargesNotifier] Error al crear notificación:', error);
      }
    });

    // Limpiar cobros procesados que ya no están en la lista (vencieron o fueron desactivados)
    const currentChargeKeys = new Set(
      chargesDueSoon.map(c => `${c.id}-${c.next_due_date}`)
    );
    
    processedChargesRef.current.forEach(key => {
      if (!currentChargeKeys.has(key)) {
        processedChargesRef.current.delete(key);
      }
    });

  }, [chargesDueSoon, user, isLoading]);

  // Componente invisible
  return null;
}