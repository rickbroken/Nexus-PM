import type { AgentAction } from './supabase';

const actionTypeLabels: Record<string, string> = {
  create_task: 'Crear tarea',
  update_task_status: 'Actualizar estado de tarea',
  add_task_comment: 'Agregar comentario a tarea',
  create_reminder: 'Crear recordatorio',
  update_reminder: 'Actualizar recordatorio',
  cancel_reminder: 'Cancelar recordatorio',
  get_project_summary: 'Consultar resumen de proyecto',
  get_pending_tasks: 'Consultar tareas pendientes',
  get_upcoming_payments: 'Consultar pagos próximos',
  get_daily_brief: 'Consultar resumen diario',
  nexus_create_task: 'MCP: crear tarea',
  nexus_update_task_status: 'MCP: actualizar estado de tarea',
  nexus_create_reminder: 'MCP: crear recordatorio',
  nexus_complete_reminder: 'MCP: completar recordatorio',
  nexus_cancel_reminder: 'MCP: cancelar recordatorio',
  nexus_postpone_reminder: 'MCP: posponer recordatorio',
  nexus_get_pending_tasks: 'MCP: consultar tareas pendientes',
  nexus_get_daily_brief: 'MCP: consultar resumen diario',
};

const statusLabels: Record<AgentAction['status'], string> = {
  success: 'Exitosa',
  failed: 'Fallida',
  pending: 'Pendiente',
};

function humanizeActionType(actionType: string) {
  return actionType
    .replace(/^nexus_/, 'nexus ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatAgentActionType(actionType: string) {
  return actionTypeLabels[actionType] ?? humanizeActionType(actionType);
}

export function formatAgentActionStatus(status: AgentAction['status']) {
  return statusLabels[status] ?? status;
}
