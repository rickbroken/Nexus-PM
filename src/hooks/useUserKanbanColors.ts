import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useKanbanColors } from './useKanbanColors';
import { useKanbanColorsStore } from '../stores/kanbanColorsStore';

export interface UserKanbanColors {
  dev?: {
    todo?: string;
    in_progress?: string;
    review?: string;
  };
  pm?: {
    todo?: string;
    review?: string;
    done?: string;
  };
}

export function useUserKanbanColors() {
  const { user } = useAuth();
  const { colors: adminColors } = useKanbanColors();
  
  // Usar el store de Zustand en lugar de useState local
  const { userColors, initializeForUser, setColorForStatus: setColorInStore, resetColors: resetColorsInStore } = useKanbanColorsStore();

  // Inicializar colores del usuario cuando cambia el usuario
  useEffect(() => {
    if (user?.id) {
      initializeForUser(user.id);
    }
  }, [user?.id]); // Removemos initializeForUser de las dependencias para evitar loops

  // Combinar colores del admin con colores personalizados del usuario
  const getColorForStatus = (role: 'dev' | 'pm', status: string): string => {
    // Primero intentar obtener el color personalizado del usuario
    const userColor = userColors[role]?.[status as keyof typeof userColors[typeof role]];
    if (userColor) {
      return userColor;
    }

    // Si no hay color personalizado, usar el color del admin
    return adminColors[role][status as keyof typeof adminColors[typeof role]] || 'bg-gray-100';
  };

  // Guardar color personalizado para un estado específico
  const setColorForStatus = (role: 'dev' | 'pm', status: string, color: string) => {
    if (!user?.id) return;
    setColorInStore(user.id, role, status, color);
  };

  // Resetear colores personalizados a los del admin
  const resetColors = () => {
    if (!user?.id) return;
    resetColorsInStore(user.id);
  };

  // Verificar si un estado tiene color personalizado
  const hasCustomColor = (role: 'dev' | 'pm', status: string): boolean => {
    return !!userColors[role]?.[status as keyof typeof userColors[typeof role]];
  };

  return {
    getColorForStatus,
    setColorForStatus,
    resetColors,
    hasCustomColor,
    adminColors,
    userColors, // Agregar userColors para que los componentes puedan detectar cambios
  };
}