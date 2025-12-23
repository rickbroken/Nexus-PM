-- =====================================================
-- NexusPM - Queries Útiles y Mantenimiento
-- =====================================================
-- Este archivo contiene queries útiles para administración,
-- debugging y mantenimiento de la base de datos
-- =====================================================

-- =====================================================
-- 📊 QUERIES DE INFORMACIÓN
-- =====================================================

-- Ver todos los usuarios y sus roles
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM public.users_profiles
ORDER BY created_at DESC;

-- Ver estadísticas de proyectos por estado
SELECT 
    status,
    COUNT(*) as total_projects
FROM public.projects
GROUP BY status
ORDER BY total_projects DESC;

-- Ver estadísticas de tareas por estado
SELECT 
    status,
    priority,
    COUNT(*) as total_tasks
FROM public.tasks
GROUP BY status, priority
ORDER BY status, priority;

-- Ver proyectos con su cliente y número de tareas
SELECT 
    p.id,
    p.name as project_name,
    c.name as client_name,
    p.status,
    COUNT(t.id) as total_tasks
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.tasks t ON t.project_id = p.id
GROUP BY p.id, p.name, c.name, p.status
ORDER BY total_tasks DESC;

-- Ver tareas con información completa
SELECT 
    t.id,
    t.title,
    t.status,
    t.priority,
    p.name as project_name,
    u.full_name as assigned_to,
    t.due_date,
    t.created_at
FROM public.tasks t
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.users_profiles u ON t.assigned_to = u.id
ORDER BY t.created_at DESC
LIMIT 20;

-- Ver notificaciones no leídas por usuario
SELECT 
    u.full_name,
    u.email,
    COUNT(n.id) as unread_notifications
FROM public.users_profiles u
LEFT JOIN public.notifications n ON n.user_id = u.id AND n.is_read = false
GROUP BY u.id, u.full_name, u.email
ORDER BY unread_notifications DESC;

-- Ver resumen financiero por proyecto
SELECT 
    p.name as project_name,
    pf.total_value,
    pf.currency,
    COALESCE(SUM(CASE WHEN py.type = 'income' AND py.deleted_at IS NULL THEN py.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN py.type = 'expense' AND py.deleted_at IS NULL THEN py.amount ELSE 0 END), 0) as total_expenses,
    pf.total_value - COALESCE(SUM(CASE WHEN py.type = 'income' AND py.deleted_at IS NULL THEN py.amount ELSE 0 END), 0) as balance
FROM public.projects p
LEFT JOIN public.project_finances pf ON pf.project_id = p.id
LEFT JOIN public.payments py ON py.project_id = p.id
GROUP BY p.id, p.name, pf.total_value, pf.currency
ORDER BY balance DESC;

-- Ver cobros recurrentes activos próximos a vencer (30 días)
SELECT 
    rc.id,
    p.name as project_name,
    rc.description,
    rc.amount,
    rc.type,
    rc.period,
    rc.next_due_date,
    (rc.next_due_date - CURRENT_DATE) as days_until_due
FROM public.recurring_charges rc
LEFT JOIN public.projects p ON rc.project_id = p.id
WHERE 
    rc.is_active = true
    AND rc.next_due_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY rc.next_due_date ASC;

-- Ver uso de almacenamiento por proyecto
SELECT 
    p.name as project_name,
    COUNT(ta.id) as total_attachments,
    ROUND(SUM(ta.file_size) / 1024.0 / 1024.0, 2) as total_mb
FROM public.projects p
LEFT JOIN public.tasks t ON t.project_id = p.id
LEFT JOIN public.task_attachments ta ON ta.task_id = t.id
GROUP BY p.id, p.name
ORDER BY total_mb DESC;

-- Ver actividad reciente (últimas 24 horas)
SELECT 
    'Task' as type,
    t.title as description,
    u.full_name as created_by,
    t.created_at
FROM public.tasks t
LEFT JOIN public.users_profiles u ON t.created_by = u.id
WHERE t.created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'Comment' as type,
    'Comment on task' as description,
    u.full_name as created_by,
    tc.created_at
FROM public.task_comments tc
LEFT JOIN public.users_profiles u ON tc.user_id = u.id
WHERE tc.created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- =====================================================
-- 🔧 QUERIES DE MANTENIMIENTO
-- =====================================================

-- Archivar manualmente tareas completadas hace más de 24 horas
UPDATE public.tasks
SET 
    status = 'archived',
    archived_at = NOW()
WHERE 
    status = 'done'
    AND completed_at IS NOT NULL
    AND completed_at < NOW() - INTERVAL '24 hours'
    AND archived_at IS NULL;

