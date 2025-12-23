-- =====================================================
-- NexusPM - Database Setup Script 03: Functions & Triggers
-- =====================================================
-- Este script crea funciones de base de datos y triggers
-- =====================================================

-- =====================================================
-- FUNCIÓN: update_updated_at_column()
-- =====================================================
-- Actualiza automáticamente el campo updated_at cuando
-- se modifica un registro
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS: Actualización automática de updated_at
-- =====================================================
-- Aplicar a todas las tablas con campo updated_at
-- =====================================================

-- users_profiles
DROP TRIGGER IF EXISTS update_users_profiles_updated_at ON public.users_profiles;
CREATE TRIGGER update_users_profiles_updated_at
    BEFORE UPDATE ON public.users_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- clients
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- project_credentials
DROP TRIGGER IF EXISTS update_project_credentials_updated_at ON public.project_credentials;
CREATE TRIGGER update_project_credentials_updated_at
    BEFORE UPDATE ON public.project_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- task_comments
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- task_attachments
DROP TRIGGER IF EXISTS update_task_attachments_updated_at ON public.task_attachments;
CREATE TRIGGER update_task_attachments_updated_at
    BEFORE UPDATE ON public.task_attachments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- project_finances
DROP TRIGGER IF EXISTS update_project_finances_updated_at ON public.project_finances;
CREATE TRIGGER update_project_finances_updated_at
    BEFORE UPDATE ON public.project_finances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- payments
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- recurring_charges
DROP TRIGGER IF EXISTS update_recurring_charges_updated_at ON public.recurring_charges;
CREATE TRIGGER update_recurring_charges_updated_at
    BEFORE UPDATE ON public.recurring_charges
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- payment_methods
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- kv_store_17d656ff
DROP TRIGGER IF EXISTS update_kv_store_updated_at ON public.kv_store_17d656ff;
CREATE TRIGGER update_kv_store_updated_at
    BEFORE UPDATE ON public.kv_store_17d656ff
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCIÓN: handle_new_user()
-- =====================================================
-- Crea automáticamente un perfil cuando se registra
-- un nuevo usuario en auth.users
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users_profiles (id, email, full_name, role, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'dev'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCIÓN: auto_archive_completed_tasks()
-- =====================================================
-- Archiva automáticamente tareas completadas después
-- de 24 horas (ejecutar mediante cron job)
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_archive_completed_tasks()
RETURNS void AS $$
BEGIN
    UPDATE public.tasks
    SET 
        status = 'archived',
        archived_at = NOW()
    WHERE 
        status = 'done'
        AND completed_at IS NOT NULL
        AND completed_at < NOW() - INTERVAL '24 hours'
        AND archived_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIN DEL SCRIPT DE FUNCIONES Y TRIGGERS
-- =====================================================
