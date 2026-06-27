import { ToolExecutionError } from '../errors.js';
import { getServerConfig } from '../config.js';
import { AUTH_BLOCKED_DB_TABLES, DEFAULT_ACTOR_COLUMNS, ENFORCED_ACTOR_COLUMNS, MAX_SELECT_LIMIT, PROTECTED_READ_TABLES, PROTECTED_WRITE_TABLES, } from './types.js';
import { logAgentAction, tryLogAgentFailure } from './audit.service.js';
function isPlainRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function ensureNonEmptyFilters(filters, action) {
    if (Object.keys(filters).length === 0) {
        throw new ToolExecutionError(`No se permite ${action} sin filtros.`);
    }
}
function sanitizeColumns(columns) {
    if (!columns) {
        return '*';
    }
    const trimmed = columns.trim();
    if (trimmed === '*') {
        return '*';
    }
    const parts = trimmed
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    if (parts.length === 0) {
        throw new ToolExecutionError('columns invalido.');
    }
    for (const part of parts) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
            throw new ToolExecutionError('columns invalido. Usa solo nombres simples de columna.');
        }
    }
    return parts.join(', ');
}
function parseOrderBy(orderBy) {
    if (!orderBy)
        return null;
    const trimmed = orderBy.trim();
    const [column, directionRaw] = trimmed.includes(':')
        ? trimmed.split(':', 2)
        : trimmed.split(/\s+/, 2);
    const direction = directionRaw?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    const safeColumn = column.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(safeColumn)) {
        throw new ToolExecutionError('orderBy invalido. Usa solo nombres simples de columna.');
    }
    return {
        column: safeColumn,
        ascending: direction !== 'desc',
    };
}
function applyFilters(query, filters) {
    if (!filters)
        return query;
    let currentQuery = query;
    for (const [key, value] of Object.entries(filters)) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
            throw new ToolExecutionError(`Filtro invalido: ${key}`);
        }
        currentQuery = value === null ? currentQuery.is(key, null) : currentQuery.eq(key, value);
    }
    return currentQuery;
}
function normalizePublicTableName(table) {
    const trimmed = table.trim();
    const parts = trimmed.split('.');
    if (parts.length === 1) {
        return parts[0];
    }
    if (parts.length === 2 && parts[0] === 'public') {
        return parts[1];
    }
    throw new ToolExecutionError('Solo se permiten tablas del schema public en las tools genericas.');
}
function normalizePublicFunctionName(functionName) {
    const trimmed = functionName.trim();
    const parts = trimmed.split('.');
    if (parts.length === 1) {
        return parts[0];
    }
    if (parts.length === 2 && parts[0] === 'public') {
        return parts[1];
    }
    throw new ToolExecutionError('Solo se permiten funciones del schema public en la tool RPC.');
}
let cachedOpenApi = null;
async function getPostgrestOpenApi() {
    if (cachedOpenApi) {
        return cachedOpenApi;
    }
    const config = getServerConfig();
    const response = await fetch(`${config.SUPABASE_URL}/rest/v1/`, {
        headers: {
            apikey: config.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
            Accept: 'application/openapi+json',
        },
    });
    if (!response.ok) {
        throw new ToolExecutionError(`No se pudo cargar el contrato OpenAPI del backend (${response.status}).`);
    }
    cachedOpenApi = (await response.json());
    return cachedOpenApi;
}
async function getPublicTableNames(context) {
    const openApi = await getPostgrestOpenApi();
    const tableNames = Object.keys(openApi.paths ?? {})
        .filter((path) => /^\/[a-zA-Z_][a-zA-Z0-9_]*$/.test(path))
        .map((path) => path.slice(1));
    return new Set(tableNames);
}
async function getPublicFunctionNames(context) {
    const openApi = await getPostgrestOpenApi();
    const functionNames = Object.keys(openApi.paths ?? {})
        .filter((path) => path.startsWith('/rpc/'))
        .map((path) => path.replace('/rpc/', ''));
    return new Set(functionNames);
}
async function getPublicTableColumns(context, table) {
    const openApi = await getPostgrestOpenApi();
    const definition = openApi.definitions?.[table];
    const properties = definition?.properties ?? {};
    return new Set(Object.keys(properties));
}
async function ensurePublicTableAllowed(context, table) {
    const normalizedTable = normalizePublicTableName(table);
    if (AUTH_BLOCKED_DB_TABLES.includes(table) || AUTH_BLOCKED_DB_TABLES.includes(normalizedTable)) {
        throw new ToolExecutionError(`La tabla ${table} no se puede operar desde las tools genericas.`);
    }
    const publicTables = await getPublicTableNames(context);
    if (!publicTables.has(normalizedTable)) {
        throw new ToolExecutionError(`La tabla public.${normalizedTable} no existe o no esta expuesta.`);
    }
    return normalizedTable;
}
function ensureTableReadAllowed(table) {
    if (PROTECTED_READ_TABLES.includes(table)) {
        throw new ToolExecutionError(`La tabla ${table} esta protegida para lectura generica.`);
    }
}
function ensureTableWriteAllowed(table, action) {
    if (table === 'task_attachments') {
        throw new ToolExecutionError('La tabla task_attachments esta protegida para escritura generica. Usa nexus_task_attachment_upload para adjuntar archivos.');
    }
    if (PROTECTED_WRITE_TABLES.includes(table)) {
        throw new ToolExecutionError(`La tabla ${table} esta protegida para ${action}.`);
    }
}
function ensureGenericAgentActionsWriteBlocked(table) {
    if (table === 'agent_actions') {
        throw new ToolExecutionError('agent_actions solo permite inserciones desde la auditoria interna.');
    }
}
function enforceActorColumns(payload, columns, context, mode) {
    for (const column of ENFORCED_ACTOR_COLUMNS) {
        if (!columns.has(column) || payload[column] === undefined || payload[column] === null) {
            continue;
        }
        if (payload[column] !== context.userId) {
            throw new ToolExecutionError(`No se permite suplantar ${column} en ${mode}. Debe coincidir con NEXUS_MCP_ALLOWED_USER_ID.`);
        }
    }
    if (mode === 'insert') {
        for (const column of DEFAULT_ACTOR_COLUMNS) {
            if (columns.has(column) && payload[column] === undefined) {
                payload[column] = context.userId;
            }
        }
    }
}
async function sanitizeInsertData(context, table, data) {
    if (!isPlainRecord(data) || Object.keys(data).length === 0) {
        throw new ToolExecutionError('data debe ser un objeto no vacio.');
    }
    const payload = { ...data };
    const columns = await getPublicTableColumns(context, table);
    enforceActorColumns(payload, columns, context, 'insert');
    return payload;
}
async function sanitizeUpdateData(context, table, data) {
    if (!isPlainRecord(data) || Object.keys(data).length === 0) {
        throw new ToolExecutionError('data debe ser un objeto no vacio.');
    }
    const payload = { ...data };
    const columns = await getPublicTableColumns(context, table);
    enforceActorColumns(payload, columns, context, 'update');
    return payload;
}
function buildEntityMetadata(table, rows) {
    const firstRow = rows[0] ?? {};
    return {
        entity_type: table,
        entity_id: typeof firstRow.id === 'string' ? firstRow.id : undefined,
        project_id: typeof firstRow.project_id === 'string' ? firstRow.project_id : undefined,
        task_id: typeof firstRow.task_id === 'string' ? firstRow.task_id : undefined,
        client_id: typeof firstRow.client_id === 'string' ? firstRow.client_id : undefined,
        payment_id: typeof firstRow.payment_id === 'string' ? firstRow.payment_id : undefined,
        recurring_charge_id: typeof firstRow.recurring_charge_id === 'string' ? firstRow.recurring_charge_id : undefined,
    };
}
async function auditSuccess(context, audit, result) {
    if (!audit.enabled)
        return;
    await logAgentAction(context, {
        action_type: audit.action_type,
        entity_type: audit.entity_type ?? null,
        entity_id: audit.entity_id ?? null,
        project_id: audit.project_id ?? null,
        task_id: audit.task_id ?? null,
        client_id: audit.client_id ?? null,
        payment_id: audit.payment_id ?? null,
        recurring_charge_id: audit.recurring_charge_id ?? null,
        input_text: audit.input_text ?? null,
        result,
        status: 'success',
    });
}
async function auditFailure(context, audit, error) {
    if (!audit.enabled)
        return;
    await tryLogAgentFailure(context, {
        action_type: audit.action_type,
        entity_type: audit.entity_type ?? null,
        entity_id: audit.entity_id ?? null,
        project_id: audit.project_id ?? null,
        task_id: audit.task_id ?? null,
        client_id: audit.client_id ?? null,
        payment_id: audit.payment_id ?? null,
        recurring_charge_id: audit.recurring_charge_id ?? null,
        input_text: audit.input_text ?? null,
        error_message: error instanceof Error ? error.message : 'Error desconocido',
    });
}
export async function selectRows(context, input, audit) {
    try {
        const table = await ensurePublicTableAllowed(context, input.table);
        ensureTableReadAllowed(table);
        const columns = sanitizeColumns(input.columns);
        const limit = Math.min(input.limit ?? 20, MAX_SELECT_LIMIT);
        let query = context.supabaseClient.schema('public').from(table).select(columns);
        query = applyFilters(query, input.filters);
        const orderBy = parseOrderBy(input.orderBy);
        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending });
        }
        const { data, error } = await query.limit(limit);
        if (error) {
            throw new ToolExecutionError(error.message);
        }
        const rows = (data ?? []);
        const result = {
            table,
            count: rows.length,
            rows,
        };
        await auditSuccess(context, audit, {
            table,
            count: rows.length,
            limit,
        });
        return result;
    }
    catch (error) {
        await auditFailure(context, audit, error);
        throw error;
    }
}
export async function insertRow(context, input, audit) {
    try {
        const table = await ensurePublicTableAllowed(context, input.table);
        ensureGenericAgentActionsWriteBlocked(table);
        ensureTableWriteAllowed(table, 'insert');
        const payload = await sanitizeInsertData(context, table, input.data);
        const { data, error } = await context.supabaseClient
            .schema('public')
            .from(table)
            .insert([payload])
            .select('*');
        if (error) {
            throw new ToolExecutionError(error.message);
        }
        const rows = (data ?? []);
        Object.assign(audit, buildEntityMetadata(table, rows));
        await auditSuccess(context, audit, {
            table,
            inserted_count: rows.length,
            ids: rows
                .map((row) => row.id)
                .filter((id) => typeof id === 'string')
                .slice(0, 5),
        });
        return {
            table,
            count: rows.length,
            rows,
        };
    }
    catch (error) {
        await auditFailure(context, audit, error);
        throw error;
    }
}
export async function updateRows(context, input, audit) {
    try {
        const table = await ensurePublicTableAllowed(context, input.table);
        ensureGenericAgentActionsWriteBlocked(table);
        ensureTableWriteAllowed(table, 'update');
        ensureNonEmptyFilters(input.filters, 'update');
        const payload = await sanitizeUpdateData(context, table, input.data);
        let query = context.supabaseClient.schema('public').from(table).update(payload);
        query = applyFilters(query, input.filters);
        const { data, error } = await query.select('*');
        if (error) {
            throw new ToolExecutionError(error.message);
        }
        const rows = (data ?? []);
        Object.assign(audit, buildEntityMetadata(table, rows));
        await auditSuccess(context, audit, {
            table,
            updated_count: rows.length,
        });
        return {
            table,
            count: rows.length,
            rows,
        };
    }
    catch (error) {
        await auditFailure(context, audit, error);
        throw error;
    }
}
export async function deleteRows(context, input, audit) {
    try {
        const table = await ensurePublicTableAllowed(context, input.table);
        ensureGenericAgentActionsWriteBlocked(table);
        ensureTableWriteAllowed(table, 'delete');
        ensureNonEmptyFilters(input.filters, 'delete');
        if (input.confirm !== true) {
            throw new ToolExecutionError('confirm debe ser true para ejecutar delete.');
        }
        let query = context.supabaseClient.schema('public').from(table).delete();
        query = applyFilters(query, input.filters);
        const { data, error } = await query.select('*');
        if (error) {
            throw new ToolExecutionError(error.message);
        }
        const rows = (data ?? []);
        Object.assign(audit, buildEntityMetadata(table, rows));
        await auditSuccess(context, audit, {
            table,
            deleted_count: rows.length,
            confirmed: true,
        });
        return {
            table,
            count: rows.length,
            rows,
        };
    }
    catch (error) {
        await auditFailure(context, audit, error);
        throw error;
    }
}
export async function executeRpc(context, input, audit) {
    try {
        const functionName = normalizePublicFunctionName(input.functionName);
        const publicFunctions = await getPublicFunctionNames(context);
        if (!publicFunctions.has(functionName)) {
            throw new ToolExecutionError(`La funcion public.${functionName} no existe o no esta expuesta.`);
        }
        const config = getServerConfig();
        if (!config.NEXUS_MCP_ALLOWED_RPCS.includes(functionName)) {
            throw new ToolExecutionError(`La funcion public.${functionName} no esta permitida por NEXUS_MCP_ALLOWED_RPCS.`);
        }
        const { data, error } = await context.supabaseClient.rpc(functionName, input.args ?? {});
        if (error) {
            throw new ToolExecutionError(error.message);
        }
        await auditSuccess(context, audit, {
            functionName,
            hasArgs: !!input.args && Object.keys(input.args).length > 0,
        });
        return {
            functionName,
            data,
        };
    }
    catch (error) {
        await auditFailure(context, audit, error);
        throw error;
    }
}
