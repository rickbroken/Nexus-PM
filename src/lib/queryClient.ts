import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton del QueryClient para acceso global
 * Usado principalmente para invalidar el caché al hacer logout
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});
