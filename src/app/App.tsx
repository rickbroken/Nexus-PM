import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import { AuthProvider } from '../contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ProjectsPage } from './components/projects/ProjectsPage';
import { TasksPage } from './components/tasks/TasksPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ClientsPage } from './components/clients/ClientsPage';
import { UsersPage } from './components/users/UsersPage';
import { FinancesPage } from './components/finances/FinancesPage';
import { NotificationsPanel } from './components/notifications/NotificationsPanel';
import { useAutoArchiveTasks } from '../hooks/useAutoArchiveTasks';
import 'sweetalert2/dist/sweetalert2.min.css';
import { queryClient } from '../lib/queryClient';

function App() {
  // Auto-archivar tareas completadas después de 1 día
  useAutoArchiveTasks();

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <DndProvider backend={HTML5Backend}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/projects" />} />
                <Route path="dashboard" element={<ProjectsPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="tasks/:taskId" element={<TasksPage />} />
                <Route path="my-tasks" element={<TasksPage />} />
                <Route path="my-tasks/:taskId" element={<TasksPage />} />
                <Route path="finances" element={<FinancesPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="notifications" element={<NotificationsPanel />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<div>404 - Página no encontrada</div>} />
            </Routes>
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </DndProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;