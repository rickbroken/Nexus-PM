-- =====================================================
-- NexusPM - Database Setup Script 04: RLS Policies
-- =====================================================
-- Este script configura las políticas de Row Level Security
-- para proteger los datos según roles de usuario
-- =====================================================

-- =====================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store_17d656ff ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS: users_profiles
-- =====================================================

-- Todos pueden ver todos los perfiles (para asignaciones, etc.)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users_profiles;
CREATE POLICY "Users can view all profiles"
    ON public.users_profiles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Solo admins pueden insertar perfiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.users_profiles;
CREATE POLICY "Admins can insert profiles"
    ON public.users_profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() = id -- Permitir que el usuario cree su propio perfil
    );

-- Usuarios pueden actualizar su propio perfil, admins pueden actualizar cualquiera
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.users_profiles;
CREATE POLICY "Users can update own profile or admins can update any"
    ON public.users_profiles FOR UPDATE
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo admins pueden eliminar perfiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.users_profiles;
CREATE POLICY "Admins can delete profiles"
    ON public.users_profiles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS: clients
-- =====================================================

-- PMs y Admins pueden ver clientes
DROP POLICY IF EXISTS "PMs and Admins can view clients" ON public.clients;
CREATE POLICY "PMs and Admins can view clients"
    ON public.clients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- PMs y Admins pueden crear clientes
DROP POLICY IF EXISTS "PMs and Admins can create clients" ON public.clients;
CREATE POLICY "PMs and Admins can create clients"
    ON public.clients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- PMs y Admins pueden actualizar clientes
DROP POLICY IF EXISTS "PMs and Admins can update clients" ON public.clients;
CREATE POLICY "PMs and Admins can update clients"
    ON public.clients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- PMs y Admins pueden eliminar clientes
DROP POLICY IF EXISTS "PMs and Admins can delete clients" ON public.clients;
CREATE POLICY "PMs and Admins can delete clients"
    ON public.clients FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- =====================================================
-- POLÍTICAS: projects
-- =====================================================

-- Todos los usuarios autenticados pueden ver proyectos
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Authenticated users can view projects"
    ON public.projects FOR SELECT
    USING (auth.role() = 'authenticated');

-- PMs y Admins pueden crear proyectos
DROP POLICY IF EXISTS "PMs and Admins can create projects" ON public.projects;
CREATE POLICY "PMs and Admins can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- PMs y Admins pueden actualizar proyectos
DROP POLICY IF EXISTS "PMs and Admins can update projects" ON public.projects;
CREATE POLICY "PMs and Admins can update projects"
    ON public.projects FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- Solo Admins pueden eliminar proyectos
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Admins can delete projects"
    ON public.projects FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS: project_members
-- =====================================================

-- Todos pueden ver miembros de proyectos
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
CREATE POLICY "Users can view project members"
    ON public.project_members FOR SELECT
    USING (auth.role() = 'authenticated');

-- PMs y Admins pueden agregar miembros
DROP POLICY IF EXISTS "PMs and Admins can add members" ON public.project_members;
CREATE POLICY "PMs and Admins can add members"
    ON public.project_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- PMs y Admins pueden eliminar miembros
DROP POLICY IF EXISTS "PMs and Admins can remove members" ON public.project_members;
CREATE POLICY "PMs and Admins can remove members"
    ON public.project_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- =====================================================
-- POLÍTICAS: project_credentials
-- =====================================================

-- PMs y Admins pueden ver todas las credenciales
-- Devs solo pueden ver las marcadas como visible_to_devs
DROP POLICY IF EXISTS "Users can view credentials based on role" ON public.project_credentials;
CREATE POLICY "Users can view credentials based on role"
    ON public.project_credentials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
        OR (
            visible_to_devs = true
            AND EXISTS (
                SELECT 1 FROM public.users_profiles
                WHERE id = auth.uid() AND role = 'dev'
            )
        )
    );

-- Solo PMs y Admins pueden crear credenciales
DROP POLICY IF EXISTS "PMs and Admins can create credentials" ON public.project_credentials;
CREATE POLICY "PMs and Admins can create credentials"
    ON public.project_credentials FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- Solo PMs y Admins pueden actualizar credenciales
DROP POLICY IF EXISTS "PMs and Admins can update credentials" ON public.project_credentials;
CREATE POLICY "PMs and Admins can update credentials"
    ON public.project_credentials FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- Solo PMs y Admins pueden eliminar credenciales
