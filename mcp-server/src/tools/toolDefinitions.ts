import { z } from 'zod';
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
  taskAttachmentUploadSchema,
  storageUploadTextSchema,
} from './toolSchemas.js';

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export const mcpToolDefinitions: McpToolDefinition[] = [
  {
    name: 'nexus_backend_schema',
    description: 'Descubre tablas, columnas, funciones public y buckets disponibles en el backend de Supabase.',
    inputSchema: z.toJSONSchema(backendSchemaSchema),
  },
  {
    name: 'nexus_db_select',
    description: 'Lee filas de cualquier tabla del schema public expuesta en Supabase usando filtros simples por igualdad.',
    inputSchema: z.toJSONSchema(dbSelectSchema),
  },
  {
    name: 'nexus_db_insert',
    description:
      'Inserta filas en tablas permitidas del schema public, con auditoria obligatoria y user_id por defecto cuando aplica. No usar para tablas protegidas ni tablas respaldadas por Storage como task_attachments.',
    inputSchema: z.toJSONSchema(dbInsertSchema),
  },
  {
    name: 'nexus_db_update',
    description:
      'Actualiza filas en tablas permitidas del schema public usando filtros obligatorios. No usar para tablas protegidas ni tablas respaldadas por Storage como task_attachments.',
    inputSchema: z.toJSONSchema(dbUpdateSchema),
  },
  {
    name: 'nexus_db_delete',
    description:
      'Elimina filas en tablas permitidas del schema public solo con confirmacion explicita y filtros obligatorios. No usar para tablas protegidas ni tablas respaldadas por Storage como task_attachments.',
    inputSchema: z.toJSONSchema(dbDeleteSchema),
  },
  {
    name: 'nexus_db_rpc',
    description: 'Ejecuta una funcion RPC del schema public si existe y esta expuesta en Supabase.',
    inputSchema: z.toJSONSchema(dbRpcSchema),
  },
  {
    name: 'nexus_storage_list_buckets',
    description: 'Lista buckets de Supabase Storage disponibles para el backend MCP.',
    inputSchema: z.toJSONSchema(storageListBucketsSchema),
  },
  {
    name: 'nexus_storage_list_objects',
    description: 'Lista objetos de un bucket de Storage con prefijo y limite opcionales.',
    inputSchema: z.toJSONSchema(storageListObjectsSchema),
  },
  {
    name: 'nexus_storage_upload_text',
    description: 'Crea o reemplaza un archivo de texto en Supabase Storage.',
    inputSchema: z.toJSONSchema(storageUploadTextSchema),
  },
  {
    name: 'nexus_task_attachment_upload',
    description:
      'Adjunta una imagen o archivo a una tarea usando file param de ChatGPT o base64, guardando Storage y metadata en task_attachments.',
    inputSchema: z.toJSONSchema(taskAttachmentUploadSchema),
    meta: {
      'openai/fileParams': ['file'],
    },
  },
  {
    name: 'nexus_storage_delete',
    description: 'Elimina objetos de Storage solo con confirmacion explicita.',
    inputSchema: z.toJSONSchema(storageDeleteSchema),
  },
  {
    name: 'nexus_auth_list_users',
    description: 'Lista usuarios de Supabase Auth desde backend con service role.',
    inputSchema: z.toJSONSchema(authListUsersSchema),
  },
  {
    name: 'nexus_auth_get_user',
    description: 'Consulta un usuario especifico de Supabase Auth por id.',
    inputSchema: z.toJSONSchema(authGetUserSchema),
  },
  {
    name: 'nexus_auth_create_user',
    description: 'Crea un usuario en Supabase Auth desde backend.',
    inputSchema: z.toJSONSchema(authCreateUserSchema),
  },
  {
    name: 'nexus_auth_update_user',
    description: 'Actualiza un usuario existente de Supabase Auth.',
    inputSchema: z.toJSONSchema(authUpdateUserSchema),
  },
  {
    name: 'nexus_auth_delete_user',
    description: 'Elimina un usuario de Supabase Auth solo con confirmacion explicita.',
    inputSchema: z.toJSONSchema(authDeleteUserSchema),
  },
];
