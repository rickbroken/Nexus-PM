# Nexus-PM MCP Contract

## Estado actual
- El MCP controla Supabase directamente desde `mcp-server` usando `SUPABASE_SERVICE_ROLE_KEY`.
- El frontend `/agent` es solo lectura y funciona como panel de monitoreo/auditoría.
- La auditoría obligatoria se registra en `agent_actions`.

## Tools expuestas

### `nexus_db_select`
- Propósito: leer filas de una tabla permitida.
- Input: `{ table, columns?, filters?, orderBy?, limit? }`
- Output: `{ table, count, rows }`
- Tablas involucradas: cualquier tabla en `ALLOWED_TABLES`.
- Permisos/seguridad: solo allowlist; filtros por igualdad exacta; `limit` acotado.
- Función backend: `mcp-server/src/services/database.service.ts -> selectRows`
- Estado: operativo.

### `nexus_db_insert`
- Propósito: insertar filas en una tabla permitida.
- Input: `{ table, data }`
- Output: `{ table, count, rows }`
- Tablas involucradas: cualquier tabla en `ALLOWED_TABLES`, excepto `agent_actions`.
- Permisos/seguridad: sanea `user_id`, bloquea suplantación de usuario y tablas protegidas.
- Función backend: `mcp-server/src/services/database.service.ts -> insertRow`
- Estado: operativo.

### `nexus_db_update`
- Propósito: actualizar filas con filtros obligatorios.
- Input: `{ table, filters, data }`
- Output: `{ table, count, rows }`
- Tablas involucradas: cualquier tabla en `ALLOWED_TABLES`, excepto `agent_actions`.
- Permisos/seguridad: rechaza updates sin filtros y cambios de `user_id` hacia otro usuario.
- Función backend: `mcp-server/src/services/database.service.ts -> updateRows`
- Estado: operativo.

### `nexus_db_delete`
- Propósito: eliminar filas solo con confirmación explícita.
- Input: `{ table, filters, confirm }`
- Output: `{ table, count, rows }`
- Tablas involucradas: tablas permitidas no críticas.
- Permisos/seguridad: exige `confirm === true`, exige filtros y bloquea tablas protegidas.
- Función backend: `mcp-server/src/services/database.service.ts -> deleteRows`
- Estado: operativo y protegido.

### `nexus_db_rpc`
- Propósito: ejecutar RPCs permitidas explícitamente.
- Input: `{ functionName, args? }`
- Output: `{ functionName, data }`
- Tablas involucradas: depende de la RPC.
- Permisos/seguridad: solo allowlist `ALLOWED_RPCS`.
- Función backend: `mcp-server/src/services/database.service.ts -> executeRpc`
- Estado: operativo; sin RPCs habilitadas por defecto.

## Modelo de seguridad
- `ALLOWED_TABLES = ['projects', 'tasks', 'clients', 'payments', 'recurring_charges', 'reminders', 'task_comments', 'project_members', 'notifications']`
- `PROTECTED_TABLES = ['users_profiles', 'agent_actions', 'auth.users']`
- `ALLOWED_RPCS = []` por defecto.
- `agent_actions` no acepta inserción desde tools genéricas; solo desde auditoría interna.
- No se imprimen secretos ni stack traces.

## Auditoría obligatoria
- `user_id = NEXUS_MCP_ALLOWED_USER_ID`
- `action_type = nombre completo de la tool`
- `entity_type = table` o `rpc`
- `input_text = mcp:<tool_name>`
- `status = success | failed`
- `result = resumen seguro`
- `error_message` cuando aplica
