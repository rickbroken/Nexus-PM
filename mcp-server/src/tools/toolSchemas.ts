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
  taskAttachmentDeleteSchema,
  taskAttachmentUploadSchema,
  storageUploadTextSchema,
} from '../services/types.js';

export {
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
  taskAttachmentDeleteSchema,
  taskAttachmentUploadSchema,
  storageUploadTextSchema,
};

export const mcpToolRuntimeSchemas = {
  nexus_backend_schema: backendSchemaSchema,
  nexus_db_select: dbSelectSchema,
  nexus_db_insert: dbInsertSchema,
  nexus_db_update: dbUpdateSchema,
  nexus_db_delete: dbDeleteSchema,
  nexus_db_rpc: dbRpcSchema,
  nexus_storage_list_buckets: storageListBucketsSchema,
  nexus_storage_list_objects: storageListObjectsSchema,
  nexus_storage_upload_text: storageUploadTextSchema,
  nexus_task_attachment_upload: taskAttachmentUploadSchema,
  nexus_attach_file_to_task: taskAttachmentUploadSchema,
  nexus_delete_task_attachment: taskAttachmentDeleteSchema,
  nexus_storage_delete: storageDeleteSchema,
  nexus_auth_list_users: authListUsersSchema,
  nexus_auth_get_user: authGetUserSchema,
  nexus_auth_create_user: authCreateUserSchema,
  nexus_auth_update_user: authUpdateUserSchema,
  nexus_auth_delete_user: authDeleteUserSchema,
} as const;

export type AnyToolRuntimeSchema =
  (typeof mcpToolRuntimeSchemas)[keyof typeof mcpToolRuntimeSchemas];
