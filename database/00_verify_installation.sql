-- =====================================================
-- NexusPM - Script de Verificación de Instalación
-- =====================================================
-- Este script verifica que toda la configuración de la
-- base de datos se haya completado correctamente
-- =====================================================
-- EJECUTAR ESTE SCRIPT DESPUÉS de completar todos los
-- scripts de setup (01 al 06)
-- =====================================================

-- =====================================================
-- ✅ VERIFICAR TABLAS
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
    missing_tables TEXT[];
    expected_tables TEXT[] := ARRAY[
        'users_profiles',
        'clients',
        'projects',
        'project_members',
        'project_credentials',
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
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🗂️  VERIFICANDO TABLAS';
    RAISE NOTICE '==========================================';
    
    -- Contar tablas existentes
    SELECT COUNT(*)
    INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY(expected_tables);
    
    -- Verificar cada tabla
    FOREACH tbl IN ARRAY expected_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = tbl
        ) THEN
            RAISE NOTICE '✅ Tabla encontrada: %', tbl;
        ELSE
            RAISE NOTICE '❌ Tabla faltante: %', tbl;
            missing_tables := array_append(missing_tables, tbl);
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Resumen: % de % tablas encontradas', table_count, array_length(expected_tables, 1);
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '⚠️  FALTAN TABLAS: Ejecutar 01_setup_tables.sql';
    ELSE
        RAISE NOTICE '✅ TODAS LAS TABLAS CREADAS CORRECTAMENTE';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR STORAGE BUCKETS
-- =====================================================

DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📦 VERIFICANDO STORAGE BUCKETS';
    RAISE NOTICE '==========================================';
    
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets
        WHERE id = 'task-attachments'
    ) INTO bucket_exists;
    
    IF bucket_exists THEN
        RAISE NOTICE '✅ Bucket encontrado: task-attachments';
        RAISE NOTICE '✅ STORAGE CONFIGURADO CORRECTAMENTE';
    ELSE
        RAISE NOTICE '❌ Bucket faltante: task-attachments';
        RAISE NOTICE '⚠️  Ejecutar 02_setup_storage.sql';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR FUNCIONES
-- =====================================================

DO $$
DECLARE
    function_count INTEGER;
    expected_functions TEXT[] := ARRAY[
        'update_updated_at_column',
        'handle_new_user',
        'auto_archive_completed_tasks'
    ];
    func TEXT;
    func_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '⚙️  VERIFICANDO FUNCIONES';
    RAISE NOTICE '==========================================';
    
    function_count := 0;
    
    FOREACH func IN ARRAY expected_functions
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = func
        ) INTO func_exists;
        
        IF func_exists THEN
            RAISE NOTICE '✅ Función encontrada: %', func;
            function_count := function_count + 1;
        ELSE
            RAISE NOTICE '❌ Función faltante: %', func;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Resumen: % de % funciones encontradas', function_count, array_length(expected_functions, 1);
    
    IF function_count = array_length(expected_functions, 1) THEN
        RAISE NOTICE '✅ TODAS LAS FUNCIONES CREADAS CORRECTAMENTE';
    ELSE
        RAISE NOTICE '⚠️  Ejecutar 03_setup_functions.sql';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR TRIGGERS
-- =====================================================

DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🔄 VERIFICANDO TRIGGERS';
    RAISE NOTICE '==========================================';
    
    SELECT COUNT(*)
    INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';
    
    RAISE NOTICE 'Total de triggers encontrados: %', trigger_count;
    
    IF trigger_count >= 11 THEN -- Deberíamos tener al menos 11 triggers de updated_at + 1 de handle_new_user
        RAISE NOTICE '✅ TRIGGERS CONFIGURADOS CORRECTAMENTE';
    ELSE
        RAISE NOTICE '⚠️  Pocos triggers encontrados. Ejecutar 03_setup_functions.sql';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR POLÍTICAS RLS
-- =====================================================

