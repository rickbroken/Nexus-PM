import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTaskAttachments,
  useUploadAttachment,
  useDownloadAttachment,
  useDeleteAttachment,
  useGetAttachmentUrl,
  useMarkAttachmentAsViewed,
  formatFileSize,
  getFileIcon,
  isImageFile,
  TaskAttachment,
} from '@/hooks/useTaskAttachments';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { 
  Paperclip, 
  Upload, 
  Download, 
  Trash2, 
  Eye,
  X,
  Loader2,
  File,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface TaskAttachmentsProps {
  taskId: string;
  task?: any; // Para acceder a los flags de adjuntos nuevos
}

export function TaskAttachments({ taskId, task }: TaskAttachmentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const { data: attachments = [], isLoading } = useTaskAttachments(taskId);
  const uploadMutation = useUploadAttachment();
  const downloadMutation = useDownloadAttachment();
  const deleteMutation = useDeleteAttachment();
  const getUrlMutation = useGetAttachmentUrl();
  const markAttachmentAsViewedMutation = useMarkAttachmentAsViewed();

  // Marcar adjuntos individuales como vistos cuando se VE la sección de archivos adjuntos
  useEffect(() => {
    const markIndividualAttachmentsAsViewed = async () => {
      if (!user || !attachments || attachments.length === 0) {
        return;
      }
      
      if (!['pm', 'dev'].includes(user.role)) {
        return;
      }

      // Filtrar adjuntos que NO han sido vistos por el usuario actual
      // y que NO fueron subidos por él mismo
      const unviewedAttachments = attachments.filter(attachment => {
        const isUploadedByMe = attachment.uploaded_by === user.id;
        
        if (isUploadedByMe) {
          return false; // No marcar los que yo subí
        }

        if (user.role === 'pm') {
          return !attachment.viewed_by_pm; // No visto por PM
        } else if (user.role === 'dev') {
          return !attachment.viewed_by_dev; // No visto por Dev
        }
        return false;
      });

      // Si no hay adjuntos sin ver, no hacer nada
      if (unviewedAttachments.length === 0) {
        return;
      }

      console.log(`[TaskAttachments] Marcando ${unviewedAttachments.length} adjuntos como vistos por ${user.role}`);

      // Marcar cada adjunto no visto
      for (const attachment of unviewedAttachments) {
        try {
          const updates: any = {}; 
          
          if (user.role === 'pm') {
            updates.viewed_by_pm = true;
            updates.viewed_by_pm_at = new Date().toISOString();
          } else if (user.role === 'dev') {
            updates.viewed_by_dev = true;
            updates.viewed_by_dev_at = new Date().toISOString();
          }

          console.log(`[TaskAttachments] Actualizando adjunto ${attachment.id}:`, updates);

          const { error } = await supabase
            .from('task_attachments')
            .update(updates)
            .eq('id', attachment.id);

          if (error) {
            console.error('[TaskAttachments] Error actualizando adjunto:', error);
          } else {
            console.log(`[TaskAttachments] Adjunto ${attachment.id} marcado correctamente`);
          }
        } catch (error) {
          console.error('[TaskAttachments] Error marcando adjunto como visto:', error);
        }
      }

      // Invalidar queries después de marcar todos
      if (unviewedAttachments.length > 0) {
        console.log('[TaskAttachments] Invalidando queries...');
        await queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
        
        // Forzar refetch inmediato para actualizar los datos
        await queryClient.refetchQueries({ queryKey: ['task-attachments', taskId] });
        console.log('[TaskAttachments] Queries actualizadas');
      }
    };

    // Ejecutar después de un pequeño delay para asegurar que el usuario realmente vio la sección
    const timer = setTimeout(() => {
      markIndividualAttachmentsAsViewed();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, user?.id, user?.role, taskId]);

  // Marcar adjuntos como vistos cuando se abre el panel (para limpiar badges del Kanban)
  useEffect(() => {
    const markAttachmentsAsSeen = async () => {
      if (!user || !task) return;

      // Si el PM abre el panel y hay adjuntos nuevos para él
      if (user.role === 'pm' && task.has_new_attachments_for_pm) {
        const { error } = await supabase
          .from('tasks')
          .update({ has_new_attachments_for_pm: false })
          .eq('id', taskId);

        if (error) {
          console.error('Error marcando adjuntos como vistos:', error);
        } else {
          // Invalidar queries para actualizar el Kanban
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      }

      // Si el Dev abre el panel y hay adjuntos nuevos para él
      if (user.role === 'dev' && task.has_new_attachments_for_dev) {
        const { error } = await supabase
          .from('tasks')
          .update({ has_new_attachments_for_dev: false })
          .eq('id', taskId);

        if (error) {
          console.error('Error marcando adjuntos como vistos:', error);
        } else {
          // Invalidar queries para actualizar el Kanban
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      }
    };

    markAttachmentsAsSeen();
  }, [taskId, user, task?.has_new_attachments_for_pm, task?.has_new_attachments_for_dev, queryClient]);

  // Cargar URLs de thumbnails para todas las imágenes
  useEffect(() => {
    const loadThumbnails = async () => {
      const imageAttachments = attachments.filter(att => isImageFile(att.file_type));
      
      for (const attachment of imageAttachments) {
        // Solo cargar si no está ya en el cache
        if (!thumbnailUrls[attachment.id]) {
          try {
            const url = await getUrlMutation.mutateAsync(attachment.file_path);
            setThumbnailUrls(prev => ({ ...prev, [attachment.id]: url }));
          } catch (error) {
            console.error('Error loading thumbnail:', error);
          }
        }
      }
    };

    if (attachments.length > 0) {
      loadThumbnails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  const canUpload = user?.role && ['admin', 'pm', 'dev'].includes(user.role);
  const canDelete = (attachment: TaskAttachment) => {
    return user?.role === 'admin' || 
           user?.role === 'pm' || 
           attachment.uploaded_by === user?.id;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);

    try {
      // Subir archivos secuencialmente
      for (let i = 0; i < files.length; i++) {
        await uploadMutation.mutateAsync({
          taskId,
          file: files[i],
          userId: user.id,
          userRole: user.role,
        });
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (attachment: TaskAttachment) => {
    setDownloadingFileId(attachment.id);
    await downloadMutation.mutateAsync(attachment);
    setDownloadingFileId(null);
    
    // Marcar como visto por el usuario actual
    if (user?.role && ['pm', 'dev'].includes(user.role)) {
      // Verificar si ya está marcado como visto para evitar llamadas innecesarias
      const isAlreadyViewed = 
        (user.role === 'pm' && attachment.viewed_by_pm) ||
        (user.role === 'dev' && attachment.viewed_by_dev);
      
      if (!isAlreadyViewed) {
        markAttachmentAsViewedMutation.mutate({
          attachmentId: attachment.id,
          taskId,
          userRole: user.role,
        });
      }
    }
  };

  const handleDelete = async (attachment: TaskAttachment) => {
    setDeletingFileId(attachment.id);
    const result = await Swal.fire({
      title: '¿Eliminar archivo?',
      text: `Se eliminará "${attachment.file_name}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    });

    if (result.isConfirmed) {
      await deleteMutation.mutateAsync(attachment);
    }
    setDeletingFileId(null);
  };

  const handlePreview = async (attachment: TaskAttachment) => {
    if (!isImageFile(attachment.file_type)) {
      // Si no es imagen, descargar directamente
      await handleDownload(attachment);
      return;
    }

    // Marcar como visto por el usuario actual
    if (user?.role && ['pm', 'dev'].includes(user.role)) {
      const isAlreadyViewed = 
        (user.role === 'pm' && attachment.viewed_by_pm) ||
        (user.role === 'dev' && attachment.viewed_by_dev);
      
      if (!isAlreadyViewed) {
        markAttachmentAsViewedMutation.mutate({
          attachmentId: attachment.id,
          taskId,
          userRole: user.role,
        });
      }
    }

    // Si ya tenemos la URL en cache, usarla directamente
    const cachedUrl = thumbnailUrls[attachment.id];
    if (cachedUrl) {
      setPreviewUrl(cachedUrl);
      setPreviewFileName(attachment.file_name);
      return;
    }

    // Si no está en cache, cargarla con loading
    setIsLoadingPreview(true);
    try {
      const url = await getUrlMutation.mutateAsync(attachment.file_path);
      setPreviewUrl(url);
      setPreviewFileName(attachment.file_name);
      setThumbnailUrls(prev => ({ ...prev, [attachment.id]: url }));
    } catch (error) {
      console.error('Error getting preview URL:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewFileName('');
  };

  // Función helper para determinar qué chulitos mostrar
  const getReadStatus = (attachment: TaskAttachment) => {
    // Solo mostrar chulitos si el usuario actual es quien subió el archivo
    if (!user || attachment.uploaded_by !== user.id) {
      return null;
    }

    // Si es Dev quien subió, mostrar estado de lectura del PM
    if (user.role === 'dev') {
      return {
        isRead: attachment.viewed_by_pm,
        readAt: attachment.viewed_by_pm_at,
      };
    }

    // Si es PM quien subió, mostrar estado de lectura del Dev
    if (user.role === 'pm') {
      return {
        isRead: attachment.viewed_by_dev,
        readAt: attachment.viewed_by_dev_at,
      };
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold">
            Archivos Adjuntos ({attachments.length})
          </h3>
        </div>

        {canUpload && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Subir archivo
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Solo mostrar contenido adicional si hay archivos */}
      {attachments.length > 0 && (
        <>
          <Separator />

          <div className="space-y-2">
            {attachments.map((attachment) => {
              const isImage = isImageFile(attachment.file_type);
              const thumbnailUrl = thumbnailUrls[attachment.id];
              const readStatus = getReadStatus(attachment);
              
              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Thumbnail o icono */}
                    {isImage ? (
                      <div 
                        className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200 border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handlePreview(attachment)}
                        title="Clic para ver en grande"
                      >
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={attachment.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl flex-shrink-0">
                        {getFileIcon(attachment.file_type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" title={attachment.file_name}>
                        {attachment.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(attachment.file_size)}</span>
                        <span>•</span>
                        <span>{attachment.uploader?.full_name || 'Usuario'}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(attachment.created_at), 'dd MMM yyyy, HH:mm', {
                            locale: es,
                          })}
                        </span>
                        
                        {/* Chulitos de lectura tipo WhatsApp */}
                        {readStatus && (
                          <>
                            <span>•</span>
                            <div 
                              className="flex items-center gap-0.5" 
                              title={readStatus.isRead ? `Visto ${readStatus.readAt ? format(new Date(readStatus.readAt), 'dd MMM yyyy, HH:mm', { locale: es }) : ''}` : 'No visto'}
                            >
                              <Check 
                                className={`h-3 w-3 ${readStatus.isRead ? 'text-blue-500' : 'text-gray-400'}`} 
                                strokeWidth={3}
                              />
                              <Check 
                                className={`h-3 w-3 -ml-1.5 ${readStatus.isRead ? 'text-blue-500' : 'text-gray-400'}`} 
                                strokeWidth={3}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Botón de descarga para archivos no imagen */}
                    {!isImage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(attachment)}
                        title="Descargar"
                        className="h-8 w-8"
                        disabled={downloadingFileId === attachment.id}
                      >
                        {downloadingFileId === attachment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {/* Botón de descarga también para imágenes */}
                    {isImage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(attachment)}
                        title="Descargar"
                        className="h-8 w-8"
                        disabled={downloadingFileId === attachment.id}
                      >
                        {downloadingFileId === attachment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {canDelete(attachment) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(attachment)}
                        title="Eliminar"
                        className="h-8 w-8 hover:text-red-600"
                        disabled={deletingFileId === attachment.id}
                      >
                        {deletingFileId === attachment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Información sobre límites */}
          {canUpload && (
            <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
              <p>
                <strong>💡 Tip:</strong> Puedes subir múltiples archivos a la vez.
                Tamaño máximo por archivo: 10MB.
              </p>
            </div>
          )}
        </>
      )}

      {/* Modal de preview para imágenes */}
      <Dialog open={!!previewUrl || isLoadingPreview} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{previewFileName || 'Cargando...'}</DialogTitle>
            </div>
          </DialogHeader>
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">Cargando vista previa...</p>
            </div>
          ) : previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt={previewFileName}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}