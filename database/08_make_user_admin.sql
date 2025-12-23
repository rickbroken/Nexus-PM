-- =====================================================
-- NexusPM - Hacer un usuario ADMIN
-- =====================================================
-- Este script te ayuda a convertir un usuario en admin
-- para que pueda crear otros usuarios desde el sistema
-- =====================================================

-- =====================================================
-- PASO 1: VER TODOS LOS USUARIOS Y SUS ROLES
-- =====================================================

SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM users_profiles
ORDER BY created_at DESC;

-- =====================================================
-- PASO 2: HACER UN USUARIO ADMIN
-- =====================================================
-- IMPORTANTE: Reemplaza 'TU_EMAIL_AQUI' con tu email real
-- =====================================================

-- Opción A: Usando EMAIL
UPDATE users_profiles 
SET role = 'admin' 
WHERE email = 'TU_EMAIL_AQUI';

-- Opción B: Usando ID (si conoces el ID del usuario)
-- UPDATE users_profiles 
-- SET role = 'admin' 
-- WHERE id = 'ID_DEL_USUARIO_AQUI';

-- =====================================================
-- PASO 3: VERIFICAR QUE SE ACTUALIZÓ
-- =====================================================

SELECT 
    email,
    full_name,
    role,
    CASE 
        WHEN role = 'admin' THEN '✅ ES ADMIN'
        ELSE '❌ NO ES ADMIN'
    END as status
FROM users_profiles
WHERE email = 'TU_EMAIL_AQUI';

-- =====================================================
-- EJEMPLOS ADICIONALES
-- =====================================================

-- Hacer TODOS los usuarios admins (⚠️ PELIGROSO en producción)
-- UPDATE users_profiles SET role = 'admin';

-- Hacer admin al primer usuario creado
-- UPDATE users_profiles 
-- SET role = 'admin' 
-- WHERE id = (SELECT id FROM users_profiles ORDER BY created_at ASC LIMIT 1);

-- Hacer admin al usuario más reciente
-- UPDATE users_profiles 
-- SET role = 'admin' 
-- WHERE id = (SELECT id FROM users_profiles ORDER BY created_at DESC LIMIT 1);

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM users_profiles
    WHERE role = 'admin';
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '👑 USUARIOS ADMIN EN EL SISTEMA';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total de administradores: %', admin_count;
    
    IF admin_count > 0 THEN
        RAISE NOTICE '✅ Hay al menos un admin en el sistema';
        RAISE NOTICE '';
        RAISE NOTICE 'Administradores:';
        
        FOR admin_user IN (
            SELECT email, full_name
            FROM users_profiles
            WHERE role = 'admin'
            ORDER BY created_at
        )
        LOOP
            RAISE NOTICE '  👤 % ({})', admin_user.full_name, admin_user.email;
        END LOOP;
    ELSE
        RAISE NOTICE '⚠️  NO HAY ADMINISTRADORES';
        RAISE NOTICE 'Ejecuta el UPDATE de arriba para crear uno';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- NOTAS
-- =====================================================
-- 
-- Roles disponibles en NexusPM:
-- • 'admin'   - Administrador (control total)
-- • 'pm'      - Product Manager (gestión de proyectos)
-- • 'dev'     - Developer (desarrollo)
-- • 'advisor' - Asesor Financiero (finanzas)
--
-- El primer usuario que creas DEBE ser admin para poder
-- crear otros usuarios desde la interfaz web.
--
-- =====================================================
