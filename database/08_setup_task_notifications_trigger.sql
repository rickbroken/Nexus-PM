-- =====================================================
-- TRIGGER: Notificaciones automáticas de tareas
-- =====================================================
-- Crea notificaciones automáticamente cuando:
-- 1. Se asigna una tarea a un usuario (INSERT o UPDATE)
-- 2. Una tarea cambia a "ready_for_review"
-- 3. Una tarea es aprobada o rechazada
-- =====================================================

-- =====================================================
-- FUNCIÓN: notify_task_changes()
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    task_title TEXT;
    task_project_name TEXT;
    assigner_name TEXT;
BEGIN
    -- Obtener información de la tarea y el proyecto
    SELECT t.title, p.name, u.full_name
    INTO task_title, task_project_name, assigner_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users_profiles u ON u.id = auth.uid()
    WHERE t.id = NEW.id;

    -- =====================================================
    -- 1. NOTIFICAR ASIGNACIÓN DE TAREA
    -- =====================================================
    -- Cuando se asigna una tarea a un usuario (nuevo o cambio de asignado)
    IF NEW.assigned_to IS NOT NULL AND 
       (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
        
        -- Solo notificar si el asignado NO es quien está haciendo el cambio
        IF NEW.assigned_to != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                entity_type,
                entity_id,
                action_url,
                created_by
            ) VALUES (
                NEW.assigned_to,
                'task_assigned',
                'Nueva tarea asignada',
                'Se te ha asignado: ' || task_title || 
                CASE 
                    WHEN task_project_name IS NOT NULL THEN ' (Proyecto: ' || task_project_name || ')'
                    ELSE ''
                END,
                'task',
                NEW.id::text,
                '/tasks/' || NEW.id,
                auth.uid()
            );
        END IF;
    END IF;

    -- =====================================================
    -- 2. NOTIFICAR TAREA LISTA PARA REVISIÓN
    -- =====================================================
    -- Cuando un developer cambia el estado a "ready_for_review"
    IF TG_OP = 'UPDATE' AND 
       NEW.status = 'ready_for_review' AND 
       OLD.status IS DISTINCT FROM 'ready_for_review' THEN
        
        -- Notificar al creador de la tarea (generalmente el PM)
        IF NEW.created_by IS NOT NULL AND 
           NEW.created_by != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                entity_type,
                entity_id,
                action_url,
                created_by
            ) VALUES (
                NEW.created_by,
                'task_ready_review',
                'Tarea lista para revisión',
                task_title || ' está lista para revisión' ||
                CASE 
                    WHEN task_project_name IS NOT NULL THEN ' (Proyecto: ' || task_project_name || ')'
                    ELSE ''
                END,
                'task',
                NEW.id::text,
                '/tasks/' || NEW.id,
                auth.uid()
            );
        END IF;
    END IF;

    -- =====================================================
    -- 3. NOTIFICAR TAREA APROBADA
    -- =====================================================
    -- Cuando un PM aprueba una tarea
    IF TG_OP = 'UPDATE' AND 
       NEW.status = 'approved' AND 
       OLD.status IS DISTINCT FROM 'approved' THEN
        
        -- Notificar al asignado
        IF NEW.assigned_to IS NOT NULL AND 
           NEW.assigned_to != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                entity_type,
                entity_id,
                action_url,
                created_by
            ) VALUES (
                NEW.assigned_to,
                'task_approved',
                '¡Tarea aprobada! 🎉',
                task_title || ' ha sido aprobada' ||
                CASE 
                    WHEN task_project_name IS NOT NULL THEN ' (Proyecto: ' || task_project_name || ')'
                    ELSE ''
                END,
                'task',
                NEW.id::text,
                '/tasks/' || NEW.id,
                auth.uid()
            );
        END IF;
    END IF;

    -- =====================================================
    -- 4. NOTIFICAR TAREA RECHAZADA
    -- =====================================================
    -- Cuando un PM rechaza una tarea
    IF TG_OP = 'UPDATE' AND 
       NEW.status = 'rejected' AND 
       OLD.status IS DISTINCT FROM 'rejected' THEN
        
        -- Notificar al asignado
        IF NEW.assigned_to IS NOT NULL AND 
           NEW.assigned_to != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                entity_type,
                entity_id,
                action_url,
                created_by
            ) VALUES (
                NEW.assigned_to,
                'task_rejected',
                'Tarea requiere cambios',
                task_title || ' requiere modificaciones' ||
                CASE 
                    WHEN task_project_name IS NOT NULL THEN ' (Proyecto: ' || task_project_name || ')'
                    ELSE ''
                END,
                'task',
                NEW.id::text,
                '/tasks/' || NEW.id,
                auth.uid()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Ejecutar después de INSERT/UPDATE en tasks
-- =====================================================

DROP TRIGGER IF EXISTS trigger_notify_task_changes ON public.tasks;

CREATE TRIGGER trigger_notify_task_changes
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_task_changes();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 'Trigger de notificaciones de tareas creado exitosamente' AS status;
