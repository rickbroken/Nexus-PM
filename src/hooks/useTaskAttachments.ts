import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  viewed_by_pm: boolean;
  viewed_by_dev: boolean;
  viewed_by_pm_at?: string;
  viewed_by_dev_at?: string;
  uploader?: {
    full_name: string;
    email: string;
  };
}

// Hook para obtener los adjuntos de una tarea con suscripción en tiempo real
export function useTaskAttachments(taskId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_attachments')
        .select(`
          *,
          uploader:users_profiles!task_attachments_uploaded_by_fkey (
            full_name,
            email
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });

  // Suscripción en tiempo real - DESPUÉS del useQuery
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-attachments-${taskId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          // Invalidar y refrescar cuando hay cambios
          queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
          queryClient.refetchQueries({ queryKey: ['task-attachments', taskId] });
        }
      )
      .subscribe();

    // Cleanup: desuscribirse cuando el componente se desmonta o taskId cambia
    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  return query;
}

// Hook para subir un archivo
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      file,
      userId,
      userRole,
    }: {
      taskId: string;
      file: File;
      userId: string;
      userRole: string;
    }) => {
      // 1. Validar tamaño del archivo (10MB máximo)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('El archivo es demasiado grande. Máximo 10MB.');
      }

      // 2. Generar nombre único para el archivo
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${timestamp}-${randomString}.${fileExt}`;

      // 3. Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 4. Guardar metadata en la base de datos
      const { data, error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: userId,
          // Auto-marcar como visto por quien lo sube
          viewed_by_pm: userRole === 'pm',
          viewed_by_dev: userRole === 'dev',
        })
        .select(`
          *,
          uploader:users_profiles!task_attachments_uploaded_by_fkey (
            full_name,
            email
          )
        `)
        .single();

      if (dbError) {
        // Si falla la DB, eliminar el archivo del storage
        await supabase.storage.from('task-attachments').remove([fileName]);
        throw dbError;
      }

      // 5. Actualizar flags de adjuntos nuevos en la tarea
      const updates: any = {
        last_attachment_by: userId,
        last_attachment_at: new Date().toISOString(),
      };

      // Si es dev quien sube, marcar como nuevo para PM
      if (userRole === 'dev') {
        updates.has_new_attachments_for_pm = true;
      }
      // Si es PM quien sube, marcar como nuevo para dev
      else if (userRole === 'pm') {
        updates.has_new_attachments_for_dev = true;
      }

      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (taskUpdateError) {
        console.error('Error actualizando flags de tarea:', taskUpdateError);
        // No fallar la subida por esto
      }

      return data as TaskAttachment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Archivo subido correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al subir el archivo');
    },
  });
}

// Hook para descargar un archivo
export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async (attachment: TaskAttachment) => {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Crear URL temporal y descargar
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    },
    onError: () => {
      toast.error('Error al descargar el archivo');
    },
  });
}

// Hook para obtener URL firmada (signed URL) para preview
export function useGetAttachmentUrl() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(filePath, 3600); // 1 hora de validez

      if (error) throw error;
      return data.signedUrl;
    },
  });
}

// Hook para eliminar un archivo
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachment: TaskAttachment) => {
      // 1. Eliminar de la base de datos
      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      // 2. Eliminar del storage
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Error al eliminar archivo del storage:', storageError);
        // No lanzar error aquí, el registro ya fue eliminado de la DB
      }

      return attachment;
    },
    onSuccess: (attachment) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', attachment.task_id] });
      toast.success('Archivo eliminado correctamente');
    },
    onError: () => {
      toast.error('Error al eliminar el archivo');
    },
  });
}

// Utilidad para formatear tamaño de archivo
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Utilidad para obtener icono según tipo de archivo
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('compressed')) return '📦';
  if (fileType.includes('text')) return '📃';
  return '📎';
}

// Utilidad para verificar si es imagen
export function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/');
}

// Hook para marcar un adjunto como visto
export function useMarkAttachmentAsViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      taskId,
      userRole,
    }: {
      attachmentId: string;
      taskId: string;
      userRole: string;
    }) => {
      const updates: any = {};
      
      if (userRole === 'pm') {
        updates.viewed_by_pm = true;
        updates.viewed_by_pm_at = new Date().toISOString();
      } else if (userRole === 'dev') {
        updates.viewed_by_dev = true;
        updates.viewed_by_dev_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('task_attachments')
        .update(updates)
        .eq('id', attachmentId);

      if (error) throw error;

      return { attachmentId, taskId };
    },
    onSuccess: (data) => {
      // Invalidar queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['task-attachments', data.taskId] });
    },
    onError: (error: Error) => {
      console.error('Error marcando adjunto como visto:', error);
    },
  });
}