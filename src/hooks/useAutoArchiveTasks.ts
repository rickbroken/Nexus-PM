import { useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

/**
 * Hook para ejecutar auto-archivo de tareas cada hora
 * Solo se ejecuta una vez cuando se monta el componente principal
 */
export function useAutoArchiveTasks() {
  useEffect(() => {
    const runAutoArchive = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-17d656ff/tasks/auto-archive`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();
        
        if (result.success && result.archivedCount > 0) {
          console.log(`[AutoArchive] ${result.archivedCount} tareas archivadas automáticamente`);
        }
      } catch (error) {
        console.error('[AutoArchive] Error ejecutando auto-archivo:', error);
      }
    };

    // Ejecutar inmediatamente al montar
    runAutoArchive();

    // Ejecutar cada hora (3600000 ms)
    const intervalId = setInterval(runAutoArchive, 3600000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId);
  }, []);
}
