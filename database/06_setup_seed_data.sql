-- =====================================================
-- NexusPM - Database Setup Script 06: Seed Data
-- =====================================================
-- Este script inserta datos de prueba para desarrollo
-- NOTA: Ejecutar este script es OPCIONAL
-- =====================================================

-- =====================================================
-- IMPORTANTE: CREAR USUARIOS PRIMERO EN SUPABASE AUTH
-- =====================================================
-- Los siguientes usuarios deben crearse manualmente en
-- Supabase Dashboard > Authentication > Users o mediante
-- la API de Auth. Luego sus perfiles se crearán automáticamente
-- mediante el trigger handle_new_user().
--
-- USUARIOS DE PRUEBA RECOMENDADOS:
--
-- 1. Admin
--    Email: admin@nexuspm.com
--    Password: Admin123!
--    Metadata: { "full_name": "Admin User", "role": "admin" }
--
-- 2. Product Manager
--    Email: pm@nexuspm.com
--    Password: ProductManager123!
--    Metadata: { "full_name": "Product Manager", "role": "pm" }
--
-- 3. Developer
--    Email: dev@nexuspm.com
--    Password: Developer123!
--    Metadata: { "full_name": "Developer User", "role": "dev" }
--
-- 4. Advisor
--    Email: advisor@nexuspm.com
--    Password: Advisor123!
--    Metadata: { "full_name": "Financial Advisor", "role": "advisor" }
--
-- =====================================================

-- =====================================================
-- DATOS DE EJEMPLO: payment_methods
-- =====================================================

INSERT INTO public.payment_methods (name, description, is_active)
VALUES
    ('Transferencia Bancaria', 'Transferencia electrónica entre cuentas bancarias', true),
    ('PayPal', 'Pago mediante plataforma PayPal', true),
    ('Stripe', 'Pago mediante Stripe', true),
    ('Efectivo', 'Pago en efectivo', true),
    ('Cheque', 'Pago mediante cheque bancario', false)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DATOS DE EJEMPLO: clients (OPCIONAL)
-- =====================================================
-- Descomentar si deseas agregar clientes de ejemplo
/*
INSERT INTO public.clients (name, contact_name, contact_email, contact_phone, is_active)
VALUES
    ('Empresa Demo S.A.', 'Juan Pérez', 'juan.perez@empresademo.com', '+1234567890', true),
    ('StartupTech Inc.', 'María García', 'maria@startuptech.com', '+0987654321', true),
    ('Global Solutions', 'Carlos Rodríguez', 'carlos@globalsolutions.com', '+1122334455', true)
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- CONFIGURACIÓN INICIAL: kv_store_17d656ff
-- =====================================================
-- Configuración de colores predeterminados del Kanban

INSERT INTO public.kv_store_17d656ff (key, value)
VALUES (
    'kanban_colors',
    '{
        "dev": {
            "todo": "bg-gray-100",
            "in_progress": "bg-blue-100",
            "review": "bg-yellow-100"
        },
        "pm": {
            "todo": "bg-purple-100",
            "review": "bg-yellow-100",
            "done": "bg-green-100"
        }
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- FIN DEL SCRIPT DE DATOS SEMILLA
-- =====================================================
-- Para agregar más datos de ejemplo (proyectos, tareas, etc.),
-- es recomendado hacerlo mediante la aplicación web
-- una vez que esté funcionando.
-- =====================================================
