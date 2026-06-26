import { z } from 'zod';
import {
  dbDeleteSchema,
  dbInsertSchema,
  dbRpcSchema,
  dbSelectSchema,
  dbUpdateSchema,
} from './toolSchemas.js';

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const mcpToolDefinitions: McpToolDefinition[] = [
  {
    name: 'nexus_db_select',
    description: 'Lee filas de una tabla permitida en Supabase usando filtros simples por igualdad.',
    inputSchema: z.toJSONSchema(dbSelectSchema),
  },
  {
    name: 'nexus_db_insert',
    description: 'Inserta filas en una tabla permitida de Supabase con saneamiento de user_id y auditoria.',
    inputSchema: z.toJSONSchema(dbInsertSchema),
  },
  {
    name: 'nexus_db_update',
    description: 'Actualiza filas de una tabla permitida usando filtros obligatorios.',
    inputSchema: z.toJSONSchema(dbUpdateSchema),
  },
  {
    name: 'nexus_db_delete',
    description: 'Elimina filas de una tabla permitida solo con confirmacion explicita y filtros obligatorios.',
    inputSchema: z.toJSONSchema(dbDeleteSchema),
  },
  {
    name: 'nexus_db_rpc',
    description: 'Ejecuta una RPC de Supabase solo si esta explicitamente permitida.',
    inputSchema: z.toJSONSchema(dbRpcSchema),
  },
];
