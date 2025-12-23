import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/stores/uiStore';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  DollarSign,
  Settings,
  LogOut,
  X,
  Building2,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const navigation = [
    {
      name: 'Mis Tareas',
      href: '/tasks',
      icon: CheckSquare,
      roles: ['pm', 'dev'],
    },
    {
      name: 'Finanzas',
      href: '/finances',
      icon: DollarSign,
      roles: ['admin', 'advisor'],
    },
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin'], // Solo admin tiene dashboard
    },
    {
      name: 'Clientes',
      href: '/clients',
      icon: Building2,
      roles: ['pm'],
    },
    {
      name: 'Proyectos',
      href: '/projects',
      icon: FolderKanban,
      roles: ['admin', 'pm', 'dev', 'advisor'],
    },
    {
      name: 'Usuarios',
      href: '/users',
      icon: Users,
      roles: ['admin'],
    },
    {
      name: 'Reportes',
      href: '/reports',
      icon: BarChart3,
      roles: ['admin'],
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const filteredNav = navigation.filter((item) => item.roles.includes(user.role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-white text-zinc-900 border-r border-zinc-200 transform transition-all duration-300 ease-in-out lg:translate-x-0',
          sidebarCollapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "flex items-center border-b border-zinc-200 p-4",
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          )}>
            {!sidebarCollapsed && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">N</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-zinc-900">NexusPM</h2>
                    <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-zinc-500 hover:text-zinc-900 cursor-pointer h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
            {sidebarCollapsed && (
              <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                <span className="text-white font-bold">N</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 overflow-y-auto bg-zinc-50",
            sidebarCollapsed ? 'p-2 space-y-1' : 'p-3 space-y-0.5'
          )}>
            {filteredNav.map((item) => {
              const Icon = item.icon;
              // Considerar tanto /tasks como /my-tasks como activos para "Mis Tareas"
              const isActive = item.href === '/tasks' 
                ? (location.pathname === '/tasks' || location.pathname === '/my-tasks' || location.pathname.startsWith('/my-tasks/'))
                : location.pathname === item.href;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center rounded-lg transition-colors',
                    sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-zinc-900 text-white font-medium'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className={cn(
            "border-t border-zinc-200",
            sidebarCollapsed ? 'p-2' : 'p-4'
          )}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                  <span className="font-semibold text-zinc-900 text-sm">
                    {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-zinc-900 text-sm">{user.full_name}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className={cn(
                "w-full flex items-center rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 transition-colors cursor-pointer",
                sidebarCollapsed ? 'justify-center p-2.5' : 'justify-center gap-2 px-3 py-2'
              )}
              title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}