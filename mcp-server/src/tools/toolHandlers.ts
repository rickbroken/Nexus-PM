import {
  createAuthUser,
  deleteRows,
  deleteAuthUser,
  deleteStorageObjects,
  executeRpc,
  getAuthUser,
  getBackendSchema,
  insertRow,
  listAuthUsers,
  listStorageBuckets,
  listStorageObjects,
  selectRows,
  updateAuthUser,
  updateRows,
  uploadStorageText,
} from '../services/index.js';
import type { AgentServerContext } from '../services/types.js';
import {
  authCreateUserSchema,
  authDeleteUserSchema,
  authGetUserSchema,
  authListUsersSchema,
  authUpdateUserSchema,
  backendSchemaSchema,
  dbDeleteSchema,
  dbInsertSchema,
  dbRpcSchema,
  dbSelectSchema,
  dbUpdateSchema,
  storageDeleteSchema,
  storageListBucketsSchema,
  storageListObjectsSchema,
  storageUploadTextSchema,
} from './toolSchemas.js';

export type McpToolHandlerInput = {
  context: AgentServerContext;
  input: unknown;
};

export async function handleBackendSchemaTool({ context, input }: McpToolHandlerInput) {
  const parsed = backendSchemaSchema.parse(input ?? {});

  return getBackendSchema(context, parsed, {
    enabled: true,
    action_type: 'nexus_backend_schema',
    entity_type: 'schema',
    input_text: 'mcp:nexus_backend_schema',
  });
}

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

export async function handleStorageListBucketsTool({ context, input }: McpToolHandlerInput) {
  const parsed = storageListBucketsSchema.parse(input ?? {});

  return listStorageBuckets(context, parsed, {
    enabled: true,
    action_type: 'nexus_storage_list_buckets',
    entity_type: 'storage_bucket',
    input_text: 'mcp:nexus_storage_list_buckets',
  });
}

export async function handleStorageListObjectsTool({ context, input }: McpToolHandlerInput) {
  const parsed = storageListObjectsSchema.parse(input);

  return listStorageObjects(context, parsed, {
    enabled: true,
    action_type: 'nexus_storage_list_objects',
    entity_type: 'storage_object',
    input_text: 'mcp:nexus_storage_list_objects',
  });
}

export async function handleStorageUploadTextTool({ context, input }: McpToolHandlerInput) {
  const parsed = storageUploadTextSchema.parse(input);

  return uploadStorageText(context, parsed, {
    enabled: true,
    action_type: 'nexus_storage_upload_text',
    entity_type: 'storage_object',
    input_text: 'mcp:nexus_storage_upload_text',
  });
}

export async function handleStorageDeleteTool({ context, input }: McpToolHandlerInput) {
  const parsed = storageDeleteSchema.parse(input);

  return deleteStorageObjects(context, parsed, {
    enabled: true,
    action_type: 'nexus_storage_delete',
    entity_type: 'storage_object',
    input_text: 'mcp:nexus_storage_delete',
  });
}

export async function handleAuthListUsersTool({ context, input }: McpToolHandlerInput) {
  const parsed = authListUsersSchema.parse(input ?? {});

  return listAuthUsers(context, parsed, {
    enabled: true,
    action_type: 'nexus_auth_list_users',
    entity_type: 'auth_user',
    input_text: 'mcp:nexus_auth_list_users',
  });
}

export async function handleAuthGetUserTool({ context, input }: McpToolHandlerInput) {
  const parsed = authGetUserSchema.parse(input);

  return getAuthUser(context, parsed, {
    enabled: true,
    action_type: 'nexus_auth_get_user',
    entity_type: 'auth_user',
    entity_id: parsed.userId,
    input_text: 'mcp:nexus_auth_get_user',
  });
}

export async function handleAuthCreateUserTool({ context, input }: McpToolHandlerInput) {
  const parsed = authCreateUserSchema.parse(input);

  return createAuthUser(context, parsed, {
    enabled: true,
    action_type: 'nexus_auth_create_user',
    entity_type: 'auth_user',
    input_text: 'mcp:nexus_auth_create_user',
  });
}

export async function handleAuthUpdateUserTool({ context, input }: McpToolHandlerInput) {
  const parsed = authUpdateUserSchema.parse(input);

  return updateAuthUser(context, parsed, {
    enabled: true,
    action_type: 'nexus_auth_update_user',
    entity_type: 'auth_user',
    entity_id: parsed.userId,
    input_text: 'mcp:nexus_auth_update_user',
  });
}

export async function handleAuthDeleteUserTool({ context, input }: McpToolHandlerInput) {
  const parsed = authDeleteUserSchema.parse(input);

  return deleteAuthUser(context, parsed, {
    enabled: true,
    action_type: 'nexus_auth_delete_user',
    entity_type: 'auth_user',
    entity_id: parsed.userId,
    input_text: 'mcp:nexus_auth_delete_user',
  });
}

export const mcpToolHandlers = {
  nexus_backend_schema: handleBackendSchemaTool,
  nexus_db_select: handleDbSelectTool,
  nexus_db_insert: handleDbInsertTool,
  nexus_db_update: handleDbUpdateTool,
  nexus_db_delete: handleDbDeleteTool,
  nexus_db_rpc: handleDbRpcTool,
  nexus_storage_list_buckets: handleStorageListBucketsTool,
  nexus_storage_list_objects: handleStorageListObjectsTool,
  nexus_storage_upload_text: handleStorageUploadTextTool,
  nexus_storage_delete: handleStorageDeleteTool,
  nexus_auth_list_users: handleAuthListUsersTool,
  nexus_auth_get_user: handleAuthGetUserTool,
  nexus_auth_create_user: handleAuthCreateUserTool,
  nexus_auth_update_user: handleAuthUpdateUserTool,
  nexus_auth_delete_user: handleAuthDeleteUserTool,
} as const;
