import { useAuth } from '@/contexts/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Navigate } from 'react-router-dom';

export function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'pm':
      // Product Managers ya no tienen dashboard, redirigir a Mis Tareas
      return <Navigate to="/tasks" replace />;
    case 'dev':
      // Developers ya no tienen dashboard, redirigir a Mis Tareas
      return <Navigate to="/tasks" replace />;
    case 'advisor':
      // Advisors ya no tienen dashboard, redirigir a Finanzas
      return <Navigate to="/finances" replace />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Rol no reconocido</h1>
            <p className="text-zinc-600">Tu rol ({user.role}) no está configurado correctamente</p>
          </div>
        </div>
      );
  }
}
