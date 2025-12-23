import { useState } from 'react';
import { Project } from '../../../lib/supabase';
import { ProjectsList } from './ProjectsList';
import { ProjectForm } from './ProjectForm';
import { useProjectsRealtime } from '../../../hooks/useRealtime';
import { useAuth } from '@/contexts/AuthContext';

export function ProjectsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { user } = useAuth();

  // Enable realtime updates
  useProjectsRealtime();

  const isDeveloper = user?.role === 'dev';
  const isAdvisor = user?.role === 'advisor';
  const isReadOnly = isDeveloper || isAdvisor;

  const handleCreate = () => {
    if (isReadOnly) return; // Developers y advisors no pueden crear
    setSelectedProject(null);
    setFormOpen(true);
  };

  const handleEdit = (project: Project) => {
    if (isReadOnly) return; // Developers y advisors no pueden editar
    setSelectedProject(project);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setSelectedProject(null);
  };

  return (
    <>
      <ProjectsList onCreateClick={handleCreate} onEditClick={handleEdit} />
      {!isReadOnly && (
        <ProjectForm open={formOpen} onClose={handleClose} project={selectedProject} />
      )}
    </>
  );
}