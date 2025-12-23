-- =====================================================
-- NexusPM - Database Setup Script 02: Storage Buckets
-- =====================================================
-- Este script configura los buckets de Supabase Storage
-- para almacenar archivos adjuntos de tareas
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
-- FIN DEL SCRIPT DE STORAGE
-- =====================================================
-- NOTA: Las políticas RLS para storage se configuran
-- en el script 04_setup_storage_policies.sql
-- =====================================================
