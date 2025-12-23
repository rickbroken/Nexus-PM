import { useMemo } from 'react';
import { Task } from '../../../lib/supabase';
import { isDateOverdue } from '../../utils/dateHelpers';
import { useTasks } from '../../../hooks/useTasks';

export function TasksStats() {
  const { data: tasks } = useTasks(); // Remover isLoading

  const stats = useMemo(() => {
    if (!tasks) return null;

    // Agrupar por asignado
    const byAssignee = tasks.reduce((acc, task) => {
      const assigneeId = task.assigned_to || 'unassigned';
      if (!acc[assigneeId]) {
        acc[assigneeId] = {
          assignee: task.assignee || null,
          total: 0,
          todo: 0,
          in_progress: 0,
          review: 0,
          done: 0,
          overdue: 0,
        };
      }
      acc[assigneeId].total++;
      acc[assigneeId][task.status]++;
      
      // Verificar si está vencida
      if (isDateOverdue(task.due_date) && task.status !== 'done') {
        acc[assigneeId].overdue++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return {
      total: tasks.length,
      byStatus: {
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length,
      },
      byAssignee: Object.entries(byAssignee).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      })),
      unassigned: tasks.filter(t => !t.assigned_to).length,
      overdue: tasks.filter(t => isDateOverdue(t.due_date) && t.status !== 'done').length,
    };
  }, [tasks]);

  if (!stats) {
    return null;
  }

  return null;
}