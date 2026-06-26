import { z } from 'zod';
import {
  dbDeleteSchema,
  dbInsertSchema,
  dbRpcSchema,
  dbSelectSchema,
  dbUpdateSchema,
} from '../services/types.js';

export { dbDeleteSchema, dbInsertSchema, dbRpcSchema, dbSelectSchema, dbUpdateSchema };

export const mcpToolRuntimeSchemas = {
  nexus_db_select: dbSelectSchema,
  nexus_db_insert: dbInsertSchema,
  nexus_db_update: dbUpdateSchema,
  nexus_db_delete: dbDeleteSchema,
  nexus_db_rpc: dbRpcSchema,
} as const;

export type AnyToolRuntimeSchema =
  (typeof mcpToolRuntimeSchemas)[keyof typeof mcpToolRuntimeSchemas];
