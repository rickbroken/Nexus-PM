-- =====================================================
-- NexusPM - Database Setup Script 01: Tables
-- =====================================================
-- Este script crea todas las tablas necesarias para NexusPM
-- Ejecutar después de crear el proyecto en Supabase
-- =====================================================

-- =====================================================
-- 1. TABLA: users_profiles
-- =====================================================
-- Almacena perfiles de usuarios del sistema
-- Relacionada con auth.users de Supabase
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'pm', 'dev', 'advisor')),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_profiles_email ON public.users_profiles(email);
CREATE INDEX IF NOT EXISTS idx_users_profiles_role ON public.users_profiles(role);
CREATE INDEX IF NOT EXISTS idx_users_profiles_is_active ON public.users_profiles(is_active);

-- =====================================================
-- 2. TABLA: clients
-- =====================================================
-- Almacena información de clientes
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);

-- =====================================================
-- 3. TABLA: projects
-- =====================================================
-- Almacena información de proyectos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('planning', 'in_development', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    repo_url TEXT,
    staging_url TEXT,
    prod_url TEXT,
    deployment_platform TEXT,
    deployment_platform_other TEXT,
    domain_platform TEXT,
    domain_platform_other TEXT,
    tech_stack TEXT[], -- Array de tecnologías
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);

-- =====================================================
-- 4. TABLA: project_members
-- =====================================================
-- Relación muchos a muchos entre proyectos y usuarios
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    added_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id) -- Un usuario no puede estar duplicado en un proyecto
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- =====================================================
-- 5. TABLA: project_credentials
-- =====================================================
-- Almacena credenciales de servicios de proyectos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    username TEXT,
    password_encrypted TEXT,
    url TEXT,
    notes TEXT,
    visible_to_devs BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_project_credentials_project_id ON public.project_credentials(project_id);

-- =====================================================
-- 6. TABLA: tasks
-- =====================================================
-- Almacena tareas de proyectos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'archived')) DEFAULT 'todo',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    assigned_to UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')),
    review_notes TEXT,
    dev_notes TEXT,
    dev_notes_timestamp TIMESTAMPTZ,
    observation_read_by_pm BOOLEAN DEFAULT false,
    observation_updated_at TIMESTAMPTZ,
    rejection_reason TEXT,
    rejection_timestamp TIMESTAMPTZ,
    rejection_read_by_dev BOOLEAN DEFAULT false,
    rejection_updated_at TIMESTAMPTZ,
    has_new_attachments_for_pm BOOLEAN DEFAULT false,
    has_new_attachments_for_dev BOOLEAN DEFAULT false,
    last_attachment_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    last_attachment_at TIMESTAMPTZ,
    tags TEXT[], -- Array de tags
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- =====================================================
-- 7. TABLA: task_comments
-- =====================================================
-- Almacena comentarios de tareas
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited BOOLEAN NOT NULL DEFAULT false,
    read_by UUID[] DEFAULT ARRAY[]::UUID[], -- Array de user_ids que han leído
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

-- =====================================================
-- 8. TABLA: task_attachments
-- =====================================================
-- Almacena metadata de archivos adjuntos a tareas
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    viewed_by_pm BOOLEAN DEFAULT false,
    viewed_by_dev BOOLEAN DEFAULT false,
    viewed_by_pm_at TIMESTAMPTZ,
    viewed_by_dev_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);

-- =====================================================
-- 9. TABLA: project_finances
-- =====================================================
-- Almacena información financiera de proyectos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_project_finances_project_id ON public.project_finances(project_id);

-- =====================================================
-- 10. TABLA: payments
-- =====================================================
-- Almacena pagos/ingresos/egresos de proyectos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    hosting_cost DECIMAL(12,2) DEFAULT 0,
    domain_cost DECIMAL(12,2) DEFAULT 0,
    other_cost DECIMAL(12,2) DEFAULT 0,
    other_cost_description TEXT,
    payment_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')) DEFAULT 'income',
    payment_method TEXT,
    reference TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    deleted_reason TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON public.payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON public.payments(deleted_at);

-- =====================================================
-- 11. TABLA: recurring_charges
-- =====================================================
-- Almacena cobros recurrentes (ingresos y egresos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.recurring_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'annual')),
    custom_days INTEGER, -- Para períodos personalizados
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    last_payment_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')) DEFAULT 'income',
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    cancelled_reason TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recurring_charges_project_id ON public.recurring_charges(project_id);
CREATE INDEX IF NOT EXISTS idx_recurring_charges_is_active ON public.recurring_charges(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_charges_type ON public.recurring_charges(type);
CREATE INDEX IF NOT EXISTS idx_recurring_charges_next_due_date ON public.recurring_charges(next_due_date);

-- =====================================================
-- 12. TABLA: payment_methods
-- =====================================================
-- Almacena métodos de pago configurables
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON public.payment_methods(is_active);

-- =====================================================
-- 13. TABLA: notifications
-- =====================================================
-- Almacena notificaciones del sistema
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
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
        'recurring_expense_due_soon'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- =====================================================
-- 14. TABLA: kv_store_17d656ff (Key-Value Store)
-- =====================================================
-- Almacén clave-valor para configuraciones globales
-- Usado para: colores Kanban personalizados, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kv_store_17d656ff (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON public.kv_store_17d656ff(key);

-- =====================================================
-- FIN DEL SCRIPT DE TABLAS
-- =====================================================
