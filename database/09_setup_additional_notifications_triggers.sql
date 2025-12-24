-- =====================================================
-- TRIGGERS: Notificaciones adicionales del sistema
-- =====================================================
-- Crea notificaciones automáticas para:
-- 1. Comentarios en tareas
-- 2. Pagos recibidos
-- 3. Pagos grandes
-- 4. Nuevos usuarios registrados
-- 5. Proyectos creados
-- 6. Proyectos actualizados
-- =====================================================

-- =====================================================
-- 1. TRIGGER: Notificar comentarios en tareas
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_task_comment()
RETURNS TRIGGER AS $$
DECLARE
    task_info RECORD;
    comment_author TEXT;
BEGIN
    -- Obtener información de la tarea y el autor del comentario
    SELECT 
        t.id,
        t.title,
        t.assigned_to,
        t.created_by,
        p.name as project_name,
        u.full_name as author_name
    INTO task_info
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users_profiles u ON u.id = NEW.user_id
    WHERE t.id = NEW.task_id;

    -- Notificar al asignado (si existe y no es quien comentó)
    IF task_info.assigned_to IS NOT NULL AND 
       task_info.assigned_to != NEW.user_id THEN
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
            task_info.assigned_to,
            'task_commented',
            'Nuevo comentario en tarea',
            task_info.author_name || ' comentó en: ' || task_info.title,
            'task',
            task_info.id::text,
            '/tasks/' || task_info.id,
            NEW.user_id
        );
    END IF;

    -- Notificar al creador de la tarea (si existe, no es quien comentó, y no es el asignado)
    IF task_info.created_by IS NOT NULL AND 
       task_info.created_by != NEW.user_id AND
       task_info.created_by != task_info.assigned_to THEN
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
            task_info.created_by,
            'task_commented',
            'Nuevo comentario en tarea',
            task_info.author_name || ' comentó en: ' || task_info.title,
            'task',
            task_info.id::text,
            '/tasks/' || task_info.id,
            NEW.user_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_task_comment ON public.task_comments;

CREATE TRIGGER trigger_notify_task_comment
    AFTER INSERT ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_task_comment();

-- =====================================================
-- 2. TRIGGER: Notificar pagos recibidos/realizados
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_payment()
RETURNS TRIGGER AS $$
DECLARE
    project_info RECORD;
    payment_amount NUMERIC;
    large_payment_threshold NUMERIC := 5000; -- Umbral para pagos grandes (ajustable)
BEGIN
    -- Solo procesar si es un nuevo pago (INSERT) y está confirmado
    IF TG_OP = 'INSERT' AND NEW.status = 'paid' THEN
        
        -- Obtener información del proyecto
        SELECT 
            p.id,
            p.name as project_name,
            pf.advisor_id
        INTO project_info
        FROM projects p
        LEFT JOIN project_finances pf ON p.id = pf.project_id
        WHERE p.id = NEW.project_id;

        payment_amount := ABS(NEW.amount);

        -- =====================================================
        -- 2A. NOTIFICAR PAGO RECIBIDO (solo ingresos)
        -- =====================================================
        IF NEW.type = 'income' THEN
            -- Notificar al advisor del proyecto (si existe)
            IF project_info.advisor_id IS NOT NULL THEN
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
                    project_info.advisor_id,
                    'payment_received',
                    'Pago recibido',
                    'Pago de $' || TO_CHAR(payment_amount, 'FM999,999,999.00') || 
                    ' registrado en: ' || COALESCE(project_info.project_name, 'Proyecto'),
                    'payment',
                    NEW.id::text,
                    '/finances',
                    NEW.created_by
                );
            END IF;

            -- =====================================================
            -- 2B. NOTIFICAR PAGO GRANDE (ingresos mayores al umbral)
            -- =====================================================
            IF payment_amount >= large_payment_threshold THEN
                -- Notificar a todos los advisors (role = 'advisor')
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    entity_type,
                    entity_id,
                    action_url,
                    created_by
                )
                SELECT 
                    id,
                    'payment_large',
                    '💰 Pago importante recibido',
                    'Pago de $' || TO_CHAR(payment_amount, 'FM999,999,999.00') || 
                    ' en: ' || COALESCE(project_info.project_name, 'Proyecto'),
                    'payment',
                    NEW.id::text,
                    '/finances',
                    NEW.created_by
                FROM users_profiles
                WHERE role = 'advisor';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_payment ON public.payments;

