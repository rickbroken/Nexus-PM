# Nexus-PM MCP Server

Servidor MCP base para Nexus-PM, separado del frontend Vite y ejecutado por `stdio`.

En esta fase:

- No hay deploy ni endpoint HTTP.
- No hay servidor MCP publico.
- Reutiliza `src/lib/agent-api/` y `src/lib/agent-mcp/`.
- Usa un cliente Supabase exclusivo del servidor.

## Variables requeridas

Copiar `.env.example` a `.env` y completar:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXUS_MCP_ALLOWED_USER_ID`
- `NEXUS_MCP_ALLOWED_ROLE=admin`

## Tools expuestas

- `nexus_get_daily_brief`
- `nexus_get_pending_tasks`
- `nexus_create_reminder`
- `nexus_complete_reminder`
- `nexus_cancel_reminder`
- `nexus_postpone_reminder`
- `nexus_create_task`
- `nexus_update_task_status`

## Uso local

```bash
cd mcp-server
pnpm install
pnpm dev
```

Build:

```bash
cd mcp-server
pnpm build
```

Ejecucion del build:

```bash
cd mcp-server
pnpm start
```

## Prueba local real

Prerequisito: `mcp-server/.env` debe existir y contener valores reales locales.

```bash
pnpm build
cd mcp-server
pnpm build
pnpm smoke
```

Resultado esperado:

- respuesta correcta de `nexus_get_daily_brief`
- respuesta correcta de `nexus_get_pending_tasks`
- creacion real de `nexus_create_reminder`
- registros visibles en `agent_actions` con `action_type` `nexus_*`
- reminder visible en `reminders` para el `NEXUS_MCP_ALLOWED_USER_ID`
