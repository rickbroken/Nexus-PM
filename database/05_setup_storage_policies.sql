-- =====================================================
-- NexusPM - Database Setup Script 05: Storage Policies
-- =====================================================
-- Este script configura las políticas de acceso para
-- Supabase Storage (archivos adjuntos)
-- =====================================================

-- =====================================================
-- POLÍTICAS: task-attachments bucket
-- =====================================================

-- Los usuarios autenticados pueden subir archivos
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'task-attachments');

-- Los usuarios autenticados pueden ver archivos
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'task-attachments');

-- Los usuarios pueden actualizar sus propios archivos
DROP POLICY IF EXISTS "Users can update own attachments" ON storage.objects;
CREATE POLICY "Users can update own attachments"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'task-attachments'
        AND owner = auth.uid()
    );

-- Los usuarios pueden eliminar sus propios archivos
DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
CREATE POLICY "Users can delete own attachments"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'task-attachments'
        AND owner = auth.uid()
    );

-- =====================================================
-- FIN DEL SCRIPT DE POLÍTICAS DE STORAGE
-- =====================================================
