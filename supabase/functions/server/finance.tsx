import { Context } from "npm:hono";
import { supabaseAdmin, verifyUser, getUserProfile } from "./auth.tsx";
import * as kv from "./kv_store.tsx";

/**
 * Obtener resumen financiero general
 * GET /make-server-17d656ff/finance/summary
 */
export async function getFinancialSummary(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { profile } = await getUserProfile(user.id);
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'advisor')) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Total de ingresos (pagos recibidos con status 'paid')
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount, hosting_cost, domain_cost, other_cost')
      .eq('status', 'paid');

    const totalRevenue = payments?.reduce((sum, p) => {
      const amount = parseFloat(p.amount) || 0;
      const hosting = parseFloat(p.hosting_cost) || 0;
      const domain = parseFloat(p.domain_cost) || 0;
      const other = parseFloat(p.other_cost) || 0;
      return sum + amount - hosting - domain - other;
    }, 0) || 0;

    // Total pendiente (pagos con status 'pending')
    const { data: pendingPayments } = await supabaseAdmin
      .from('payments')
      .select('amount, hosting_cost, domain_cost, other_cost')
      .eq('status', 'pending');

    const totalPending = pendingPayments?.reduce((sum, p) => {
      const amount = parseFloat(p.amount) || 0;
      const hosting = parseFloat(p.hosting_cost) || 0;
      const domain = parseFloat(p.domain_cost) || 0;
      const other = parseFloat(p.other_cost) || 0;
      return sum + amount - hosting - domain - other;
    }, 0) || 0;

    // Pagos vencidos
    const { data: overduePayments } = await supabaseAdmin
      .from('payments')
      .select('amount, hosting_cost, domain_cost, other_cost')
      .eq('status', 'overdue');

    const totalOverdue = overduePayments?.reduce((sum, p) => {
      const amount = parseFloat(p.amount) || 0;
      const hosting = parseFloat(p.hosting_cost) || 0;
      const domain = parseFloat(p.domain_cost) || 0;
      const other = parseFloat(p.other_cost) || 0;
      return sum + amount - hosting - domain - other;
    }, 0) || 0;

    // Total de costos operativos
    const { data: costs } = await supabaseAdmin
      .from('project_costs')
      .select('amount');

    const totalCosts = costs?.reduce((sum, c) => sum + parseFloat(c.amount), 0) || 0;

    // Cobros recurrentes activos
    const { data: recurringCharges } = await supabaseAdmin
      .from('recurring_charges')
      .select('amount, period, next_due_date')
      .eq('is_active', true)
      .order('next_due_date', { ascending: true });

    // Calcular próximo cobro
    const nextRecurring = recurringCharges?.[0] || null;

    // Proyectos activos
    const { count: activeProjects } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    return c.json({
      summary: {
        totalRevenue,
        totalPending,
        totalOverdue,
        totalCosts,
        netProfit: totalRevenue - totalCosts,
        activeProjects: activeProjects || 0,
        nextRecurring,
      },
    });
  } catch (error) {
    console.error('Error in getFinancialSummary:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Obtener finanzas de un proyecto específico
 * GET /make-server-17d656ff/finance/project/:projectId
 */
export async function getProjectFinances(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const projectId = c.req.param('projectId');

    // Obtener información financiera del proyecto
    const { data: projectFinance } = await supabaseAdmin
      .from('project_finances')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // Pagos del proyecto
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('project_id', projectId)
      .order('payment_date', { ascending: false });

    // Costos del proyecto
    const { data: costs } = await supabaseAdmin
      .from('project_costs')
      .select('*')
      .eq('project_id', projectId)
      .order('cost_date', { ascending: false });

    // Cobros recurrentes del proyecto
    const { data: recurringCharges } = await supabaseAdmin
      .from('recurring_charges')
      .select('*')
      .eq('project_id', projectId)
      .order('next_due_date', { ascending: true });

    // Calcular totales
    const totalPaid = payments
      ?.filter(p => p.status === 'paid')
      .reduce((sum, p) => {
        const amount = parseFloat(p.amount) || 0;
        const hosting = parseFloat(p.hosting_cost) || 0;
        const domain = parseFloat(p.domain_cost) || 0;
        const other = parseFloat(p.other_cost) || 0;
        return sum + amount - hosting - domain - other;
      }, 0) || 0;

    const totalPending = payments
      ?.filter(p => p.status === 'pending')
      .reduce((sum, p) => {
        const amount = parseFloat(p.amount) || 0;
        const hosting = parseFloat(p.hosting_cost) || 0;
        const domain = parseFloat(p.domain_cost) || 0;
        const other = parseFloat(p.other_cost) || 0;
        return sum + amount - hosting - domain - other;
      }, 0) || 0;

    const totalCosts = costs?.reduce((sum, c) => sum + parseFloat(c.amount), 0) || 0;

    return c.json({
      finance: projectFinance,
      payments: payments || [],
      costs: costs || [],
      recurringCharges: recurringCharges || [],
      summary: {
        totalPaid,
        totalPending,
        totalCosts,
        profit: totalPaid - totalCosts,
        contractValue: projectFinance?.total_value || 0,
        remaining: (projectFinance?.total_value || 0) - totalPaid,
      },
    });
  } catch (error) {
    console.error('Error in getProjectFinances:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Marcar pago de cobro recurrente
 * POST /make-server-17d656ff/finance/recurring/:id/pay
 */
export async function markRecurringChargePaid(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { profile } = await getUserProfile(user.id);
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'advisor')) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const recurringId = c.req.param('id');
    const body = await c.req.json();
    const { payment_date } = body;

    if (!payment_date) {
      return c.json({ error: 'payment_date is required' }, 400);
    }

    // Obtener el cobro recurrente
    const { data: recurring } = await supabaseAdmin
      .from('recurring_charges')
      .select('*')
      .eq('id', recurringId)
      .single();

    if (!recurring) {
      return c.json({ error: 'Recurring charge not found' }, 404);
    }

    // Crear pago
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        project_id: recurring.project_id,
        amount: recurring.amount,
        payment_date,
        status: 'paid',
        payment_method: 'recurring',
        reference: `Cobro recurrente: ${recurring.description}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return c.json({ error: 'Failed to create payment' }, 500);
    }

    // Actualizar last_payment_date del cobro recurrente
    // El trigger automáticamente calculará el next_due_date
    const { data: updatedRecurring, error: updateError } = await supabaseAdmin
      .from('recurring_charges')
      .update({
        last_payment_date: payment_date,
      })
      .eq('id', recurringId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating recurring charge:', updateError);
      return c.json({ error: 'Failed to update recurring charge' }, 500);
    }

    return c.json({
      payment,
      recurring: updatedRecurring,
    });
  } catch (error) {
    console.error('Error in markRecurringChargePaid:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Obtener cobros recurrentes próximos a vencer
 * GET /make-server-17d656ff/finance/recurring/upcoming
 */
export async function getUpcomingRecurringCharges(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { profile } = await getUserProfile(user.id);
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'advisor')) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Obtener fecha de hoy + 30 días
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const { data: upcoming } = await supabaseAdmin
      .from('recurring_charges')
      .select(`
        *,
        projects (
          name,
          clients (
            name
          )
        )
      `)
      .eq('is_active', true)
      .lte('next_due_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .order('next_due_date', { ascending: true });

    return c.json({
      upcoming: upcoming || [],
    });
  } catch (error) {
    console.error('Error in getUpcomingRecurringCharges:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Obtener reportes financieros
 * GET /make-server-17d656ff/finance/reports
 */
export async function getFinancialReports(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { profile } = await getUserProfile(user.id);
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'advisor')) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    // Pagos por mes
    const { data: monthlyPayments } = await supabaseAdmin
      .from('payments')
      .select('amount, payment_date, status')
      .eq('status', 'paid')
      .gte('payment_date', startDate || '2024-01-01')
      .lte('payment_date', endDate || '2025-12-31')
      .order('payment_date');

    // Agrupar por mes
    const paymentsByMonth: Record<string, number> = {};
    monthlyPayments?.forEach(payment => {
      const month = payment.payment_date.substring(0, 7); // YYYY-MM
      paymentsByMonth[month] = (paymentsByMonth[month] || 0) + parseFloat(payment.amount);
    });

    // Costos por mes
    const { data: monthlyCosts } = await supabaseAdmin
      .from('project_costs')
      .select('amount, cost_date, category')
      .gte('cost_date', startDate || '2024-01-01')
      .lte('cost_date', endDate || '2025-12-31')
      .order('cost_date');

    const costsByMonth: Record<string, number> = {};
    const costsByCategory: Record<string, number> = {};
    
    monthlyCosts?.forEach(cost => {
      const month = cost.cost_date.substring(0, 7);
      costsByMonth[month] = (costsByMonth[month] || 0) + parseFloat(cost.amount);
      
      const category = cost.category || 'otros';
      costsByCategory[category] = (costsByCategory[category] || 0) + parseFloat(cost.amount);
    });

    // Ingresos por proyecto
    const { data: projectRevenues } = await supabaseAdmin
      .from('payments')
      .select(`
        amount,
        status,
        projects (
          id,
          name
        )
      `)
      .eq('status', 'paid')
      .gte('payment_date', startDate || '2024-01-01')
      .lte('payment_date', endDate || '2025-12-31');

    const revenueByProject: Record<string, { name: string; amount: number }> = {};
    projectRevenues?.forEach(payment => {
      const projectId = payment.projects?.id;
      const projectName = payment.projects?.name || 'Sin proyecto';
      
      if (projectId) {
        if (!revenueByProject[projectId]) {
          revenueByProject[projectId] = { name: projectName, amount: 0 };
        }
        revenueByProject[projectId].amount += parseFloat(payment.amount);
      }
    });

    return c.json({
      reports: {
        paymentsByMonth,
        costsByMonth,
        costsByCategory,
        revenueByProject: Object.entries(revenueByProject).map(([id, data]) => ({
          project_id: id,
          project_name: data.name,
          revenue: data.amount,
        })),
      },
    });
  } catch (error) {
    console.error('Error in getFinancialReports:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Obtener todos los métodos de pago
 * GET /make-server-17d656ff/finance/payment-methods
 */
export async function getPaymentMethods(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Obtener todos los métodos de pago del KV store
    const paymentMethods = await kv.getByPrefix('payment_method:');
    
    // Transformar y ordenar por fecha de creación
    const methods = paymentMethods
      .map((value: any, index: number) => ({
        id: value.id || crypto.randomUUID(),
        name: value.name,
        description: value.description,
        is_active: value.is_active,
        created_by: value.created_by,
        created_at: value.created_at,
        updated_at: value.updated_at,
      }))
      .sort((a: any, b: any) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    return c.json({ methods });
  } catch (error) {
    console.error('Error in getPaymentMethods:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Crear un nuevo método de pago
 * POST /make-server-17d656ff/finance/payment-methods
 */
export async function createPaymentMethod(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { profile } = await getUserProfile(user.id);
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'advisor')) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const { name, description, is_active } = body;

    if (!name) {
      return c.json({ error: 'name is required' }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const methodData = {
      id,
      name,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    };

    await kv.set(`payment_method:${id}`, methodData);

    return c.json({ method: methodData });
  } catch (error) {
    console.error('Error in createPaymentMethod:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Actualizar un método de pago
 * PUT /make-server-17d656ff/finance/payment-methods/:id
 */
export async function updatePaymentMethod(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { profile } = await getUserProfile(user.id);
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'advisor')) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, description, is_active } = body;

    // Obtener el método actual
    const currentMethod = await kv.get(`payment_method:${id}`);
    
    if (!currentMethod) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    const now = new Date().toISOString();

    const updatedMethod = {
      ...currentMethod,
      name: name !== undefined ? name : currentMethod.name,
      description: description !== undefined ? description : currentMethod.description,
      is_active: is_active !== undefined ? is_active : currentMethod.is_active,
      updated_at: now,
    };

    await kv.set(`payment_method:${id}`, updatedMethod);

    return c.json({ method: updatedMethod });
  } catch (error) {
    console.error('Error in updatePaymentMethod:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Eliminar un método de pago
 * DELETE /make-server-17d656ff/finance/payment-methods/:id
 */
export async function deletePaymentMethod(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyUser(authHeader);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { profile } = await getUserProfile(user.id);
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'advisor')) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const id = c.req.param('id');

    // Verificar que existe
    const method = await kv.get(`payment_method:${id}`);
    
    if (!method) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    await kv.del(`payment_method:${id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error in deletePaymentMethod:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}