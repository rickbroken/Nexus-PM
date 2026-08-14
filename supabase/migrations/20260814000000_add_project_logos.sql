-- =====================================================
-- NexusPM - Project Logos
-- =====================================================
-- Agrega soporte para logos cuadrados de proyectos en Supabase Storage.
-- =====================================================

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS logo_url TEXT;

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

DROP POLICY IF EXISTS "Authenticated users can upload project logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload project logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'project-logos');

DROP POLICY IF EXISTS "Public can view project logos" ON storage.objects;
CREATE POLICY "Public can view project logos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'project-logos');

DROP POLICY IF EXISTS "Authenticated users can update project logos" ON storage.objects;
CREATE POLICY "Authenticated users can update project logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'project-logos')
    WITH CHECK (bucket_id = 'project-logos');

DROP POLICY IF EXISTS "Authenticated users can delete project logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete project logos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'project-logos');
