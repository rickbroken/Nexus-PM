# Nexus-PM Agent MCP Contract

## Objetivo
Preparar el contrato técnico de las futuras tools MCP reales sobre la capa interna `src/lib/agent-api/`, sin implementar todavía servidor MCP, SDK MCP, backend nuevo ni integraciones externas.

## Estado de esta fase
- Contrato preparado.
- Handlers internos implementados.
- Sin servidor MCP real.
- Sin backend nuevo.
- Respetando RLS con `AgentApiContext`.

## nexus_get_daily_brief
- Propósito: generar un resumen operativo diario del usuario autenticado.
- Input: `{}`.
- Output: `AgentBriefData` con tareas pendientes/vencidas, recordatorios próximos, finanzas visibles por rol y acciones fallidas recientes.
- Tablas involucradas: `tasks`, `reminders`, `payments`, `recurring_charges`, `agent_actions`, `users_profiles`, `projects`.
- Permisos/RLS: lectura según rol autenticado; finanzas solo donde RLS lo permita.
- Función `agent-api` usada: `getDailyBrief(context)`.
- Estado: contrato preparado, no servidor MCP real.

## nexus_get_pending_tasks
- Propósito: listar tareas pendientes visibles para el usuario autenticado.
- Input: `{ limit?: number }` con límite máximo de 5.
- Output: lista de tareas con `id`, `title`, `status`, `priority`, `due_date`, proyecto y asignado cuando aplique.
- Tablas involucradas: `tasks`, `users_profiles`, `projects`.
- Permisos/RLS: lectura de tareas según rol autenticado.
- Función `agent-api` usada: `getPendingTasks(context, { limit })`.
- Estado: contrato preparado, no servidor MCP real.

## nexus_create_reminder
- Propósito: crear un recordatorio interno.
- Input: `{ title, description?, remind_at, project_id?, task_id? }`.
- Output: recordatorio creado con `id`, `title`, `project_id`, `task_id`, `remind_at`, `source`, `status`.
- Tablas involucradas: `reminders`, `agent_actions`.
- Permisos/RLS: inserción solo para el propio usuario autenticado.
- Función `agent-api` usada: `createReminder(context, input, audit)`.
- Estado: contrato preparado, no servidor MCP real.

## nexus_complete_reminder
- Propósito: marcar un recordatorio como completado.
- Input: `{ reminder_id }`.
- Output: resultado mínimo con `id` del recordatorio actualizado.
- Tablas involucradas: `reminders`, `agent_actions`.
- Permisos/RLS: actualización sobre recordatorios visibles/propios según políticas vigentes.
- Función `agent-api` usada: `completeReminder(context, input, audit)`.
- Estado: contrato preparado, no servidor MCP real.

## nexus_cancel_reminder
- Propósito: cancelar un recordatorio sin borrarlo.
- Input: `{ reminder_id }`.
- Output: resultado mínimo con `id` del recordatorio actualizado.
- Tablas involucradas: `reminders`, `agent_actions`.
- Permisos/RLS: actualización sobre recordatorios visibles/propios según políticas vigentes.
- Función `agent-api` usada: `cancelReminder(context, input, audit)`.
- Estado: contrato preparado, no servidor MCP real.

## nexus_postpone_reminder
- Propósito: mover un recordatorio pendiente a una nueva fecha.
- Input: `{ reminder_id, remind_at }`.
- Output: resultado mínimo con `id` del recordatorio actualizado.
- Tablas involucradas: `reminders`, `agent_actions`.
- Permisos/RLS: actualización sobre recordatorios visibles/propios según políticas vigentes.
- Función `agent-api` usada: `postponeReminder(context, input, audit)`.
- Estado: contrato preparado, no servidor MCP real.

## nexus_create_task
- Propósito: crear una tarea interna asociada a un proyecto visible.
- Input: `{ project_id, title, description?, priority? }`.
- Output: tarea creada con `id`, `project_id`, `title`, `status`, `priority`, `review_status`.
- Tablas involucradas: `tasks`, `agent_actions`.
- Permisos/RLS: inserción de tareas según reglas vigentes para el usuario autenticado.
- Función `agent-api` usada: `createTask(context, input, audit)`.
- Estado: contrato preparado, no servidor MCP real.

## nexus_update_task_status
- Propósito: actualizar el estado operativo de una tarea.
- Input: `{ task_id, status, review_status? }`.
- Output: tarea actualizada con `id`, `project_id`, `title`, `status`, `priority`, `review_status`.
- Tablas involucradas: `tasks`, `agent_actions`.
- Permisos/RLS: actualización de tareas según reglas vigentes para el usuario autenticado.
- Función `agent-api` usada: `updateTaskStatus(context, input, audit)`.
- Estado: contrato preparado, no servidor MCP real.

## Fuera de alcance en esta fase
- Servidor MCP real.
- SDK MCP.
- OpenAI API o IA externa.
- Google Calendar, Gmail, GitHub.
- Jobs automáticos.
- Service role.
- Tablas nuevas.
- Backend nuevo.
