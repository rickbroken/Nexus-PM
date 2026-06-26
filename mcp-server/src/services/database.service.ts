import { ToolExecutionError } from '../errors.js';
import type {
  AgentAuditContext,
  AgentServerContext,
  AllowedTable,
  DatabaseMutationResult,
  DatabaseRpcResult,
  DatabaseSelectResult,
  DbDeleteInput,
  DbInsertInput,
  DbRpcInput,
  DbSelectInput,
  DbUpdateInput,
  SimpleFilters,
} from './types.js';
import { ALLOWED_RPCS, ALLOWED_TABLES, MAX_SELECT_LIMIT, PROTECTED_TABLES, TABLES_WITH_USER_ID } from './types.js';
import { logAgentAction, tryLogAgentFailure } from './audit.service.js';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureNonEmptyFilters(filters: SimpleFilters, action: 'update' | 'delete') {
  if (Object.keys(filters).length === 0) {
    throw new ToolExecutionError(`No se permite ${action} sin filtros.`);
  }
}

function ensureTableNotProtected(table: string, action: 'insert' | 'update' | 'delete') {
  if (PROTECTED_TABLES.includes(table as any)) {
    throw new ToolExecutionError(`La tabla ${table} esta protegida para ${action}.`);
  }
}

function ensureTableAllowed(table: string): AllowedTable {
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    throw new ToolExecutionError(`La tabla ${table} no esta permitida para este servidor MCP.`);
  }

  return table as AllowedTable;
}

function ensureGenericAgentActionsWriteBlocked(table: string) {
  if (table === 'agent_actions') {
    throw new ToolExecutionError('agent_actions solo permite inserciones desde la auditoria interna.');
  }
}

