import {
  deleteRows,
  executeRpc,
  insertRow,
  selectRows,
  updateRows,
} from '../services/index.js';
import type { AgentServerContext } from '../services/types.js';
import {
  dbDeleteSchema,
  dbInsertSchema,
  dbRpcSchema,
  dbSelectSchema,
  dbUpdateSchema,
} from './toolSchemas.js';

export type McpToolHandlerInput = {
  context: AgentServerContext;
  input: unknown;
};

export async function handleDbSelectTool({ context, input }: McpToolHandlerInput) {
  const parsed = dbSelectSchema.parse(input ?? {});

  return selectRows(context, parsed, {
    enabled: true,
    action_type: 'nexus_db_select',
    entity_type: parsed.table,
    input_text: 'mcp:nexus_db_select',
  });
}

export async function handleDbInsertTool({ context, input }: McpToolHandlerInput) {
  const parsed = dbInsertSchema.parse(input);

  return insertRow(context, parsed, {
    enabled: true,
    action_type: 'nexus_db_insert',
    entity_type: parsed.table,
    input_text: 'mcp:nexus_db_insert',
  });
}

export async function handleDbUpdateTool({ context, input }: McpToolHandlerInput) {
  const parsed = dbUpdateSchema.parse(input);

  return updateRows(context, parsed, {
    enabled: true,
    action_type: 'nexus_db_update',
    entity_type: parsed.table,
    input_text: 'mcp:nexus_db_update',
  });
}

export async function handleDbDeleteTool({ context, input }: McpToolHandlerInput) {
  const parsed = dbDeleteSchema.parse(input);

  return deleteRows(context, parsed, {
    enabled: true,
    action_type: 'nexus_db_delete',
    entity_type: parsed.table,
    input_text: 'mcp:nexus_db_delete',
  });
}

export async function handleDbRpcTool({ context, input }: McpToolHandlerInput) {
  const parsed = dbRpcSchema.parse(input ?? {});

  return executeRpc(context, parsed, {
    enabled: true,
    action_type: 'nexus_db_rpc',
    entity_type: 'rpc',
    input_text: 'mcp:nexus_db_rpc',
  });
}

export const mcpToolHandlers = {
  nexus_db_select: handleDbSelectTool,
  nexus_db_insert: handleDbInsertTool,
  nexus_db_update: handleDbUpdateTool,
  nexus_db_delete: handleDbDeleteTool,
  nexus_db_rpc: handleDbRpcTool,
} as const;