DROP POLICY IF EXISTS "PMs and Admins can delete credentials" ON public.project_credentials;
CREATE POLICY "PMs and Admins can delete credentials"
    ON public.project_credentials FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- =====================================================
-- POLÍTICAS: tasks
-- =====================================================

-- Todos los usuarios autenticados pueden ver tareas
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
CREATE POLICY "Authenticated users can view tasks"
    ON public.tasks FOR SELECT
    USING (auth.role() = 'authenticated');

-- DEVs, PMs y Admins pueden crear tareas
DROP POLICY IF EXISTS "PMs can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "DEVs, PMs and Admins can create tasks" ON public.tasks;
CREATE POLICY "DEVs, PMs and Admins can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pm', 'dev')
            AND is_active = true
        )
    );

-- PMs pueden actualizar tareas, Devs pueden actualizar sus tareas asignadas
DROP POLICY IF EXISTS "Users can update tasks based on role" ON public.tasks;
CREATE POLICY "Users can update tasks based on role"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
        OR (
            assigned_to = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.users_profiles
                WHERE id = auth.uid() AND role = 'dev'
            )
        )
    );

-- Solo PMs y Admins pueden eliminar tareas
DROP POLICY IF EXISTS "PMs and Admins can delete tasks" ON public.tasks;
CREATE POLICY "PMs and Admins can delete tasks"
    ON public.tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- =====================================================
-- POLÍTICAS: task_comments
-- =====================================================

-- Usuarios pueden ver comentarios de tareas que pueden ver
DROP POLICY IF EXISTS "Users can view task comments" ON public.task_comments;
CREATE POLICY "Users can view task comments"
    ON public.task_comments FOR SELECT
    USING (auth.role() = 'authenticated');

-- Usuarios autenticados pueden crear comentarios
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.task_comments;
CREATE POLICY "Authenticated users can create comments"
    ON public.task_comments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Usuarios pueden actualizar sus propios comentarios
DROP POLICY IF EXISTS "Users can update own comments" ON public.task_comments;
CREATE POLICY "Users can update own comments"
    ON public.task_comments FOR UPDATE
    USING (user_id = auth.uid());

-- Usuarios pueden eliminar sus propios comentarios
DROP POLICY IF EXISTS "Users can delete own comments" ON public.task_comments;
CREATE POLICY "Users can delete own comments"
    ON public.task_comments FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- POLÍTICAS: task_attachments
-- =====================================================

-- Usuarios pueden ver adjuntos de tareas
DROP POLICY IF EXISTS "Users can view task attachments" ON public.task_attachments;
CREATE POLICY "Users can view task attachments"
    ON public.task_attachments FOR SELECT
    USING (auth.role() = 'authenticated');

-- Usuarios autenticados pueden subir adjuntos
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.task_attachments;
CREATE POLICY "Authenticated users can upload attachments"
    ON public.task_attachments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Usuarios pueden actualizar adjuntos (para marcar como vistos)
DROP POLICY IF EXISTS "Users can update attachments" ON public.task_attachments;
CREATE POLICY "Users can update attachments"
    ON public.task_attachments FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Usuarios pueden eliminar sus propios adjuntos
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.task_attachments;
CREATE POLICY "Users can delete own attachments"
    ON public.task_attachments FOR DELETE
    USING (uploaded_by = auth.uid());

-- =====================================================
-- POLÍTICAS: project_finances
-- =====================================================

-- Admins y Advisors pueden ver finanzas
DROP POLICY IF EXISTS "Admins and Advisors can view finances" ON public.project_finances;
CREATE POLICY "Admins and Advisors can view finances"
    ON public.project_finances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Admins y Advisors pueden crear registros financieros
DROP POLICY IF EXISTS "Admins and Advisors can create finances" ON public.project_finances;
CREATE POLICY "Admins and Advisors can create finances"
    ON public.project_finances FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Admins y Advisors pueden actualizar finanzas
DROP POLICY IF EXISTS "Admins and Advisors can update finances" ON public.project_finances;
CREATE POLICY "Admins and Advisors can update finances"
    ON public.project_finances FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Solo Admins pueden eliminar registros financieros
DROP POLICY IF EXISTS "Admins can delete finances" ON public.project_finances;
CREATE POLICY "Admins can delete finances"
    ON public.project_finances FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS: payments
