import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '../ui/loading-spinner';

export function RoleBasedRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redireccionamiento según rol
  let redirectPath = '/dashboard'; // Por defecto para admin
  
  if (user.role === 'dev' || user.role === 'pm') {
    redirectPath = '/tasks';
  } else if (user.role === 'advisor') {
    redirectPath = '/finances';
  }
  
  return <Navigate to={redirectPath} replace />;
}