CREATE TRIGGER trigger_notify_payment
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_payment();

-- =====================================================
-- 3. TRIGGER: Notificar nuevos usuarios registrados
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_user_registered()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar a todos los administradores cuando se registra un nuevo usuario
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        action_url,
        created_by
    )
    SELECT 
        id,
        'user_registered',
        'Nuevo usuario registrado',
        NEW.full_name || ' (' || NEW.role || ') se ha registrado en el sistema',
        'user',
        NEW.id::text,
        '/settings',
        NEW.id
    FROM users_profiles
    WHERE role = 'admin';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_user_registered ON public.users_profiles;

CREATE TRIGGER trigger_notify_user_registered
    AFTER INSERT ON public.users_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_user_registered();

-- =====================================================
-- 4. TRIGGER: Notificar proyectos creados
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_project_created()
RETURNS TRIGGER AS $$
DECLARE
    creator_name TEXT;
BEGIN
    -- Obtener nombre del creador
    SELECT full_name INTO creator_name
    FROM users_profiles
    WHERE id = NEW.created_by;

    -- Notificar a todos los PMs y Admins
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        action_url,
        created_by
    )
    SELECT 
        id,
        'project_created',
        'Nuevo proyecto creado',
        COALESCE(creator_name, 'Usuario') || ' creó el proyecto: ' || NEW.name,
        'project',
        NEW.id::text,
        '/projects/' || NEW.id,
        NEW.created_by
    FROM users_profiles
    WHERE role IN ('admin', 'pm') AND id != NEW.created_by;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_project_created ON public.projects;

CREATE TRIGGER trigger_notify_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_project_created();

-- =====================================================
-- 5. TRIGGER: Notificar proyectos actualizados (cambios importantes)
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_project_updated()
RETURNS TRIGGER AS $$
DECLARE
    updater_name TEXT;
    project_members UUID[];
BEGIN
    -- Solo notificar si hay cambios importantes
    IF OLD.status IS DISTINCT FROM NEW.status OR
       OLD.name IS DISTINCT FROM NEW.name OR
       OLD.description IS DISTINCT FROM NEW.description THEN

        -- Obtener nombre del actualizador
        SELECT full_name INTO updater_name
        FROM users_profiles
        WHERE id = auth.uid();

        -- Obtener miembros del proyecto
        SELECT ARRAY_AGG(user_id) INTO project_members
        FROM project_members
        WHERE project_id = NEW.id;

        -- Notificar a los miembros del proyecto (excepto quien hizo el cambio)
        IF project_members IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                entity_type,
                entity_id,
                action_url,
                created_by
            )
            SELECT 
                unnest(project_members),
                'project_updated',
                'Proyecto actualizado',
                COALESCE(updater_name, 'Usuario') || ' actualizó el proyecto: ' || NEW.name,
                'project',
                NEW.id::text,
                '/projects/' || NEW.id,
                auth.uid()
            WHERE unnest(project_members) != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_project_updated ON public.projects;

CREATE TRIGGER trigger_notify_project_updated
    AFTER UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_project_updated();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 'Triggers de notificaciones adicionales creados exitosamente' AS status;

-- Mostrar resumen de triggers creados
SELECT 
    'Triggers creados:' as info,
    STRING_AGG(trigger_name, ', ' ORDER BY trigger_name) as triggers
FROM (
    SELECT 'trigger_notify_task_comment' as trigger_name
    UNION ALL SELECT 'trigger_notify_payment'
    UNION ALL SELECT 'trigger_notify_user_registered'
    UNION ALL SELECT 'trigger_notify_project_created'
    UNION ALL SELECT 'trigger_notify_project_updated'
) t;
