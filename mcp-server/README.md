# Nexus-PM MCP Server

Servidor MCP local para Nexus-PM con dos transportes:

- `http` como modo principal para ChatGPT Apps.
- `stdio` como compatibilidad para pruebas locales y flujos CLI.

Controla Supabase directamente desde backend con `SUPABASE_SERVICE_ROLE_KEY`. El frontend `/agent` queda solo para visualización y auditoría.

## Estado actual

- No está desplegado.
- Soporta `http://127.0.0.1:3333/mcp` por defecto.
- Mantiene modo `stdio`.
- Expone 5 tools genéricas de base de datos.
- El service role existe solo dentro de `mcp-server`.

## Variables requeridas

Crear `mcp-server/.env` a partir de `.env.example`:

```env
MCP_TRANSPORT=http
MCP_HTTP_PORT=3333
MCP_HTTP_HOST=127.0.0.1
MCP_ALLOWED_HOSTS=127.0.0.1,localhost
MCP_ALLOWED_ORIGINS=https://chatgpt.com,https://chat.openai.com
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXUS_MCP_ALLOWED_USER_ID=
NEXUS_MCP_ALLOWED_ROLE=admin
```

## Tools expuestas

- `nexus_db_select`
- `nexus_db_insert`
- `nexus_db_update`
- `nexus_db_delete`
- `nexus_db_rpc`

## Reglas de seguridad

- `ALLOWED_TABLES = ['projects', 'tasks', 'clients', 'payments', 'recurring_charges', 'reminders', 'task_comments', 'project_members', 'notifications']`
- `PROTECTED_TABLES = ['users_profiles', 'agent_actions', 'auth.users']`
- `ALLOWED_RPCS = []` por defecto.
- `nexus_db_update` y `nexus_db_delete` exigen filtros.
- `nexus_db_delete` exige `confirm=true`.
- `agent_actions` solo recibe inserciones desde la auditoría interna.

## Arquitectura interna

- `src/db/`: cliente Supabase server-only y contexto fijo desde variables de entorno.
- `src/services/`: auditoría y operaciones genéricas de base de datos.
- `src/tools/`: schemas Zod, definiciones MCP y handlers de las 5 tools.

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

- `nexus_db_select`
- `nexus_db_insert`
- `nexus_db_update`
- `nexus_db_delete`
- rechazo protegido de `nexus_db_rpc`
- auditoría en `agent_actions`

### Smoke HTTP

Prueba el endpoint MCP HTTP real en `/mcp`. Si el servidor no está corriendo, el smoke levanta un proceso hijo local automáticamente.

```bash
pnpm build
cd mcp-server
pnpm build
pnpm smoke:http
```

## Exposición local para ChatGPT Apps

Para conectar desde ChatGPT Apps, expone el puerto local con un túnel y pega la URL pública terminada en `/mcp`.

Ejemplos:

```txt
https://xxxxx.ngrok-free.app/mcp
https://xxxxx.trycloudflare.com/mcp
```

La URL pública `/mcp` es la que debes usar como "URL del servidor" en ChatGPT Apps.
