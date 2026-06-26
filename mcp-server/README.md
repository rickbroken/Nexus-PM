# Nexus-PM MCP Server

Servidor MCP local para Nexus-PM con dos transportes:

- `http` como modo principal para ChatGPT Apps.
- `stdio` como compatibilidad para pruebas locales y flujos CLI.

Controla Supabase directamente desde backend con `SUPABASE_SERVICE_ROLE_KEY`. El frontend `/agent` queda solo para visualización y auditoría.

## Estado actual

- Mantiene `stdio` para pruebas locales.
- Soporta `http://127.0.0.1:3333/mcp` para desarrollo local.
- Soporta despliegue remoto en Supabase Edge Functions sin `localhost` ni `ngrok`.
- Expone control backend amplio sobre esquema, tablas públicas, RPCs públicas, Storage y Auth admin.
- El service role existe solo dentro de `mcp-server`.

## Variables requeridas

Crear `mcp-server/.env` a partir de `.env.example`:

```env
MCP_TRANSPORT=http
MCP_HTTP_PORT=3333
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_API_KEY=
MCP_ALLOWED_HOSTS=127.0.0.1,localhost,*.ngrok-free.app
MCP_ALLOWED_ORIGINS=https://chatgpt.com,https://chat.openai.com
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXUS_MCP_ALLOWED_USER_ID=
NEXUS_MCP_ALLOWED_ROLE=admin
NEXUS_MCP_ALLOWED_RPCS=
```

## Tools expuestas

- `nexus_backend_schema`
- `nexus_db_select`
- `nexus_db_insert`
- `nexus_db_update`
- `nexus_db_delete`
- `nexus_db_rpc`
- `nexus_storage_list_buckets`
- `nexus_storage_list_objects`
- `nexus_storage_upload_text`
- `nexus_storage_delete`
- `nexus_auth_list_users`
- `nexus_auth_get_user`
- `nexus_auth_create_user`
- `nexus_auth_update_user`
- `nexus_auth_delete_user`

## Reglas de seguridad

- Las tools genéricas de DB operan solo sobre tablas `public.*`.
- `agent_actions` y `project_credentials` están protegidas para escritura genérica; `project_credentials` además no se puede leer por DB genérica.
- El transporte HTTP exige `MCP_HTTP_API_KEY` vía `Authorization: Bearer ...` o `x-mcp-api-key`.
- Las RPC públicas quedan cerradas por defecto y solo se habilitan por `NEXUS_MCP_ALLOWED_RPCS`.
- La introspección usa `information_schema`.
- `nexus_db_delete`, `nexus_storage_delete` y `nexus_auth_delete_user` exigen `confirm=true`.
- Auth admin y Storage se ejecutan solo en backend con service role.
- No se imprimen secretos ni stack traces.

## Arquitectura interna

- `src/db/`: cliente Supabase server-only y contexto fijo desde variables de entorno.
- `src/services/`: auditoría, operaciones genéricas de base de datos, introspección de esquema, Storage y Auth admin.
- `src/tools/`: schemas Zod, definiciones MCP y handlers de todas las tools.

## Uso local

Instalar dependencias:

```bash
cd mcp-server
pnpm install
```

### Desarrollo HTTP

```bash
cd mcp-server
pnpm dev
```

o explícitamente:

```bash
cd mcp-server
pnpm dev:http
```

Endpoint local esperado:

```txt
http://127.0.0.1:3333/mcp
```

### Desarrollo stdio

```bash
cd mcp-server
pnpm dev:stdio
```

### Compilar y ejecutar

```bash
cd mcp-server
pnpm build
pnpm start:http
pnpm start:stdio
```

## Smoke tests

### Smoke stdio

```bash
pnpm build
cd mcp-server
pnpm build
pnpm smoke
```

Valida:

- `nexus_backend_schema`
- `nexus_db_select`
- `nexus_db_insert`
- `nexus_db_update`
- `nexus_db_delete`
- `nexus_auth_list_users`
- `nexus_storage_list_buckets`
- `nexus_storage_upload_text` / `list_objects` / `delete` si existe al menos un bucket
- rechazo protegido de `nexus_db_rpc`
- rechazo de `project_credentials`, `user_id` forjado y tablas protegidas
- auditoría en `agent_actions`

### Smoke HTTP

Prueba el endpoint MCP HTTP real en `/mcp`. Si el servidor no está corriendo, el smoke levanta un proceso hijo local automáticamente.

```bash
pnpm build
cd mcp-server
pnpm build
pnpm smoke:http
```

### Smoke remoto

Prueba una URL MCP ya desplegada en Supabase:

```bash
cd mcp-server
$env:MCP_REMOTE_URL="https://snhjzofsjitlyscyirov.supabase.co/functions/v1/mcp"
$env:MCP_HTTP_API_KEY="..."
pnpm smoke:remote
```

Valida:

- `401` sin API key
- `initialize`
- `tools/list`
- `tools/call` sobre `nexus_backend_schema`

## Despliegue remoto en Supabase

Archivos:

- `supabase/config.toml`
- `supabase/functions/mcp/index.ts`

Endpoint remoto actual:

```txt
https://snhjzofsjitlyscyirov.supabase.co/functions/v1/mcp
```

Secrets remotos requeridos:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXUS_MCP_ALLOWED_USER_ID=
NEXUS_MCP_ALLOWED_ROLE=admin
NEXUS_MCP_ALLOWED_RPCS=
MCP_HTTP_API_KEY=
MCP_ALLOWED_ORIGINS=https://chatgpt.com,https://chat.openai.com
```

Deploy:

```bash
supabase functions deploy mcp
```

## Exposición para ChatGPT Apps

Para conectar desde ChatGPT Apps ya no necesitas `ngrok` si usas el deploy remoto. Usa directamente:

```txt
https://snhjzofsjitlyscyirov.supabase.co/functions/v1/mcp
```