function sanitizeColumns(columns?: string) {
  if (!columns) {
    return '*';
  }

  const trimmed = columns.trim();
  if (trimmed === '*') {
    return '*';
  }

  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
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

function parseOrderBy(orderBy?: string) {
  if (!orderBy) return null;

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

function applyFilters(query: any, filters?: SimpleFilters) {
  if (!filters) return query;

  let currentQuery = query;
  for (const [key, value] of Object.entries(filters)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new ToolExecutionError(`Filtro invalido: ${key}`);
    }

    currentQuery = value === null ? currentQuery.is(key, null) : currentQuery.eq(key, value);
  }

  return currentQuery;
}

function tableHasUserId(table: AllowedTable) {
  return TABLES_WITH_USER_ID.includes(table as any);
}

async function sanitizeInsertData(
  context: AgentServerContext,
  table: AllowedTable,
  data: Record<string, unknown>
) {
  if (!isPlainRecord(data) || Object.keys(data).length === 0) {
    throw new ToolExecutionError('data debe ser un objeto no vacio.');
  }

  const payload = { ...data };
  const hasUserId = tableHasUserId(table);
  if (!hasUserId) {
    return payload;
  }

  if (payload.user_id === undefined) {
    payload.user_id = context.userId;
    return payload;
  }

  if (payload.user_id !== context.userId) {
    throw new ToolExecutionError('No se permite actuar en nombre de otro usuario.');
  }

  return payload;
}

async function sanitizeUpdateData(
  context: AgentServerContext,
  table: AllowedTable,
  data: Record<string, unknown>
) {
  if (!isPlainRecord(data) || Object.keys(data).length === 0) {
    throw new ToolExecutionError('data debe ser un objeto no vacio.');
  }

  const payload = { ...data };
  const hasUserId = tableHasUserId(table);
  if (hasUserId && payload.user_id !== undefined && payload.user_id !== context.userId) {
    throw new ToolExecutionError('No se permite cambiar user_id hacia otro usuario.');
  }

  return payload;
}

function buildEntityMetadata(table: AllowedTable, rows: Record<string, unknown>[]) {
  const firstRow = rows[0] ?? {};
  return {
    entity_type: table,
    entity_id: typeof firstRow.id === 'string' ? firstRow.id : undefined,
    project_id: typeof firstRow.project_id === 'string' ? firstRow.project_id : undefined,
    task_id: typeof firstRow.task_id === 'string' ? firstRow.task_id : undefined,
    client_id: typeof firstRow.client_id === 'string' ? firstRow.client_id : undefined,
    payment_id: typeof firstRow.payment_id === 'string' ? firstRow.payment_id : undefined,
    recurring_charge_id:
      typeof firstRow.recurring_charge_id === 'string' ? firstRow.recurring_charge_id : undefined,
  };
}

async function auditSuccess(
  context: AgentServerContext,
  audit: AgentAuditContext,
  result: Record<string, unknown>
) {
  if (!audit.enabled) return;

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

async function auditFailure(
  context: AgentServerContext,
  audit: AgentAuditContext,
  error: unknown
) {
  if (!audit.enabled) return;

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

export async function selectRows(
  context: AgentServerContext,
  input: DbSelectInput,
  audit: AgentAuditContext
): Promise<DatabaseSelectResult> {
  try {
    const table = ensureTableAllowed(input.table);
    const columns = sanitizeColumns(input.columns);
    const limit = Math.min(input.limit ?? 20, MAX_SELECT_LIMIT);
    let query: any = context.supabaseClient.from(table).select(columns);
    query = applyFilters(query, input.filters);

    const orderBy = parseOrderBy(input.orderBy);
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }

    const { data, error } = await query.limit(limit);
    if (error) {
      throw new ToolExecutionError(error.message);
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    const result = {
      table,
      count: rows.length,
      rows,
    } satisfies DatabaseSelectResult;

    await auditSuccess(context, audit, {
      table,
      count: rows.length,
      limit,
    });

    return result;
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

export async function insertRow(
  context: AgentServerContext,
  input: DbInsertInput,
  audit: AgentAuditContext
): Promise<DatabaseMutationResult> {
  try {
    ensureGenericAgentActionsWriteBlocked(input.table);
    ensureTableNotProtected(input.table, 'insert');
    const table = ensureTableAllowed(input.table);

    const payload = await sanitizeInsertData(context, table, input.data);
    const { data, error } = await (context.supabaseClient
      .from(table)
      .insert([payload])
      .select('*') as any);

    if (error) {
      throw new ToolExecutionError(error.message);
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    Object.assign(audit, buildEntityMetadata(table, rows));

    await auditSuccess(context, audit, {
      table,
      inserted_count: rows.length,
      ids: rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string')
        .slice(0, 5),
    });

    return {
      table,
      count: rows.length,
      rows,
    };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

export async function updateRows(
  context: AgentServerContext,
  input: DbUpdateInput,
  audit: AgentAuditContext
): Promise<DatabaseMutationResult> {
  try {
    ensureGenericAgentActionsWriteBlocked(input.table);
    ensureTableNotProtected(input.table, 'update');
    const table = ensureTableAllowed(input.table);
    ensureNonEmptyFilters(input.filters, 'update');

    const payload = await sanitizeUpdateData(context, table, input.data);
    let query: any = context.supabaseClient.from(table).update(payload);
    query = applyFilters(query, input.filters);

    const { data, error } = await query.select('*');
    if (error) {
      throw new ToolExecutionError(error.message);
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
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
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

export async function deleteRows(
  context: AgentServerContext,
  input: DbDeleteInput,
  audit: AgentAuditContext
): Promise<DatabaseMutationResult> {
  try {
    ensureGenericAgentActionsWriteBlocked(input.table);
    ensureTableNotProtected(input.table, 'delete');
    const table = ensureTableAllowed(input.table);
    ensureNonEmptyFilters(input.filters, 'delete');

    if (input.confirm !== true) {
      throw new ToolExecutionError('confirm debe ser true para ejecutar delete.');
    }

    let query: any = context.supabaseClient.from(table).delete();
    query = applyFilters(query, input.filters);

    const { data, error } = await query.select('*');
    if (error) {
      throw new ToolExecutionError(error.message);
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
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
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

export async function executeRpc(
  context: AgentServerContext,
  input: DbRpcInput,
  audit: AgentAuditContext
): Promise<DatabaseRpcResult> {
  try {
    if (!ALLOWED_RPCS.includes(input.functionName as never)) {
      throw new ToolExecutionError(
        ALLOWED_RPCS.length === 0
          ? 'No hay RPCs habilitadas en este servidor MCP.'
          : `RPC no permitida: ${input.functionName}`
      );
    }

    const { data, error } = await context.supabaseClient.rpc(input.functionName, input.args ?? {});
    if (error) {
      throw new ToolExecutionError(error.message);
    }

    await auditSuccess(context, audit, {
      functionName: input.functionName,
      hasArgs: !!input.args && Object.keys(input.args).length > 0,
    });

    return {
      functionName: input.functionName,
      data,
    };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}
