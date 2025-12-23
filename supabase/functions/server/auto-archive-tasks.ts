/**
 * Función para auto-archivar tareas completadas después de 1 día
 * Esta función debe ser llamada periódicamente (ej: cada hora)
 */

import { supabaseAdmin } from './auth.tsx';

export async function autoArchiveTasks() {
  try {
    // Calcular fecha de hace 1 día
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneDayAgoISO = oneDayAgo.toISOString();

    console.log(`[AutoArchive] Buscando tareas completadas antes de ${oneDayAgoISO}`);

    // Buscar tareas que:
    // 1. Estén en estado 'done'
    // 2. Hayan sido completadas hace más de 1 día
    // 3. No estén ya archivadas
    const { data: tasksToArchive, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('id, title, completed_at')
      .eq('status', 'done')
      .lt('completed_at', oneDayAgoISO)
      .is('archived_at', null);

    if (fetchError) {
      console.error('[AutoArchive] Error buscando tareas:', fetchError);
      return {
        success: false,
        error: fetchError.message,
      };
    }

    if (!tasksToArchive || tasksToArchive.length === 0) {
      console.log('[AutoArchive] No hay tareas para archivar');
      return {
        success: true,
        archivedCount: 0,
        message: 'No hay tareas para archivar',
      };
    }

    console.log(`[AutoArchive] Encontradas ${tasksToArchive.length} tareas para archivar`);

    // Archivar las tareas
    const taskIds = tasksToArchive.map(t => t.id);
    const { data: archivedTasks, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .in('id', taskIds)
      .select('id, title');

    if (updateError) {
      console.error('[AutoArchive] Error archivando tareas:', updateError);
      return {
        success: false,
        error: updateError.message,
      };
    }

    console.log(`[AutoArchive] Archivadas ${archivedTasks?.length || 0} tareas exitosamente`);

    return {
      success: true,
      archivedCount: archivedTasks?.length || 0,
      archivedTasks: archivedTasks?.map(t => ({ id: t.id, title: t.title })) || [],
      message: `${archivedTasks?.length || 0} tareas archivadas exitosamente`,
    };
  } catch (error) {
    console.error('[AutoArchive] Error inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}