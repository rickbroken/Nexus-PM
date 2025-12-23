import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { RecurringChargesNotifier } from '../finances/RecurringChargesNotifier';

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background transition-colors">
      <Sidebar />
      
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
      )}>
        <Header />
        
        <main className="p-4 lg:px-8 lg:py-2">
          <Outlet />
        </main>
      </div>

      {/* Notificador de cobros recurrentes - componente invisible */}
      <RecurringChargesNotifier />
    </div>
  );
}