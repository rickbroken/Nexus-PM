import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTaskComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useMarkCommentsAsRead,
  canEditComment,
  getRelativeTime,
  TaskComment,
} from '@/hooks/useTaskComments';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { MessageSquare, Send, Edit2, Trash2, Check, CheckCheck, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { useViewingTaskStore } from '@/stores/useViewingTaskStore';

interface TaskCommentsProps {
  taskId: string;
  taskAssignedTo?: string;
  taskCreatedBy?: string;
}

export function TaskComments({ taskId, taskAssignedTo, taskCreatedBy }: TaskCommentsProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const markedAsReadRef = useRef<Set<string>>(new Set()); // Rastrear comentarios ya marcados

  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const markAsRead = useMarkCommentsAsRead();
  const { setViewingTask } = useViewingTaskStore();

  // Informar que estamos viendo esta tarea (para suprimir notificaciones)
  useEffect(() => {
    setViewingTask(taskId);
    
    // Cleanup: cuando se desmonta o cambia la tarea, limpiar
    return () => {
      setViewingTask(null);
    };
  }, [taskId, setViewingTask]);

  // Auto-scroll al final cuando hay nuevos comentarios
  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length]);

  // Marcar comentarios no leídos como leídos (solo una vez por comentario)
  useEffect(() => {
    if (!user || comments.length === 0) return;

    const unreadComments = comments.filter(
      comment => {
        const isNotMine = comment.user_id !== user.id;
        // Verificar si el comentario ya fue leído por el usuario según su rol
        const notRead = !comment.read_by?.includes(user.id);
        const notYetMarked = !markedAsReadRef.current.has(comment.id);
        return isNotMine && notRead && notYetMarked;
      }
    );

    if (unreadComments.length > 0) {
      const unreadIds = unreadComments.map(c => c.id);
      
      // Agregar a la lista de marcados ANTES de la mutación para evitar duplicados
      unreadIds.forEach(id => markedAsReadRef.current.add(id));
      
      markAsRead.mutate({
        commentIds: unreadIds,
        taskId,
        userRole: user.role,
      });
    }
  }, [comments, user?.id, user?.role, taskId, markAsRead]);

  // Limpiar el ref cuando se cierra el modal (cuando taskId cambia)
  useEffect(() => {
    markedAsReadRef.current.clear();
  }, [taskId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    await createComment.mutateAsync({
      taskId,
      content: newComment,
      userId: user.id,
      userRole: user.role,
    });

    setNewComment('');
    textareaRef.current?.focus();
  };

  const handleEdit = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!user || !editingContent.trim()) return;

    await updateComment.mutateAsync({
      commentId,
      taskId,
      content: editingContent,
      userId: user.id,
    });

    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleDelete = async (comment: TaskComment) => {
    if (!user) return;

    const result = await Swal.fire({
      title: '¿Eliminar comentario?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      await deleteComment.mutateAsync({
        commentId: comment.id,
        taskId,
        userId: user.id,
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderReadStatus = (comment: TaskComment) => {
    if (!user) return null;
    
    // Solo mostrar chulitos para comentarios del usuario actual
    if (comment.user_id !== user.id) return null;

    // Verificar si alguien más ha leído el comentario (según el rol del usuario autor)
    let hasBeenRead = false;
    
    if (user.role === 'pm') {
      // Si soy PM, verificar si el Dev lo leyó
      hasBeenRead = comment.read_by_dev;
    } else if (user.role === 'dev') {
      // Si soy Dev, verificar si el PM lo leyó
      hasBeenRead = comment.read_by_pm;
    }

    return (
      <>
        {hasBeenRead ? (
          <CheckCheck className="h-3 w-3 text-blue-500" title="Leído" />
        ) : (
          <Check className="h-3 w-3 text-gray-400" title="Enviado" />
        )}
      </>
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'pm':
        return 'bg-blue-100 text-blue-800';
      case 'dev':
        return 'bg-green-100 text-green-800';
      case 'advisor':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'pm':
        return 'PM';
      case 'dev':
        return 'Dev';
      case 'advisor':
        return 'Advisor';
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Comentarios</h3>
        </div>
        <p className="text-sm text-gray-500">Cargando comentarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-[rgba(0,0,0,0.1)] px-[10px] py-[5px] rounded-[10px]">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-700">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">Comentarios</h3>
        {comments.length > 0 && (
          <span className="text-sm text-gray-500">({comments.length})</span>
        )}
      </div>

      {/* Lista de comentarios */}
      <div className="space-y-0 max-h-96 overflow-y-auto pr-2">{/* Cambiado space-y-4 a space-y-0 para control manual */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay comentarios aún</p>
            <p className="text-xs">Sé el primero en comentar</p>
          </div>
        ) : (
          comments.map((comment, index) => {
            const isOwn = user?.id === comment.user_id;
            const isEditing = editingCommentId === comment.id;
            const canEdit = isOwn && canEditComment(comment.created_at) && !comment.deleted_at;
            const isDeleted = comment.deleted_at !== null && comment.deleted_at !== undefined;
            
            // Verificar si el mensaje anterior es del mismo autor
            const previousComment = index > 0 ? comments[index - 1] : null;
            const isFirstInGroup = !previousComment || previousComment.user_id !== comment.user_id;
            const isLastInGroup = index === comments.length - 1 || comments[index + 1]?.user_id !== comment.user_id;

            return (
              <div
                key={comment.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} ${!isFirstInGroup ? 'mt-1' : 'mt-4'}`}
              >
                {/* Avatar - solo mostrar en el primer mensaje del grupo */}
                {isFirstInGroup ? (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={getRoleColor(comment.author.role)}>
                      {getInitials(comment.author.full_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 flex-shrink-0" /> // Espacio vacío para mantener alineación
                )}

                {/* Contenido del comentario */}
                <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                  {/* Nombre y rol - solo mostrar en el primer mensaje del grupo */}
                  {isFirstInGroup && (
                    <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author.full_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(comment.author.role)}`}>
                        {getRoleLabel(comment.author.role)}
                      </span>
                    </div>
                  )}

                  {/* Burbuja de mensaje */}
                  <div
                    className={`group inline-block max-w-[85%] rounded-2xl px-4 py-1 ${
                      isOwn
                        ? 'bg-[#DCF8C6] text-gray-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className={`min-h-[60px] ${isOwn ? 'bg-[#d4f1bc] text-gray-900 border-green-300' : ''}`}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(comment.id)}
                            disabled={!editingContent.trim()}
                            className="h-7"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="h-7"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {isDeleted ? (
                          <p className="text-sm italic opacity-60">
                            Este mensaje ha sido eliminado
                          </p>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {comment.content}
                          </p>
                        )}
                        
                        {/* Contenedor con posición relativa para superponer timestamp y botones */}
                        <div className="relative mt-1">
                          {/* Hora y metadata dentro de la burbuja - se oculta con hover si es propio y puede editar */}
                          <div className={`flex items-center gap-2 text-xs ${isOwn ? 'text-gray-500 justify-end' : 'text-gray-500'} ${
                            isOwn && canEdit && !comment.deleted_at ? 'group-hover:invisible' : ''
                          }`}>
                            <span className="not-italic">{getRelativeTime(comment.created_at)}</span>
                            {comment.is_edited && !comment.deleted_at && <span className="italic">(editado)</span>}
                            {!comment.deleted_at && renderReadStatus(comment)}
                          </div>

                          {/* Botones de acción - aparecen con hover en la misma posición que el timestamp */}
                          {isOwn && canEdit && !comment.deleted_at && (
                            <div className={`absolute inset-0 invisible group-hover:visible flex items-center gap-1 ${isOwn ? 'justify-end' : ''}`}>
                              <button
                                onClick={() => handleEdit(comment)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-3 w-3 text-gray-500" />
                              </button>
                              <button
                                onClick={() => handleDelete(comment)}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                                title="Eliminar (disponible 5 min)"
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Formulario para nuevo comentario */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              // Enter sin Shift envía el mensaje
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newComment.trim() && !createComment.isPending) {
                  handleSubmit(e);
                }
              }
              // Shift + Enter agrega nueva línea (comportamiento por defecto)
            }}
            placeholder="Escribe un comentario..."
            className="min-h-[40px] max-h-[120px] resize-none"
            disabled={createComment.isPending}
            rows={1}
          />
        </div>
        <Button
          type="submit"
          disabled={!newComment.trim() || createComment.isPending}
          size="icon"
          className="h-10 w-30 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
          Enviar
        </Button>
      </form>
    </div>
  );
}