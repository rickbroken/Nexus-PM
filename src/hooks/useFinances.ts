import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Payment, RecurringCharge, PaymentMethod } from '../lib/supabase';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useAuthStore } from '../stores/authStore';

const projectId = import.meta.env.VITE_SUPABASE_PROYECT_ID;
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/server`;

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || publicAnonKey}`,
  };
};

// Payments
export function usePayments(projectId?: string) {
  return useQuery({
    queryKey: ['payments', projectId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .is('deleted_at', null) // Solo mostrar pagos NO eliminados
        .order('payment_date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Payment[];
    },
    // Evitar queries colgadas
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPayment: Partial<Payment>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert([newPayment])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Pago registrado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo registrar el pago',
      });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Pago actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo actualizar el pago',
      });
    },
  });
}

// Recurring Charges
export function useRecurringCharges(projectId?: string) {
  return useQuery({
    queryKey: ['recurring-charges', projectId],
    queryFn: async () => {
      let query = supabase
        .from('recurring_charges')
        .select('*, project:projects(*)')
        .is('cancelled_at', null) // Solo mostrar cobros NO anulados
        .order('next_due_date', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RecurringCharge[];
    },
    // Evitar queries colgadas
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para obtener el historial de cobros recurrentes anulados
export function useCancelledRecurringCharges(projectId?: string) {
  return useQuery({
    queryKey: ['cancelled-recurring-charges', projectId],
    queryFn: async () => {
      let query = supabase
        .from('recurring_charges')
        .select('*, project:projects(*)')
        .not('cancelled_at', 'is', null) // Solo mostrar cobros anulados
        .order('cancelled_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RecurringCharge[];
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateRecurringCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCharge: Partial<RecurringCharge>) => {
      const { data, error } = await supabase
        .from('recurring_charges')
        .insert([newCharge])
        .select('*, project:projects(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-charges'] });
      const typeLabel = data.type === 'expense' ? 'Pago recurrente' : 'Cobro recurrente';
      toast.success(`${typeLabel} creado exitosamente`);
    },
    onError: (error: any) => {
      console.error('Error creating recurring charge:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo crear el cobro recurrente',
      });
    },
  });
}

export function useDeleteRecurringCharge() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('recurring_charges')
        .update({ 
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id || null,
          cancelled_reason: reason
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-charges'] });
      queryClient.invalidateQueries({ queryKey: ['cancelled-recurring-charges'] });
      toast.success('Cobro recurrente anulado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error cancelling recurring charge:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo anular el cobro recurrente',
      });
    },
  });
}

// Hook para marcar un cobro recurrente como pagado
export function useMarkRecurringChargeAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (charge: RecurringCharge) => {
      const today = new Date();
      let nextDueDate = new Date(charge.next_due_date);
      
      // Calcular la próxima fecha de vencimiento según el período
      switch (charge.period) {
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 3);
          break;
        case 'annual':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
        case 'custom':
          if (charge.custom_days) {
            nextDueDate.setDate(nextDueDate.getDate() + charge.custom_days);
          }
          break;
      }

      const { data, error } = await supabase
        .from('recurring_charges')
        .update({
          last_payment_date: today.toISOString(),
          next_due_date: nextDueDate.toISOString(),
        })
        .eq('id', charge.id)
        .select('*, project:projects(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-charges'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-charges-due-soon'] });
      const typeLabel = data.type === 'expense' ? 'Pago recurrente' : 'Cobro recurrente';
      toast.success(`${typeLabel} marcado como pagado exitosamente`);
    },
    onError: (error: any) => {
      console.error('Error marking recurring charge as paid:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo marcar el cobro como pagado',
      });
    },
  });
}

// Payment Methods
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SERVER_URL}/finance/payment-methods`, { headers });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch payment methods');
      }
      
      const { methods } = await response.json();
      return methods as PaymentMethod[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para detectar cobros recurrentes por vencer (próximos 7 días)
export function useRecurringChargesDueSoon() {
  return useQuery({
    queryKey: ['recurring-charges-due-soon'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_charges')
        .select('*, project:projects(*)')
        .eq('is_active', true)
        .order('next_due_date', { ascending: true });

      if (error) throw error;

      // Filtrar cobros que vencen en los próximos 7 días
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const dueSoon = (data as RecurringCharge[]).filter(charge => {
        const dueDate = new Date(charge.next_due_date);
        return dueDate >= today && dueDate <= sevenDaysFromNow;
      });

      return dueSoon;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: 5 * 60 * 1000, // Revalidar cada 5 minutos
  });
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newMethod: Partial<PaymentMethod>) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SERVER_URL}/finance/payment-methods`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newMethod),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment method');
      }
      
      const { method } = await response.json();
      return method;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating payment method:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo crear el método de pago',
      });
    },
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentMethod> & { id: string }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SERVER_URL}/finance/payment-methods/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update payment method');
      }
      
      const { method } = await response.json();
      return method;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating payment method:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo actualizar el método de pago',
      });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SERVER_URL}/finance/payment-methods/${id}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete payment method');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting payment method:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo eliminar el método de pago',
      });
    },
  });
}
