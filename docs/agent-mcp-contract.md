# Nexus-PM MCP Contract

## Estado actual
- El MCP controla Supabase directamente desde `mcp-server` usando `SUPABASE_SERVICE_ROLE_KEY`.
- El frontend `/agent` es solo lectura y funciona como panel de monitoreo y auditoría.
- La auditoría obligatoria se registra en `agent_actions`.
- La capa MCP ya no está limitada al set inicial de herramientas operativas. Ahora expone control backend amplio sobre esquema, tablas públicas, RPCs públicas, Storage y Auth admin.
- Existe despliegue remoto para el MCP vía `Supabase Edge Functions`, sin dependencia de `localhost` ni `ngrok`.

## Tools expuestas

### `nexus_backend_schema`
- Propósito: descubrir tablas, columnas, funciones `public` y buckets disponibles.
- Input: `{ resource?: 'tables' | 'columns' | 'rpcs' | 'buckets' | 'all', table?: string }`
- Output: `{ resource, tables?, columns?, rpcs?, buckets? }`
- Superficies involucradas: `information_schema.tables`, `information_schema.columns`, `information_schema.routines`, `storage.buckets`.
- Permisos/seguridad: solo lectura; limitado a introspección del backend.
- Función backend: `mcp-server/src/services/schema.service.ts -> getBackendSchema`
- Estado: operativo.

### `nexus_db_select`
- Propósito: leer filas de cualquier tabla del schema `public`.
- Input: `{ table, columns?, filters?, orderBy?, limit? }`
- Output: `{ table, count, rows }`
- Superficies involucradas: tablas `public.*`.
- Permisos/seguridad: solo schema `public`; filtros por igualdad exacta; `limit` acotado; niega lectura genérica de tablas protegidas como `project_credentials`.
- Función backend: `mcp-server/src/services/database.service.ts -> selectRows`
- Estado: operativo.

### `nexus_db_insert`
- Propósito: insertar filas en cualquier tabla del schema `public`.
- Input: `{ table, data }`
- Output: `{ table, count, rows }`
- Superficies involucradas: tablas `public.*`, excepto `agent_actions`.
- Permisos/seguridad: bloquea escritura genérica sobre `agent_actions` y `project_credentials`; columnas actoras (`user_id`, `created_by`, etc.) no aceptan suplantación y se rellenan con `NEXUS_MCP_ALLOWED_USER_ID` cuando aplica.
- Función backend: `mcp-server/src/services/database.service.ts -> insertRow`
- Estado: operativo.

### `nexus_db_update`
- Propósito: actualizar filas en cualquier tabla del schema `public`.
- Input: `{ table, filters, data }`
- Output: `{ table, count, rows }`
- Superficies involucradas: tablas `public.*`, excepto `agent_actions`.
- Permisos/seguridad: rechaza updates sin filtros; bloquea escritura genérica sobre `agent_actions` y `project_credentials`; no permite cambiar columnas actoras a otro usuario.
- Función backend: `mcp-server/src/services/database.service.ts -> updateRows`
- Estado: operativo.

### `nexus_db_delete`
- Propósito: eliminar filas en cualquier tabla del schema `public`.
- Input: `{ table, filters, confirm }`
- Output: `{ table, count, rows }`
- Superficies involucradas: tablas `public.*` no protegidas.
- Permisos/seguridad: exige `confirm === true`; exige filtros; bloquea tablas protegidas como `agent_actions` y `project_credentials`.
- Función backend: `mcp-server/src/services/database.service.ts -> deleteRows`
- Estado: operativo y protegido.

### `nexus_db_rpc`
- Propósito: ejecutar cualquier función RPC del schema `public` que exista y esté expuesta.
- Input: `{ functionName, args? }`
- Output: `{ functionName, data }`
- Superficies involucradas: funciones `public.*`.
- Permisos/seguridad: solo schema `public`; no acepta funciones inexistentes; además exige allowlist explícita en `NEXUS_MCP_ALLOWED_RPCS`.
- Función backend: `mcp-server/src/services/database.service.ts -> executeRpc`
- Estado: operativo.

### `nexus_storage_list_buckets`
- Propósito: listar buckets de Supabase Storage.
- Input: `{}`
- Output: `{ count, buckets }`
- Superficies involucradas: Storage buckets.
- Permisos/seguridad: solo lectura.
- Función backend: `mcp-server/src/services/storage.service.ts -> listStorageBuckets`
- Estado: operativo.

### `nexus_storage_list_objects`
- Propósito: listar objetos dentro de un bucket.
- Input: `{ bucket, prefix?, limit? }`
- Output: `{ bucket, count, objects }`
- Superficies involucradas: objetos de Storage.
- Permisos/seguridad: lectura del bucket indicado.
- Función backend: `mcp-server/src/services/storage.service.ts -> listStorageObjects`
- Estado: operativo.

