-- =====================================================
-- NexusPM - Database Setup Script 07: Realtime
-- =====================================================
-- Este script habilita Supabase Realtime en las tablas
-- para actualizaciones en tiempo real en el frontend
-- =====================================================

-- =====================================================
-- HABILITAR REPLICA IDENTITY
-- =====================================================
-- Esto permite que Realtime rastree todos los cambios
-- en las filas, no solo la clave primaria
-- =====================================================

-- users_profiles
ALTER TABLE public.users_profiles REPLICA IDENTITY FULL;

-- clients
ALTER TABLE public.clients REPLICA IDENTITY FULL;

-- projects
ALTER TABLE public.projects REPLICA IDENTITY FULL;

-- project_members
ALTER TABLE public.project_members REPLICA IDENTITY FULL;

-- project_credentials (NO habilitar por seguridad)
-- ALTER TABLE public.project_credentials REPLICA IDENTITY FULL;

-- tasks
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- task_comments
ALTER TABLE public.task_comments REPLICA IDENTITY FULL;

-- task_attachments
ALTER TABLE public.task_attachments REPLICA IDENTITY FULL;

-- project_finances
ALTER TABLE public.project_finances REPLICA IDENTITY FULL;

-- payments
ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- recurring_charges
ALTER TABLE public.recurring_charges REPLICA IDENTITY FULL;

-- payment_methods
ALTER TABLE public.payment_methods REPLICA IDENTITY FULL;

-- notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- kv_store_17d656ff
ALTER TABLE public.kv_store_17d656ff REPLICA IDENTITY FULL;

-- =====================================================
-- AGREGAR TABLAS A LA PUBLICACIÓN REALTIME
-- =====================================================
-- Supabase usa una publicación llamada 'supabase_realtime'
-- para determinar qué tablas transmiten cambios
-- =====================================================

-- Verificar si la publicación existe, si no, crearla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Agregar tablas a la publicación (si no están ya)
DO $$
DECLARE
    tables_to_add TEXT[] := ARRAY[
        'users_profiles',
        'clients',
        'projects',
        'project_members',
        'tasks',
        'task_comments',
        'task_attachments',
        'project_finances',
        'payments',
        'recurring_charges',
        'payment_methods',
        'notifications',
        'kv_store_17d656ff'
    ];
    tbl TEXT;
    pub_tables TEXT;
BEGIN
    -- Obtener tablas actuales en la publicación
    SELECT string_agg(tablename, ',')
    INTO pub_tables
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime';
    
    -- Agregar cada tabla si no está en la publicación
    FOREACH tbl IN ARRAY tables_to_add
    LOOP
        IF pub_tables IS NULL OR pub_tables NOT LIKE '%' || tbl || '%' THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            RAISE NOTICE 'Tabla agregada a Realtime: %', tbl;
        ELSE
            RAISE NOTICE 'Tabla ya está en Realtime: %', tbl;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- VERIFICAR CONFIGURACIÓN DE REALTIME
-- =====================================================

DO $$
DECLARE
    realtime_count INTEGER;
    expected_count INTEGER := 13; -- Número de tablas esperadas
    tbl RECORD; -- Declarar como RECORD para el loop
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🔄 VERIFICACIÓN DE REALTIME';
    RAISE NOTICE '==========================================';
    
    -- Contar tablas en la publicación
    SELECT COUNT(*)
    INTO realtime_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public';
    
    RAISE NOTICE 'Tablas con Realtime habilitado: %', realtime_count;
    
    IF realtime_count >= expected_count THEN
        RAISE NOTICE '✅ REALTIME CONFIGURADO CORRECTAMENTE';
        RAISE NOTICE '';
        RAISE NOTICE 'Las siguientes tablas transmiten cambios en tiempo real:';
        
        FOR tbl IN (
            SELECT tablename
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            ORDER BY tablename
        )
        LOOP
            RAISE NOTICE '  - %', tbl.tablename;
        END LOOP;
    ELSE
        RAISE NOTICE '⚠️  Solo % de % tablas tienen Realtime', realtime_count, expected_count;
        RAISE NOTICE 'Verifica que el script se ejecutó correctamente';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 
-- 1. REPLICA IDENTITY FULL permite que Realtime vea todos
--    los cambios en una fila, no solo la clave primaria.
--    Esto es necesario para detectar qué columnas cambiaron.
--
-- 2. La publicación 'supabase_realtime' es estándar en
--    Supabase. El frontend se suscribe a esta publicación
--    para recibir eventos en tiempo real.
--
-- 3. NO habilitamos Realtime en 'project_credentials' por
--    seguridad, ya que contiene datos sensibles encriptados.
--
-- 4. Las tablas de Storage (storage.objects, storage.buckets)
--    ya tienen su propia configuración de Realtime en Supabase.
--
-- 5. Después de ejecutar este script, el frontend puede
--    usar supabase.channel() para suscribirse a cambios:
--
--    supabase
--      .channel('custom-channel')
--      .on('postgres_changes', {
--        event: '*',
--        schema: 'public',
--        table: 'tasks'
--      }, (payload) => {
--        console.log('Change received!', payload)
--      })
--      .subscribe()
--
-- 6. Si necesitas deshabilitar Realtime en una tabla:
--    ALTER PUBLICATION supabase_realtime DROP TABLE nombre_tabla;
--
-- =====================================================
-- FIN DEL SCRIPT DE REALTIME
-- =====================================================