-- Marcar todas las notificaciones antiguas como leídas (más de 30 días)
UPDATE public.notifications
SET is_read = true
WHERE 
    is_read = false
    AND created_at < NOW() - INTERVAL '30 days';

-- Limpiar adjuntos huérfanos (sin tarea asociada)
DELETE FROM public.task_attachments
WHERE task_id NOT IN (SELECT id FROM public.tasks);

-- Ver tamaño total de la base de datos
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Ver tamaño de cada tabla
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 🐛 QUERIES DE DEBUGGING
-- =====================================================

-- Verificar configuración RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Ver todas las políticas RLS activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Ver todos los triggers activos
SELECT 
    trigger_schema,
    trigger_name,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Ver todas las funciones personalizadas
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Verificar integridad referencial
SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE contype = 'f'
AND connamespace = 'public'::regnamespace
ORDER BY table_name;

-- Ver índices y su tamaño
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- =====================================================
-- 🧪 QUERIES DE TESTING
-- =====================================================

-- Crear un proyecto de prueba
/*
INSERT INTO public.projects (name, description, status)
VALUES ('Proyecto de Prueba', 'Este es un proyecto de prueba', 'planning')
RETURNING id, name, status;
*/

-- Crear una tarea de prueba (reemplazar {project_id} y {user_id})
/*
INSERT INTO public.tasks (
    project_id,
    title,
    description,
    status,
    priority,
    assigned_to
)
VALUES (
    '{project_id}',
    'Tarea de Prueba',
    'Esta es una tarea de prueba',
    'todo',
    'medium',
    '{user_id}'
)
RETURNING id, title, status;
*/

-- Crear una notificación de prueba (reemplazar {user_id})
/*
INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message
)
VALUES (
    '{user_id}',
    'task_assigned',
    'Nueva tarea asignada',
    'Se te ha asignado una nueva tarea'
)
RETURNING id, title, is_read;
*/

-- =====================================================
-- 🔒 QUERIES DE SEGURIDAD
-- =====================================================

-- Ver usuarios inactivos
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM public.users_profiles
WHERE is_active = false
ORDER BY created_at DESC;

-- Ver últimos logins (requiere configuración adicional de Supabase Auth)
-- Esta información está en auth.users, no en users_profiles
SELECT 
    id,
    email,
    last_sign_in_at,
    created_at
FROM auth.users
ORDER BY last_sign_in_at DESC NULLS LAST
LIMIT 20;

-- Ver pagos cancelados/eliminados
SELECT 
    p.id,
    pr.name as project_name,
    p.amount,
    p.deleted_at,
    u.full_name as deleted_by,
    p.deleted_reason
FROM public.payments p
LEFT JOIN public.projects pr ON p.project_id = pr.id
LEFT JOIN public.users_profiles u ON p.deleted_by = u.id
WHERE p.deleted_at IS NOT NULL
ORDER BY p.deleted_at DESC;

-- =====================================================
-- 📈 QUERIES DE REPORTES
-- =====================================================

-- Resumen de productividad por desarrollador
SELECT 
    u.full_name,
    u.email,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    ROUND(
        COUNT(CASE WHEN t.status = 'done' THEN 1 END)::numeric / 
        NULLIF(COUNT(t.id), 0) * 100, 
        2
    ) as completion_rate
FROM public.users_profiles u
LEFT JOIN public.tasks t ON t.assigned_to = u.id
WHERE u.role = 'dev'
GROUP BY u.id, u.full_name, u.email
ORDER BY completion_rate DESC;

-- Ingresos y egresos por mes (último año)
SELECT 
    TO_CHAR(payment_date, 'YYYY-MM') as month,
    SUM(CASE WHEN type = 'income' AND deleted_at IS NULL THEN amount ELSE 0 END) as income,
    SUM(CASE WHEN type = 'expense' AND deleted_at IS NULL THEN amount ELSE 0 END) as expenses,
    SUM(CASE WHEN type = 'income' AND deleted_at IS NULL THEN amount 
             WHEN type = 'expense' AND deleted_at IS NULL THEN -amount 
             ELSE 0 END) as net
FROM public.payments
WHERE 
    payment_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
ORDER BY month DESC;

-- Proyectos más activos (por número de tareas y comentarios)
SELECT 
    p.name as project_name,
    p.status,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT tc.id) as total_comments,
    COUNT(DISTINCT ta.id) as total_attachments
FROM public.projects p
LEFT JOIN public.tasks t ON t.project_id = p.id
LEFT JOIN public.task_comments tc ON tc.task_id = t.id
LEFT JOIN public.task_attachments ta ON ta.task_id = t.id
GROUP BY p.id, p.name, p.status
ORDER BY total_tasks DESC, total_comments DESC
LIMIT 10;

-- =====================================================
-- FIN DE QUERIES ÚTILES
-- =====================================================