### `nexus_storage_upload_text`
- Propósito: crear o reemplazar un archivo de texto en Storage.
- Input: `{ bucket, path, content, contentType?, upsert? }`
- Output: `{ bucket, path, contentType }`
- Superficies involucradas: objetos de Storage.
- Permisos/seguridad: backend-only; pensado para contenidos textuales.
- Función backend: `mcp-server/src/services/storage.service.ts -> uploadStorageText`
- Estado: operativo.

### `nexus_storage_delete`
- Propósito: eliminar objetos de Storage.
- Input: `{ bucket, paths, confirm }`
- Output: `{ bucket, deletedCount, paths }`
- Superficies involucradas: objetos de Storage.
- Permisos/seguridad: exige `confirm === true`.
- Función backend: `mcp-server/src/services/storage.service.ts -> deleteStorageObjects`
- Estado: operativo y protegido.

### `nexus_auth_list_users`
- Propósito: listar usuarios de Supabase Auth.
- Input: `{ page?, perPage? }`
- Output: `{ count, users }`
- Superficies involucradas: Supabase Auth admin.
- Permisos/seguridad: backend-only con service role.
- Función backend: `mcp-server/src/services/auth.service.ts -> listAuthUsers`
- Estado: operativo.

### `nexus_auth_get_user`
- Propósito: consultar un usuario específico de Auth.
- Input: `{ userId }`
- Output: `{ user }`
- Superficies involucradas: Supabase Auth admin.
- Permisos/seguridad: backend-only con service role.
- Función backend: `mcp-server/src/services/auth.service.ts -> getAuthUser`
- Estado: operativo.

### `nexus_auth_create_user`
- Propósito: crear usuarios en Supabase Auth.
- Input: `{ email, password?, emailConfirm?, phone?, userMetadata?, appMetadata? }`
- Output: `{ user }`
- Superficies involucradas: Supabase Auth admin.
- Permisos/seguridad: backend-only con service role.
- Función backend: `mcp-server/src/services/auth.service.ts -> createAuthUser`
- Estado: operativo.

### `nexus_auth_update_user`
- Propósito: actualizar usuarios de Supabase Auth.
- Input: `{ userId, email?, password?, phone?, userMetadata?, appMetadata?, banDuration?, emailConfirm? }`
- Output: `{ user }`
- Superficies involucradas: Supabase Auth admin.
- Permisos/seguridad: backend-only con service role.
- Función backend: `mcp-server/src/services/auth.service.ts -> updateAuthUser`
- Estado: operativo.

### `nexus_auth_delete_user`
- Propósito: eliminar usuarios de Supabase Auth.
- Input: `{ userId, confirm, shouldSoftDelete? }`
- Output: `{ userId, deleted }`
- Superficies involucradas: Supabase Auth admin.
- Permisos/seguridad: exige `confirm === true`.
- Función backend: `mcp-server/src/services/auth.service.ts -> deleteAuthUser`
- Estado: operativo y protegido.

## Modelo de seguridad
- `SUPABASE_SERVICE_ROLE_KEY` vive solo en `mcp-server`.
- El transporte HTTP exige `MCP_HTTP_API_KEY` por `Authorization: Bearer ...` o `x-mcp-api-key`.
- Las tools genéricas de base de datos operan solo sobre `public.*`.
- `agent_actions` no acepta escritura genérica; solo desde auditoría interna.
- `project_credentials` queda fuera de las tools genéricas de lectura/escritura.
- Las RPC genéricas quedan cerradas salvo allowlist explícita por `NEXUS_MCP_ALLOWED_RPCS`.
- Las columnas actoras (`user_id`, `created_by`, `added_by`, `uploaded_by`, `deleted_by`, `cancelled_by`) no aceptan suplantación.
- La introspección de esquema se hace contra `information_schema`.
- Las operaciones destructivas requieren confirmación explícita cuando aplica.
- No se imprimen secretos ni stack traces.

## Endpoint remoto
- URL actual: `https://snhjzofsjitlyscyirov.supabase.co/functions/v1/mcp`
- Runtime: `Supabase Edge Functions`
- Auth: API key dedicada para MCP, separada del `anon key`

## Auditoría obligatoria
- `user_id = NEXUS_MCP_ALLOWED_USER_ID`
- `action_type = nombre completo de la tool`
- `entity_type = table`, `rpc`, `schema`, `storage_bucket`, `storage_object` o `auth_user`
- `input_text = mcp:<tool_name>`
- `status = success | failed`
- `result = resumen seguro`
- `error_message` cuando aplica