-- =====================================================

-- Admins y Advisors pueden ver pagos
DROP POLICY IF EXISTS "Admins and Advisors can view payments" ON public.payments;
CREATE POLICY "Admins and Advisors can view payments"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Admins y Advisors pueden crear pagos
DROP POLICY IF EXISTS "Admins and Advisors can create payments" ON public.payments;
CREATE POLICY "Admins and Advisors can create payments"
    ON public.payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Admins y Advisors pueden actualizar pagos (solo para anular)
DROP POLICY IF EXISTS "Admins and Advisors can update payments" ON public.payments;
CREATE POLICY "Admins and Advisors can update payments"
    ON public.payments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Solo Admins pueden eliminar pagos (soft delete)
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
CREATE POLICY "Admins can delete payments"
    ON public.payments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS: recurring_charges
-- =====================================================

-- Admins y Advisors pueden ver cobros recurrentes
DROP POLICY IF EXISTS "Admins and Advisors can view recurring charges" ON public.recurring_charges;
CREATE POLICY "Admins and Advisors can view recurring charges"
    ON public.recurring_charges FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Admins y Advisors pueden crear cobros recurrentes
DROP POLICY IF EXISTS "Admins and Advisors can create recurring charges" ON public.recurring_charges;
CREATE POLICY "Admins and Advisors can create recurring charges"
    ON public.recurring_charges FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Admins y Advisors pueden actualizar cobros recurrentes
DROP POLICY IF EXISTS "Admins and Advisors can update recurring charges" ON public.recurring_charges;
CREATE POLICY "Admins and Advisors can update recurring charges"
    ON public.recurring_charges FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'advisor')
        )
    );

-- Solo Admins pueden eliminar cobros recurrentes
DROP POLICY IF EXISTS "Admins can delete recurring charges" ON public.recurring_charges;
CREATE POLICY "Admins can delete recurring charges"
    ON public.recurring_charges FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS: payment_methods
-- =====================================================

-- Todos pueden ver métodos de pago activos
DROP POLICY IF EXISTS "Users can view payment methods" ON public.payment_methods;
CREATE POLICY "Users can view payment methods"
    ON public.payment_methods FOR SELECT
    USING (auth.role() = 'authenticated');

-- Solo Admins pueden crear métodos de pago
DROP POLICY IF EXISTS "Admins can create payment methods" ON public.payment_methods;
CREATE POLICY "Admins can create payment methods"
    ON public.payment_methods FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo Admins pueden actualizar métodos de pago
DROP POLICY IF EXISTS "Admins can update payment methods" ON public.payment_methods;
CREATE POLICY "Admins can update payment methods"
    ON public.payment_methods FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo Admins pueden eliminar métodos de pago
DROP POLICY IF EXISTS "Admins can delete payment methods" ON public.payment_methods;
CREATE POLICY "Admins can delete payment methods"
    ON public.payment_methods FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS: notifications
-- =====================================================

-- Usuarios solo pueden ver sus propias notificaciones
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

-- Sistema puede crear notificaciones para cualquier usuario
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Usuarios pueden eliminar sus propias notificaciones
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- POLÍTICAS: kv_store_17d656ff
-- =====================================================

-- Todos los usuarios autenticados pueden leer del KV store
DROP POLICY IF EXISTS "Authenticated users can read KV store" ON public.kv_store_17d656ff;
CREATE POLICY "Authenticated users can read KV store"
    ON public.kv_store_17d656ff FOR SELECT
    USING (auth.role() = 'authenticated');

-- Todos los usuarios autenticados pueden escribir en el KV store
DROP POLICY IF EXISTS "Authenticated users can write to KV store" ON public.kv_store_17d656ff;
CREATE POLICY "Authenticated users can write to KV store"
    ON public.kv_store_17d656ff FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Todos los usuarios autenticados pueden actualizar el KV store
DROP POLICY IF EXISTS "Authenticated users can update KV store" ON public.kv_store_17d656ff;
CREATE POLICY "Authenticated users can update KV store"
    ON public.kv_store_17d656ff FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Solo Admins pueden eliminar del KV store
DROP POLICY IF EXISTS "Admins can delete from KV store" ON public.kv_store_17d656ff;
CREATE POLICY "Admins can delete from KV store"
    ON public.kv_store_17d656ff FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- FIN DEL SCRIPT DE POLÍTICAS RLS
-- =====================================================
