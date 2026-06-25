# Nexus-PM Agent MCP Contract

## Objetivo
Definir el contrato futuro de herramientas MCP internas para que Nexus-PM sea la fuente principal de verdad de proyectos, tareas, recordatorios y finanzas, sin depender de integraciones externas.

## nexus_get_projects
- Propósito: listar proyectos visibles para el usuario autenticado.
- Input esperado: `status?`, `client_id?`, `limit?`.
- Output esperado: lista de proyectos con `id`, `name`, `status`, cliente asociado y fechas clave.
- Tablas involucradas: `projects`, `clients`, `project_members`.
- Permisos requeridos: `admin`, `pm`, `dev`, `advisor` según RLS vigente.

## nexus_get_project_by_name
- Propósito: buscar un proyecto exacto o aproximado por nombre.
- Input esperado: `name`, `include_client?`.
- Output esperado: proyecto encontrado o lista corta de coincidencias.
- Tablas involucradas: `projects`, `clients`.
- Permisos requeridos: acceso de lectura al proyecto.

## nexus_get_project_summary
- Propósito: resumir estado operativo y financiero de un proyecto.
- Input esperado: `project_id`.
- Output esperado: metadatos del proyecto, tareas abiertas, pagos, cobros recurrentes y alertas relevantes.
- Tablas involucradas: `projects`, `tasks`, `payments`, `recurring_charges`, `project_finances`.
- Permisos requeridos: lectura del proyecto; finanzas segun rol.

## nexus_get_pending_tasks
- Propósito: listar tareas pendientes o en progreso.
- Input esperado: `project_id?`, `assigned_to?`, `priority?`, `limit?`.
- Output esperado: tareas con estado, prioridad, vencimiento y asignado.
- Tablas involucradas: `tasks`, `users_profiles`, `projects`.
- Permisos requeridos: lectura de tareas segun RLS.

## nexus_create_task
- Propósito: crear una tarea nueva dentro de Nexus-PM.
- Input esperado: `project_id`, `title`, `description?`, `priority?`, `assigned_to?`, `due_date?`, `tags?`.
- Output esperado: tarea creada con `id` y datos expandidos.
- Tablas involucradas: `tasks`.
- Permisos requeridos: `admin`, `pm`, `dev` segun politicas vigentes.

## nexus_update_task_status
- Propósito: actualizar el estado operativo de una tarea.
- Input esperado: `task_id`, `status`, `review_notes?`, `dev_notes?`.
- Output esperado: tarea actualizada.
- Tablas involucradas: `tasks`.
- Permisos requeridos: segun reglas de actualizacion de tareas.

## nexus_add_task_comment
- Propósito: agregar comentario trazable a una tarea.
- Input esperado: `task_id`, `content`.
- Output esperado: comentario creado con autor y timestamps.
- Tablas involucradas: `task_comments`.
- Permisos requeridos: usuario autenticado con acceso a la tarea.

## nexus_create_reminder
- Propósito: crear un recordatorio interno.
- Input esperado: `title`, `description?`, `remind_at`, `project_id?`, `task_id?`, `priority?`, `recurrence_rule?`, `metadata?`.
- Output esperado: recordatorio creado con estado `pending`.
- Tablas involucradas: `reminders`.
- Permisos requeridos: solo para el propio `user_id` autenticado.

## nexus_update_reminder
- Propósito: actualizar datos de un recordatorio existente.
- Input esperado: `reminder_id`, cambios permitidos de contenido, fecha, prioridad o recurrencia.
- Output esperado: recordatorio actualizado.
- Tablas involucradas: `reminders`.
- Permisos requeridos: propietario del recordatorio o `admin`.

## nexus_cancel_reminder
- Propósito: cancelar un recordatorio sin borrarlo.
- Input esperado: `reminder_id`, `reason?`.
- Output esperado: recordatorio con `status = cancelled`, `cancelled_at`, `cancelled_by`.
- Tablas involucradas: `reminders`.
- Permisos requeridos: propietario del recordatorio o `admin`.

## nexus_get_pending_reminders
- Propósito: listar recordatorios activos o proximos.
- Input esperado: `project_id?`, `task_id?`, `from?`, `to?`, `limit?`.
- Output esperado: lista de recordatorios ordenada por `remind_at`.
- Tablas involucradas: `reminders`, `projects`, `tasks`.
- Permisos requeridos: propietario del recordatorio o `admin`.

## nexus_get_upcoming_payments
- Propósito: listar pagos proximos o pendientes.
- Input esperado: `project_id?`, `from?`, `to?`, `limit?`.
- Output esperado: pagos ordenados por fecha con estado y proyecto.
- Tablas involucradas: `payments`, `projects`.
- Permisos requeridos: `admin` o `advisor`.

## nexus_get_overdue_payments
- Propósito: listar pagos vencidos o atrasados.
- Input esperado: `project_id?`, `limit?`.
- Output esperado: pagos con estado, fecha y referencia de proyecto.
- Tablas involucradas: `payments`, `projects`.
- Permisos requeridos: `admin` o `advisor`.

## nexus_get_recurring_charges
- Propósito: consultar cobros o egresos recurrentes.
- Input esperado: `project_id?`, `type?`, `active_only?`.
- Output esperado: lista de cobros recurrentes con proximo vencimiento.
- Tablas involucradas: `recurring_charges`, `projects`.
- Permisos requeridos: `admin` o `advisor`.

## nexus_get_daily_brief
- Propósito: generar un resumen diario operativo para el usuario.
- Input esperado: `date?`, `include_finance?`.
- Output esperado: tareas pendientes, recordatorios proximos, alertas y pagos relevantes del dia.
- Tablas involucradas: `tasks`, `reminders`, `payments`, `recurring_charges`, `notifications`.
- Permisos requeridos: segun RLS del usuario autenticado.

## nexus_log_agent_action
- Propósito: registrar cada accion ejecutada por el agente para auditoria.
- Input esperado: `action_type`, `user_id`, `entity_type?`, `entity_id?`, `project_id?`, `task_id?`, `client_id?`, `payment_id?`, `recurring_charge_id?`, `input_text?`, `result?`, `status`, `error_message?`.
- Output esperado: fila creada en `agent_actions`.
- Tablas involucradas: `agent_actions`.
- Permisos requeridos: usuario autenticado solo para su propio `user_id`; lectura segun rol.