DO $$
DECLARE
    rls_enabled_count INTEGER;
    rls_policy_count INTEGER;
    tables_without_rls TEXT[];
    expected_tables TEXT[] := ARRAY[
        'users_profiles',
        'clients',
        'projects',
        'project_members',
        'project_credentials',
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
    has_rls BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🔒 VERIFICANDO ROW LEVEL SECURITY (RLS)';
    RAISE NOTICE '==========================================';
    
    -- Contar tablas con RLS habilitado
    SELECT COUNT(*)
    INTO rls_enabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true;
    
    -- Verificar cada tabla
    FOREACH tbl IN ARRAY expected_tables
    LOOP
        SELECT rowsecurity
        INTO has_rls
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = tbl;
        
        IF has_rls THEN
            RAISE NOTICE '✅ RLS habilitado: %', tbl;
        ELSE
            RAISE NOTICE '❌ RLS deshabilitado: %', tbl;
            tables_without_rls := array_append(tables_without_rls, tbl);
        END IF;
    END LOOP;
    
    -- Contar políticas RLS
    SELECT COUNT(*)
    INTO rls_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE 'Tablas con RLS: % de %', rls_enabled_count, array_length(expected_tables, 1);
    RAISE NOTICE 'Total de políticas RLS: %', rls_policy_count;
    
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE NOTICE '⚠️  HAY TABLAS SIN RLS. Ejecutar 04_setup_rls_policies.sql';
    ELSIF rls_policy_count < 40 THEN
        RAISE NOTICE '⚠️  POCAS POLÍTICAS RLS. Ejecutar 04_setup_rls_policies.sql';
    ELSE
        RAISE NOTICE '✅ RLS CONFIGURADO CORRECTAMENTE';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR POLÍTICAS DE STORAGE
-- =====================================================

DO $$
DECLARE
    storage_policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📎 VERIFICANDO POLÍTICAS DE STORAGE';
    RAISE NOTICE '==========================================';
    
    SELECT COUNT(*)
    INTO storage_policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects';
    
    RAISE NOTICE 'Políticas de storage encontradas: %', storage_policy_count;
    
    IF storage_policy_count >= 4 THEN
        RAISE NOTICE '✅ POLÍTICAS DE STORAGE CONFIGURADAS';
    ELSE
        RAISE NOTICE '⚠️  Ejecutar 05_setup_storage_policies.sql';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR USUARIOS
-- =====================================================

DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
    pm_count INTEGER;
    dev_count INTEGER;
    advisor_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '👥 VERIFICANDO USUARIOS';
    RAISE NOTICE '==========================================';
    
    SELECT COUNT(*) INTO user_count FROM public.users_profiles;
    SELECT COUNT(*) INTO admin_count FROM public.users_profiles WHERE role = 'admin';
    SELECT COUNT(*) INTO pm_count FROM public.users_profiles WHERE role = 'pm';
    SELECT COUNT(*) INTO dev_count FROM public.users_profiles WHERE role = 'dev';
    SELECT COUNT(*) INTO advisor_count FROM public.users_profiles WHERE role = 'advisor';
    
    RAISE NOTICE 'Total de usuarios: %', user_count;
    RAISE NOTICE '  - Admins: %', admin_count;
    RAISE NOTICE '  - Product Managers: %', pm_count;
    RAISE NOTICE '  - Developers: %', dev_count;
    RAISE NOTICE '  - Advisors: %', advisor_count;
    
    IF user_count = 0 THEN
        RAISE NOTICE '⚠️  NO HAY USUARIOS. Crear usuarios en Supabase Auth';
        RAISE NOTICE '    Luego ejecutar 06_setup_seed_data.sql';
    ELSIF user_count >= 4 THEN
        RAISE NOTICE '✅ USUARIOS CREADOS CORRECTAMENTE';
    ELSE
        RAISE NOTICE '⚠️  Pocos usuarios. Recomendado crear al menos 4 usuarios (admin, pm, dev, advisor)';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR DATOS INICIALES
-- =====================================================

DO $$
DECLARE
    payment_methods_count INTEGER;
    kv_store_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🌱 VERIFICANDO DATOS INICIALES';
    RAISE NOTICE '==========================================';
    
    SELECT COUNT(*) INTO payment_methods_count FROM public.payment_methods;
    SELECT COUNT(*) INTO kv_store_count FROM public.kv_store_17d656ff;
    
    RAISE NOTICE 'Métodos de pago: %', payment_methods_count;
    RAISE NOTICE 'Configuraciones KV: %', kv_store_count;
    
    IF payment_methods_count = 0 OR kv_store_count = 0 THEN
        RAISE NOTICE '⚠️  FALTAN DATOS INICIALES. Ejecutar 06_setup_seed_data.sql';
    ELSE
        RAISE NOTICE '✅ DATOS INICIALES CONFIGURADOS';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR ÍNDICES
-- =====================================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📊 VERIFICANDO ÍNDICES';
    RAISE NOTICE '==========================================';
    
    SELECT COUNT(*)
    INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Total de índices encontrados: %', index_count;
    
    IF index_count >= 30 THEN
        RAISE NOTICE '✅ ÍNDICES CREADOS CORRECTAMENTE';
    ELSE
        RAISE NOTICE '⚠️  Pocos índices. Verificar 01_setup_tables.sql';
    END IF;
END $$;

-- =====================================================
-- ✅ VERIFICAR REALTIME
-- =====================================================

DO $$
DECLARE
    realtime_count INTEGER;
    expected_realtime_tables INTEGER := 13;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🔄 VERIFICANDO REALTIME';
    RAISE NOTICE '==========================================';
    
    -- Contar tablas en la publicación supabase_realtime
    SELECT COUNT(*)
    INTO realtime_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public';
    
    RAISE NOTICE 'Tablas con Realtime habilitado: %', realtime_count;
    
    IF realtime_count >= expected_realtime_tables THEN
        RAISE NOTICE '✅ REALTIME CONFIGURADO CORRECTAMENTE';
    ELSIF realtime_count > 0 THEN
        RAISE NOTICE '⚠️  Solo % de % tablas tienen Realtime', realtime_count, expected_realtime_tables;
        RAISE NOTICE '⚠️  Ejecutar 07_setup_realtime.sql';
    ELSE
        RAISE NOTICE '❌ REALTIME NO CONFIGURADO';
        RAISE NOTICE '⚠️  Ejecutar 07_setup_realtime.sql';
    END IF;
END $$;

-- =====================================================
-- 📋 RESUMEN FINAL
-- =====================================================

DO $$
DECLARE
    total_checks INTEGER := 9;
    passed_checks INTEGER := 0;
    
    table_count INTEGER;
    bucket_exists BOOLEAN;
    function_count INTEGER;
    trigger_count INTEGER;
    rls_enabled_count INTEGER;
    rls_policy_count INTEGER;
    storage_policy_count INTEGER;
    user_count INTEGER;
    payment_methods_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📋 RESUMEN DE VERIFICACIÓN';
    RAISE NOTICE '==========================================';
    
    -- Verificar cada componente
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
    IF table_count >= 14 THEN passed_checks := passed_checks + 1; END IF;
    
    SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'task-attachments') INTO bucket_exists;
    IF bucket_exists THEN passed_checks := passed_checks + 1; END IF;
    
    SELECT COUNT(*) INTO function_count 
    FROM information_schema.routines 
    WHERE routine_schema = 'public';
    IF function_count >= 3 THEN passed_checks := passed_checks + 1; END IF;
    
    SELECT COUNT(*) INTO trigger_count 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
    IF trigger_count >= 11 THEN passed_checks := passed_checks + 1; END IF;
    
    SELECT COUNT(*) INTO rls_enabled_count 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true;
    IF rls_enabled_count >= 14 THEN passed_checks := passed_checks + 1; END IF;
    
    SELECT COUNT(*) INTO rls_policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    IF rls_policy_count >= 40 THEN passed_checks := passed_checks + 1; END IF;
    
    SELECT COUNT(*) INTO storage_policy_count 
    FROM pg_policies 
    WHERE schemaname = 'storage';
    IF storage_policy_count >= 4 THEN passed_checks := passed_checks + 1; END IF;
    
    SELECT COUNT(*) INTO user_count FROM public.users_profiles;
    IF user_count >= 4 THEN passed_checks := passed_checks + 1; END IF;
    
    SELECT COUNT(*) INTO payment_methods_count FROM public.payment_methods;
    IF payment_methods_count > 0 THEN passed_checks := passed_checks + 1; END IF;
    
    -- Mostrar resumen
    RAISE NOTICE 'Verificaciones pasadas: % de %', passed_checks, total_checks;
    RAISE NOTICE '';
    
    IF passed_checks = total_checks THEN
        RAISE NOTICE '🎉 ¡INSTALACIÓN COMPLETA Y CORRECTA!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Todos los componentes están configurados correctamente.';
        RAISE NOTICE '✅ La base de datos está lista para usar.';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Próximos pasos:';
        RAISE NOTICE '   1. Configurar variables de entorno en la aplicación';
        RAISE NOTICE '   2. Iniciar la aplicación web';
        RAISE NOTICE '   3. Probar login con usuarios de prueba';
    ELSIF passed_checks >= 7 THEN
        RAISE NOTICE '⚠️  INSTALACIÓN CASI COMPLETA';
        RAISE NOTICE '';
        RAISE NOTICE 'La mayoría de componentes están configurados.';
        RAISE NOTICE 'Revisa los mensajes anteriores para completar la configuración.';
    ELSE
        RAISE NOTICE '❌ INSTALACIÓN INCOMPLETA';
        RAISE NOTICE '';
        RAISE NOTICE 'Faltan varios componentes por configurar.';
        RAISE NOTICE 'Ejecuta los scripts de setup en orden (01 al 06).';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- FIN DEL SCRIPT DE VERIFICACIÓN
-- =====================================================