-- =====================================================
-- NexusPM - Database Setup Script 10: Agent Module
-- =====================================================
-- Base interna para futura administracion via MCP
-- Sin integraciones externas ni automatizaciones
-- =====================================================

-- =====================================================
-- 1. AJUSTE: ampliar tipos de notifications
-- =====================================================

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned',
        'task_ready_review',
        'task_approved',
        'task_rejected',
        'task_commented',
        'payment_received',
        'payment_large',
        'user_registered',
        'project_created',
        'project_updated',
        'recurring_charge_due_soon',
        'recurring_expense_due_soon',
        'reminder_due',
        'reminder_created',
        'reminder_completed',
        'reminder_cancelled',
        'agent_action_failed'
    ));

-- =====================================================
-- 2. TABLA: agent_actions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    recurring_charge_id UUID REFERENCES public.recurring_charges(id) ON DELETE SET NULL,
    input_text TEXT,
    result JSONB,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_user_id ON public.agent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_action_type ON public.agent_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON public.agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON public.agent_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_project_id ON public.agent_actions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_task_id ON public.agent_actions(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_client_id ON public.agent_actions(client_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_payment_id ON public.agent_actions(payment_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_recurring_charge_id ON public.agent_actions(recurring_charge_id);

-- =====================================================
-- 3. TABLA: reminders
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    remind_at TIMESTAMPTZ NOT NULL,
    recurrence_rule TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'cancelled', 'completed')) DEFAULT 'pending',
    source TEXT NOT NULL CHECK (source IN ('manual', 'agent', 'system')) DEFAULT 'manual',
    notified_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_project_id ON public.reminders(project_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON public.reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_priority ON public.reminders(priority);

DROP TRIGGER IF EXISTS update_reminders_updated_at ON public.reminders;
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. RLS
-- =====================================================

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- agent_actions
DROP POLICY IF EXISTS "Users can view agent actions by role" ON public.agent_actions;
CREATE POLICY "Users can view agent actions by role"
    ON public.agent_actions FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.users_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
        OR (
            EXISTS (
                SELECT 1
                FROM public.users_profiles up
                WHERE up.id = auth.uid() AND up.role = 'pm'
            )
            AND (
                agent_actions.project_id IS NOT NULL
                OR agent_actions.task_id IS NOT NULL
            )
        )
        OR (
            user_id = auth.uid()
            OR (
                task_id IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM public.users_profiles up
                    JOIN public.tasks t ON t.id = agent_actions.task_id
                    WHERE up.id = auth.uid()
                      AND up.role = 'dev'
                      AND t.assigned_to = auth.uid()
                )
            )
        )
        OR (
            EXISTS (
                SELECT 1
                FROM public.users_profiles up
                WHERE up.id = auth.uid() AND up.role = 'advisor'
            )
            AND (
                payment_id IS NOT NULL
                OR recurring_charge_id IS NOT NULL
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert own agent actions" ON public.agent_actions;
CREATE POLICY "Users can insert own agent actions"
    ON public.agent_actions FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Admins can update agent actions" ON public.agent_actions;
CREATE POLICY "Admins can update agent actions"
    ON public.agent_actions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.users_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete agent actions" ON public.agent_actions;
CREATE POLICY "Admins can delete agent actions"
    ON public.agent_actions FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.users_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- reminders
DROP POLICY IF EXISTS "Users can view reminders by ownership" ON public.reminders;
CREATE POLICY "Users can view reminders by ownership"
    ON public.reminders FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.users_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
CREATE POLICY "Users can insert own reminders"
    ON public.reminders FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update own reminders or admins any" ON public.reminders;
CREATE POLICY "Users can update own reminders or admins any"
    ON public.reminders FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.users_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.users_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete reminders" ON public.reminders;
CREATE POLICY "Admins can delete reminders"
    ON public.reminders FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.users_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =====================================================
-- Future MCP tools
-- - nexus_get_projects
-- - nexus_get_project_by_name
-- - nexus_get_project_summary
-- - nexus_get_pending_tasks
-- - nexus_create_task
-- - nexus_update_task_status
-- - nexus_add_task_comment
-- - nexus_create_reminder
-- - nexus_update_reminder
-- - nexus_cancel_reminder
-- - nexus_get_pending_reminders
-- - nexus_get_upcoming_payments
-- - nexus_get_overdue_payments
-- - nexus_get_recurring_charges
-- - nexus_get_daily_brief
-- - nexus_log_agent_action
-- =====================================================
