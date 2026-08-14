-- =====================================================
-- NexusPM - Database Setup Script 02: Storage Buckets
-- =====================================================
-- Este script configura los buckets de Supabase Storage
-- para almacenar archivos adjuntos de tareas y logos de proyectos
-- =====================================================

-- =====================================================
-- 1. CREAR BUCKET: task-attachments
-- =====================================================
-- Almacena archivos adjuntos a tareas
-- Privado: requiere autenticación para acceder
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. CREAR BUCKET: project-logos
-- =====================================================
-- Almacena logos cuadrados de proyectos
-- Publico: permite mostrar los logos directamente en la UI
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-logos',
    'project-logos',
    true,
    2097152,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- FIN DEL SCRIPT DE STORAGE
-- =====================================================
-- NOTA: Las políticas RLS para storage se configuran
-- en el script 04_setup_storage_policies.sql
-- =====================================================
