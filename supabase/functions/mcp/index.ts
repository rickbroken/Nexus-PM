import { McpServer } from "npm:@modelcontextprotocol/sdk@1.29.0/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.29.0/server/webStandardStreamableHttp.js";
import { isInitializeRequest } from "npm:@modelcontextprotocol/sdk@1.29.0/types.js";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.89.0";
import { z, ZodError } from "npm:zod@4.4.3";

type UserRole = "admin" | "pm" | "dev" | "advisor";
type ServerSupabaseClient = SupabaseClient<any>;
type SimpleFilterValue = string | number | boolean | null;
type SimpleFilters = Record<string, SimpleFilterValue>;

type AgentServerContext = {
  supabaseClient: ServerSupabaseClient;
  userId: string;
  userRole: UserRole;
};

type AuthenticatedIdentity = {
  userId: string;
  userRole: UserRole;
  authMode: "oauth" | "api_key";
  email?: string | null;
};

type AgentAuditContext = {
  enabled?: boolean;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
  task_id?: string;
  client_id?: string;
  payment_id?: string;
  recurring_charge_id?: string;
  input_text?: string;
};

type DatabaseSelectResult = {
  table: string;
  count: number;
  rows: Record<string, unknown>[];
};

type DatabaseMutationResult = {
  table: string;
  count: number;
  rows: Record<string, unknown>[];
};

type DatabaseRpcResult = {
  functionName: string;
  data: unknown;
};

type BackendSchemaResult = {
  resource: BackendSchemaInput["resource"];
  tables?: Array<{ name: string; type: string }>;
  columns?: Array<{ table: string; column: string; dataType: string; isNullable: boolean }>;
  rpcs?: Array<{ name: string; returnType: string | null }>;
  buckets?: Array<{ id: string; name: string; public: boolean | null }>;
};

type StorageListBucketsResult = {
  count: number;
  buckets: Array<{ id: string; name: string; public: boolean | null; fileSizeLimit?: number | null }>;
};

type StorageListObjectsResult = {
  bucket: string;
  count: number;
  objects: Array<Record<string, unknown>>;
};

type StorageUploadTextResult = {
  bucket: string;
  path: string;
  contentType: string;
};

type TaskAttachmentUploadResult = {
  attachmentId: string;
  taskId: string;
  bucket: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
};

type StorageDeleteResult = {
  bucket: string;
  deletedCount: number;
  paths: string[];
};

type AuthListUsersResult = {
  count: number;
  users: Array<Record<string, unknown>>;
};

type AuthUserResult = {
  user: Record<string, unknown>;
};

const PROTECTED_READ_TABLES = ["project_credentials"] as const;
const PROTECTED_WRITE_TABLES = ["agent_actions", "project_credentials", "task_attachments"] as const;
const AUTH_BLOCKED_DB_TABLES = ["auth.users"] as const;
const DEFAULT_ACTOR_COLUMNS = ["user_id", "created_by", "added_by", "uploaded_by"] as const;
const ENFORCED_ACTOR_COLUMNS = [
  "user_id",
  "created_by",
  "added_by",
  "uploaded_by",
  "deleted_by",
  "cancelled_by",
] as const;

const MAX_SELECT_LIMIT = 100;
const MAX_STORAGE_LIST_LIMIT = 100;
const MAX_STORAGE_DELETE_BATCH = 50;
const MAX_AUTH_LIST_PER_PAGE = 100;
const MAX_TASK_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MCP_BASE_PATH = "/functions/v1/mcp";
const OAUTH_PROTECTED_RESOURCE_FUNCTION_PATH = "/functions/v1/mcp-oauth-protected-resource";
const TASK_ATTACHMENTS_BUCKET = "task-attachments";

class InvalidConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidConfigurationError";
  }
}

class UnsupportedToolError extends Error {
  constructor(toolName: string) {
    super(`Tool no soportada: ${toolName}`);
    this.name = "UnsupportedToolError";
  }
}

class InvalidToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidToolInputError";
  }
}

class ToolExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

function toSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Error no controlado";
}

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const configSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL invalida"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY es obligatoria"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY es obligatoria"),
  NEXUS_MCP_ALLOWED_USER_ID: z.string().uuid("NEXUS_MCP_ALLOWED_USER_ID debe ser un UUID"),
  NEXUS_MCP_ALLOWED_ROLE: z.enum(["admin", "pm", "dev", "advisor"]).default("admin"),
  MCP_HTTP_API_KEY: z.string().trim().min(1, "MCP_HTTP_API_KEY es obligatoria"),
  MCP_ALLOWED_ORIGINS: z
    .string()
    .default("https://chatgpt.com,https://chat.openai.com")
    .transform(parseCsvList),
  NEXUS_MCP_ALLOWED_RPCS: z.string().default("").transform(parseCsvList),
});

type EdgeConfig = z.infer<typeof configSchema>;

let cachedConfig: EdgeConfig | null = null;
let cachedClient: ServerSupabaseClient | null = null;
let cachedOpenApi: PostgrestOpenApi | null = null;

function getConfig(): EdgeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = configSchema.safeParse({
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    NEXUS_MCP_ALLOWED_USER_ID: Deno.env.get("NEXUS_MCP_ALLOWED_USER_ID"),
    NEXUS_MCP_ALLOWED_ROLE: Deno.env.get("NEXUS_MCP_ALLOWED_ROLE"),
    MCP_HTTP_API_KEY: Deno.env.get("MCP_HTTP_API_KEY"),
    MCP_ALLOWED_ORIGINS: Deno.env.get("MCP_ALLOWED_ORIGINS"),
    NEXUS_MCP_ALLOWED_RPCS: Deno.env.get("NEXUS_MCP_ALLOWED_RPCS"),
  });

  if (!parsed.success) {
    throw new InvalidConfigurationError(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

function getSupabaseClient(): ServerSupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getConfig();
  cachedClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

function buildAgentServerContext(identity?: AuthenticatedIdentity): AgentServerContext {
  const config = getConfig();

  return {
    supabaseClient: getSupabaseClient(),
    userId: identity?.userId ?? config.NEXUS_MCP_ALLOWED_USER_ID,
    userRole: identity?.userRole ?? config.NEXUS_MCP_ALLOWED_ROLE,
  };
}

async function getUserRole(userId: string): Promise<{ role: UserRole; email: string | null }> {
  const { data, error } = await getSupabaseClient()
    .from("users_profiles")
    .select("role, email")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new ToolExecutionError("No se pudo validar el perfil del usuario OAuth.");
  }

  if (!["admin", "pm", "dev", "advisor"].includes(data.role)) {
    throw new ToolExecutionError("El rol del usuario OAuth no es valido.");
  }

  return {
    role: data.role as UserRole,
    email: typeof data.email === "string" ? data.email : null,
  };
}

const simpleFilterValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const simpleFiltersSchema = z.record(z.string(), simpleFilterValueSchema);
const tableNameSchema = z
  .string()
  .trim()
  .min(1, "table es obligatoria")
  .regex(/^[a-zA-Z_][a-zA-Z0-9_.]*$/, "table invalida");

const dbSelectSchema = z.object({
  table: tableNameSchema,
  columns: z.string().trim().min(1).optional(),
  filters: simpleFiltersSchema.optional(),
  orderBy: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(MAX_SELECT_LIMIT).optional(),
});

const dbInsertSchema = z.object({
  table: tableNameSchema,
  data: z.record(z.string(), z.unknown()),
});

const dbUpdateSchema = z.object({
  table: tableNameSchema,
  filters: simpleFiltersSchema,
  data: z.record(z.string(), z.unknown()),
});

const dbDeleteSchema = z.object({
  table: tableNameSchema,
  filters: simpleFiltersSchema,
  confirm: z.boolean(),
});

const dbRpcSchema = z.object({
  functionName: z.string().trim().min(1, "functionName es obligatorio"),
  args: z.record(z.string(), z.unknown()).optional(),
});

const backendSchemaSchema = z.object({
  resource: z.enum(["tables", "columns", "rpcs", "buckets", "all"]).optional().default("all"),
  table: tableNameSchema.optional(),
});

const storageListBucketsSchema = z.object({});
const storageListObjectsSchema = z.object({
  bucket: z.string().trim().min(1, "bucket es obligatorio"),
  prefix: z.string().trim().optional(),
  limit: z.number().int().positive().max(MAX_STORAGE_LIST_LIMIT).optional(),
});

const storageUploadTextSchema = z.object({
  bucket: z.string().trim().min(1, "bucket es obligatorio"),
  path: z.string().trim().min(1, "path es obligatorio"),
  content: z.string(),
  contentType: z.string().trim().optional(),
  upsert: z.boolean().optional().default(true),
});

const openAiFileUploadSchema = z.object({
  download_url: z.string().url("file.download_url debe ser una URL valida"),
  file_id: z.string().trim().min(1).optional(),
  mime_type: z.string().trim().min(1).optional(),
  file_name: z.string().trim().min(1).optional(),
});

const taskAttachmentUploadSchema = z
  .object({
    taskId: z.string().uuid("taskId debe ser un UUID"),
    file: openAiFileUploadSchema.optional(),
    fileName: z.string().trim().min(1).optional(),
    fileBase64: z.string().trim().min(1).optional(),
    mimeType: z.string().trim().min(1).optional(),
    upsert: z.boolean().optional().default(false),
  })
  .superRefine((input, ctx) => {
    const hasFileParam = Boolean(input.file);
    const hasBase64 = Boolean(input.fileBase64);

    if (!hasFileParam && !hasBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes enviar file o fileBase64.",
      });
    }

    if (hasFileParam && hasBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Usa file o fileBase64, no ambos al mismo tiempo.",
      });
    }

    if (hasBase64 && !input.fileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fileName es obligatorio cuando usas fileBase64.",
        path: ["fileName"],
      });
    }

    if (hasBase64 && !input.mimeType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "mimeType es obligatorio cuando usas fileBase64.",
        path: ["mimeType"],
      });
    }
  });

const storageDeleteSchema = z.object({
  bucket: z.string().trim().min(1, "bucket es obligatorio"),
  paths: z.array(z.string().trim().min(1)).min(1).max(MAX_STORAGE_DELETE_BATCH),
  confirm: z.boolean(),
});

const authListUsersSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  perPage: z.number().int().positive().max(MAX_AUTH_LIST_PER_PAGE).optional().default(50),
});

const authGetUserSchema = z.object({
  userId: z.string().uuid("userId debe ser un UUID"),
});

const authCreateUserSchema = z.object({
  email: z.string().email("email invalido"),
  password: z.string().min(6, "password debe tener al menos 6 caracteres").optional(),
  emailConfirm: z.boolean().optional().default(false),
  phone: z.string().trim().optional(),
  userMetadata: z.record(z.string(), z.unknown()).optional(),
  appMetadata: z.record(z.string(), z.unknown()).optional(),
});

const authUpdateUserSchema = z.object({
  userId: z.string().uuid("userId debe ser un UUID"),
  email: z.string().email("email invalido").optional(),
  password: z.string().min(6, "password debe tener al menos 6 caracteres").optional(),
  phone: z.string().trim().optional(),
  userMetadata: z.record(z.string(), z.unknown()).optional(),
  appMetadata: z.record(z.string(), z.unknown()).optional(),
  banDuration: z.string().trim().optional(),
  emailConfirm: z.boolean().optional(),
});

const authDeleteUserSchema = z.object({
  userId: z.string().uuid("userId debe ser un UUID"),
  confirm: z.boolean(),
  shouldSoftDelete: z.boolean().optional().default(false),
});

const agentActionInputSchema = z.object({
  action_type: z.string().trim().min(2, "El tipo de accion es obligatorio"),
  entity_type: z.string().trim().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  payment_id: z.string().uuid().optional().nullable(),
  recurring_charge_id: z.string().uuid().optional().nullable(),
  input_text: z.string().trim().optional().nullable(),
  result: z.record(z.string(), z.unknown()).optional().nullable(),
  status: z.enum(["success", "failed", "pending"]).default("pending"),
  error_message: z.string().trim().optional().nullable(),
});

type DbSelectInput = z.infer<typeof dbSelectSchema>;
type DbInsertInput = z.infer<typeof dbInsertSchema>;
type DbUpdateInput = z.infer<typeof dbUpdateSchema>;
type DbDeleteInput = z.infer<typeof dbDeleteSchema>;
type DbRpcInput = z.infer<typeof dbRpcSchema>;
type BackendSchemaInput = z.infer<typeof backendSchemaSchema>;
type StorageListBucketsInput = z.infer<typeof storageListBucketsSchema>;
type StorageListObjectsInput = z.infer<typeof storageListObjectsSchema>;
type StorageUploadTextInput = z.infer<typeof storageUploadTextSchema>;
type OpenAiFileUploadInput = z.infer<typeof openAiFileUploadSchema>;
type TaskAttachmentUploadInput = z.infer<typeof taskAttachmentUploadSchema>;
type StorageDeleteInput = z.infer<typeof storageDeleteSchema>;
type AuthListUsersInput = z.infer<typeof authListUsersSchema>;
type AuthGetUserInput = z.infer<typeof authGetUserSchema>;
type AuthCreateUserInput = z.infer<typeof authCreateUserSchema>;
type AuthUpdateUserInput = z.infer<typeof authUpdateUserSchema>;
type AuthDeleteUserInput = z.infer<typeof authDeleteUserSchema>;
type AgentActionInput = z.infer<typeof agentActionInputSchema>;

type ToolCallResult = {
  content: Array<{ type: "text"; text: string }>;
};

type PostgrestOpenApi = {
  paths?: Record<string, unknown>;
  definitions?: Record<
    string,
    {
      properties?: Record<string, { format?: string; type?: string }>;
      required?: string[];
    }
  >;
};

async function logAgentAction(context: AgentServerContext, input: AgentActionInput) {
  const parsedInput = agentActionInputSchema.parse(input);

  const { error } = await context.supabaseClient.from("agent_actions").insert([
    {
      user_id: context.userId,
      action_type: parsedInput.action_type,
      entity_type: parsedInput.entity_type ?? null,
      entity_id: parsedInput.entity_id ?? null,
      project_id: parsedInput.project_id ?? null,
      task_id: parsedInput.task_id ?? null,
      client_id: parsedInput.client_id ?? null,
      payment_id: parsedInput.payment_id ?? null,
      recurring_charge_id: parsedInput.recurring_charge_id ?? null,
      input_text: parsedInput.input_text ?? null,
      result: parsedInput.result ?? null,
      status: parsedInput.status,
      error_message: parsedInput.error_message ?? null,
    },
  ]);

  if (error) {
    throw error;
  }
}

async function tryLogAgentFailure(
  context: AgentServerContext,
  input: Omit<AgentActionInput, "status"> & { error_message: string }
) {
  try {
    await logAgentAction(context, {
      ...input,
      status: "failed",
    });
  } catch {
    // no-op
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureNonEmptyFilters(filters: SimpleFilters, action: "update" | "delete") {
  if (Object.keys(filters).length === 0) {
    throw new ToolExecutionError(`No se permite ${action} sin filtros.`);
  }
}

function sanitizeColumns(columns?: string) {
  if (!columns) {
    return "*";
  }

  const trimmed = columns.trim();
  if (trimmed === "*") {
    return "*";
  }

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new ToolExecutionError("columns invalido.");
  }

  for (const part of parts) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
      throw new ToolExecutionError("columns invalido. Usa solo nombres simples de columna.");
    }
  }

  return parts.join(", ");
}

function parseOrderBy(orderBy?: string) {
  if (!orderBy) return null;

  const trimmed = orderBy.trim();
  const [column, directionRaw] = trimmed.includes(":")
    ? trimmed.split(":", 2)
    : trimmed.split(/\s+/, 2);

  const direction = directionRaw?.toLowerCase() === "desc" ? "desc" : "asc";
  const safeColumn = column.trim();

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(safeColumn)) {
    throw new ToolExecutionError("orderBy invalido. Usa solo nombres simples de columna.");
  }

  return {
    column: safeColumn,
    ascending: direction !== "desc",
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

function normalizePublicTableName(table: string) {
  const trimmed = table.trim();
  const parts = trimmed.split(".");

  if (parts.length === 1) return parts[0];
  if (parts.length === 2 && parts[0] === "public") return parts[1];

  throw new ToolExecutionError("Solo se permiten tablas del schema public en las tools genericas.");
}

function normalizePublicFunctionName(functionName: string) {
  const trimmed = functionName.trim();
  const parts = trimmed.split(".");

  if (parts.length === 1) return parts[0];
  if (parts.length === 2 && parts[0] === "public") return parts[1];

  throw new ToolExecutionError("Solo se permiten funciones del schema public en la tool RPC.");
}

async function getPostgrestOpenApi() {
  if (cachedOpenApi) {
    return cachedOpenApi;
  }

  const config = getConfig();
  const response = await fetch(`${config.SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: config.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/openapi+json",
    },
  });

  if (!response.ok) {
    throw new ToolExecutionError(`No se pudo cargar el contrato OpenAPI del backend (${response.status}).`);
  }

  cachedOpenApi = (await response.json()) as PostgrestOpenApi;
  return cachedOpenApi;
}

async function getPublicTableNames() {
  const openApi = await getPostgrestOpenApi();
  return new Set(
    Object.keys(openApi.paths ?? {})
      .filter((path) => /^\/[a-zA-Z_][a-zA-Z0-9_]*$/.test(path))
      .map((path) => path.slice(1))
  );
}

async function getPublicFunctionNames() {
  const openApi = await getPostgrestOpenApi();
  return new Set(
    Object.keys(openApi.paths ?? {})
      .filter((path) => path.startsWith("/rpc/"))
      .map((path) => path.replace("/rpc/", ""))
  );
}

async function getPublicTableColumns(table: string) {
  const openApi = await getPostgrestOpenApi();
  return new Set(Object.keys(openApi.definitions?.[table]?.properties ?? {}));
}

async function ensurePublicTableAllowed(table: string) {
  const normalizedTable = normalizePublicTableName(table);

  if (
    AUTH_BLOCKED_DB_TABLES.includes(table as never) ||
    AUTH_BLOCKED_DB_TABLES.includes(normalizedTable as never)
  ) {
    throw new ToolExecutionError(`La tabla ${table} no se puede operar desde las tools genericas.`);
  }

  const publicTables = await getPublicTableNames();
  if (!publicTables.has(normalizedTable)) {
    throw new ToolExecutionError(`La tabla public.${normalizedTable} no existe o no esta expuesta.`);
  }

  return normalizedTable;
}

function ensureTableReadAllowed(table: string) {
  if (PROTECTED_READ_TABLES.includes(table as never)) {
    throw new ToolExecutionError(`La tabla ${table} esta protegida para lectura generica.`);
  }
}

function ensureTableWriteAllowed(table: string, action: "insert" | "update" | "delete") {
  if (table === "task_attachments") {
    throw new ToolExecutionError(
      "La tabla task_attachments esta protegida para escritura generica. Usa nexus_task_attachment_upload para adjuntar archivos."
    );
  }

  if (PROTECTED_WRITE_TABLES.includes(table as never)) {
    throw new ToolExecutionError(`La tabla ${table} esta protegida para ${action}.`);
  }
}

function ensureGenericAgentActionsWriteBlocked(table: string) {
  if (table === "agent_actions") {
    throw new ToolExecutionError("agent_actions solo permite inserciones desde la auditoria interna.");
  }
}

function enforceActorColumns(
  payload: Record<string, unknown>,
  columns: Set<string>,
  context: AgentServerContext,
  mode: "insert" | "update"
) {
  for (const column of ENFORCED_ACTOR_COLUMNS) {
    if (!columns.has(column) || payload[column] === undefined || payload[column] === null) {
      continue;
    }

    if (payload[column] !== context.userId) {
      throw new ToolExecutionError(
        `No se permite suplantar ${column} en ${mode}. Debe coincidir con NEXUS_MCP_ALLOWED_USER_ID.`
      );
    }
  }

  if (mode === "insert") {
    for (const column of DEFAULT_ACTOR_COLUMNS) {
      if (columns.has(column) && payload[column] === undefined) {
        payload[column] = context.userId;
      }
    }
  }
}

async function sanitizeInsertData(
  context: AgentServerContext,
  table: string,
  data: Record<string, unknown>
) {
  if (!isPlainRecord(data) || Object.keys(data).length === 0) {
    throw new ToolExecutionError("data debe ser un objeto no vacio.");
  }

  const payload = { ...data };
  const columns = await getPublicTableColumns(table);
  enforceActorColumns(payload, columns, context, "insert");

  return payload;
}

async function sanitizeUpdateData(
  context: AgentServerContext,
  table: string,
  data: Record<string, unknown>
) {
  if (!isPlainRecord(data) || Object.keys(data).length === 0) {
    throw new ToolExecutionError("data debe ser un objeto no vacio.");
  }

  const payload = { ...data };
  const columns = await getPublicTableColumns(table);
  enforceActorColumns(payload, columns, context, "update");
  return payload;
}

function buildEntityMetadata(table: string, rows: Record<string, unknown>[]) {
  const firstRow = rows[0] ?? {};

  return {
    entity_type: table,
    entity_id: typeof firstRow.id === "string" ? firstRow.id : undefined,
    project_id: typeof firstRow.project_id === "string" ? firstRow.project_id : undefined,
    task_id: typeof firstRow.task_id === "string" ? firstRow.task_id : undefined,
    client_id: typeof firstRow.client_id === "string" ? firstRow.client_id : undefined,
    payment_id: typeof firstRow.payment_id === "string" ? firstRow.payment_id : undefined,
    recurring_charge_id:
      typeof firstRow.recurring_charge_id === "string" ? firstRow.recurring_charge_id : undefined,
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
    status: "success",
  });
}

async function auditFailure(context: AgentServerContext, audit: AgentAuditContext, error: unknown) {
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
    error_message: error instanceof Error ? error.message : "Error desconocido",
  });
}

async function selectRows(
  context: AgentServerContext,
  input: DbSelectInput,
  audit: AgentAuditContext
): Promise<DatabaseSelectResult> {
  try {
    const table = await ensurePublicTableAllowed(input.table);
    ensureTableReadAllowed(table);
    const columns = sanitizeColumns(input.columns);
    const limit = Math.min(input.limit ?? 20, MAX_SELECT_LIMIT);
    let query: any = context.supabaseClient.schema("public").from(table).select(columns);
    query = applyFilters(query, input.filters);

    const orderBy = parseOrderBy(input.orderBy);
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }

    const { data, error } = await query.limit(limit);
    if (error) throw new ToolExecutionError(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    await auditSuccess(context, audit, { table, count: rows.length, limit });

    return { table, count: rows.length, rows };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function insertRow(
  context: AgentServerContext,
  input: DbInsertInput,
  audit: AgentAuditContext
): Promise<DatabaseMutationResult> {
  try {
    const table = await ensurePublicTableAllowed(input.table);
    ensureGenericAgentActionsWriteBlocked(table);
    ensureTableWriteAllowed(table, "insert");

    const payload = await sanitizeInsertData(context, table, input.data);
    const { data, error } = await (context.supabaseClient
      .schema("public")
      .from(table)
      .insert([payload])
      .select("*") as any);

    if (error) throw new ToolExecutionError(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    Object.assign(audit, buildEntityMetadata(table, rows));

    await auditSuccess(context, audit, {
      table,
      inserted_count: rows.length,
      ids: rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === "string")
        .slice(0, 5),
    });

    return { table, count: rows.length, rows };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function updateRows(
  context: AgentServerContext,
  input: DbUpdateInput,
  audit: AgentAuditContext
): Promise<DatabaseMutationResult> {
  try {
    const table = await ensurePublicTableAllowed(input.table);
    ensureGenericAgentActionsWriteBlocked(table);
    ensureTableWriteAllowed(table, "update");
    ensureNonEmptyFilters(input.filters, "update");

    const payload = await sanitizeUpdateData(context, table, input.data);
    let query: any = context.supabaseClient.schema("public").from(table).update(payload);
    query = applyFilters(query, input.filters);

    const { data, error } = await query.select("*");
    if (error) throw new ToolExecutionError(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    Object.assign(audit, buildEntityMetadata(table, rows));

    await auditSuccess(context, audit, { table, updated_count: rows.length });
    return { table, count: rows.length, rows };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function deleteRows(
  context: AgentServerContext,
  input: DbDeleteInput,
  audit: AgentAuditContext
): Promise<DatabaseMutationResult> {
  try {
    const table = await ensurePublicTableAllowed(input.table);
    ensureGenericAgentActionsWriteBlocked(table);
    ensureTableWriteAllowed(table, "delete");
    ensureNonEmptyFilters(input.filters, "delete");

    if (input.confirm !== true) {
      throw new ToolExecutionError("confirm debe ser true para ejecutar delete.");
    }

    let query: any = context.supabaseClient.schema("public").from(table).delete();
    query = applyFilters(query, input.filters);

    const { data, error } = await query.select("*");
    if (error) throw new ToolExecutionError(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    Object.assign(audit, buildEntityMetadata(table, rows));

    await auditSuccess(context, audit, {
      table,
      deleted_count: rows.length,
      confirmed: true,
    });

    return { table, count: rows.length, rows };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function executeRpc(
  context: AgentServerContext,
  input: DbRpcInput,
  audit: AgentAuditContext
): Promise<DatabaseRpcResult> {
  try {
    const functionName = normalizePublicFunctionName(input.functionName);
    const publicFunctions = await getPublicFunctionNames();
    if (!publicFunctions.has(functionName)) {
      throw new ToolExecutionError(`La funcion public.${functionName} no existe o no esta expuesta.`);
    }

    if (!getConfig().NEXUS_MCP_ALLOWED_RPCS.includes(functionName)) {
      throw new ToolExecutionError(
        `La funcion public.${functionName} no esta permitida por NEXUS_MCP_ALLOWED_RPCS.`
      );
    }

    const { data, error } = await context.supabaseClient.rpc(functionName, input.args ?? {});
    if (error) throw new ToolExecutionError(error.message);

    await auditSuccess(context, audit, {
      functionName,
      hasArgs: !!input.args && Object.keys(input.args).length > 0,
    });

    return { functionName, data };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

function extractTables(openApi: PostgrestOpenApi) {
  return Object.keys(openApi.paths ?? {})
    .filter((path) => /^\/[a-zA-Z_][a-zA-Z0-9_]*$/.test(path))
    .map((path) => ({ name: path.slice(1), type: "BASE TABLE" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function extractColumns(openApi: PostgrestOpenApi, table?: string) {
  const definitions = openApi.definitions ?? {};
  const targetTables = table ? [table] : Object.keys(definitions);

  return targetTables
    .flatMap((tableName) => {
      const definition = definitions[tableName];
      const properties = definition?.properties ?? {};
      const required = new Set(definition?.required ?? []);

      return Object.entries(properties).map(([columnName, metadata]) => ({
        table: tableName,
        column: columnName,
        dataType: metadata?.format ?? metadata?.type ?? "unknown",
        isNullable: !required.has(columnName),
      }));
    })
    .sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`));
}

function extractRpcs(openApi: PostgrestOpenApi) {
  return Object.keys(openApi.paths ?? {})
    .filter((path) => path.startsWith("/rpc/"))
    .map((path) => ({ name: path.replace("/rpc/", ""), returnType: null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getBackendSchema(
  context: AgentServerContext,
  input: BackendSchemaInput,
  audit: AgentAuditContext
): Promise<BackendSchemaResult> {
  try {
    const openApi = await getPostgrestOpenApi();
    const result: BackendSchemaResult = { resource: input.resource };

    if (input.resource === "tables" || input.resource === "all") {
      result.tables = extractTables(openApi);
    }

    if (input.resource === "columns" || input.resource === "all") {
      result.columns = extractColumns(openApi, input.table);
    }

    if (input.resource === "rpcs" || input.resource === "all") {
      result.rpcs = extractRpcs(openApi);
    }

    if (input.resource === "buckets" || input.resource === "all") {
      const { data, error } = await context.supabaseClient.storage.listBuckets();
      if (error) throw new ToolExecutionError(error.message);

      result.buckets = (data ?? []).map((bucket: any) => ({
        id: bucket.id,
        name: bucket.name,
        public: bucket.public ?? null,
      }));
    }

    await auditSuccess(context, audit, {
      resource: input.resource,
      tables: result.tables?.length ?? 0,
      columns: result.columns?.length ?? 0,
      rpcs: result.rpcs?.length ?? 0,
      buckets: result.buckets?.length ?? 0,
    });

    return result;
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function listStorageBuckets(
  context: AgentServerContext,
  _input: StorageListBucketsInput,
  audit: AgentAuditContext
): Promise<StorageListBucketsResult> {
  try {
    const { data, error } = await context.supabaseClient.storage.listBuckets();
    if (error) throw new ToolExecutionError(error.message);

    const buckets = (data ?? []).map((bucket: any) => ({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public ?? null,
      fileSizeLimit: bucket.file_size_limit ?? null,
    }));

    await auditSuccess(context, audit, { count: buckets.length });
    return { count: buckets.length, buckets };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function listStorageObjects(
  context: AgentServerContext,
  input: StorageListObjectsInput,
  audit: AgentAuditContext
): Promise<StorageListObjectsResult> {
  try {
    const { data, error } = await context.supabaseClient.storage.from(input.bucket).list(input.prefix, {
      limit: input.limit ?? 50,
    });

    if (error) throw new ToolExecutionError(error.message);
    const objects = ((data ?? []) as unknown[]).map((item) => ({ ...(item as Record<string, unknown>) }));

    await auditSuccess(context, audit, { bucket: input.bucket, count: objects.length });
    return { bucket: input.bucket, count: objects.length, objects };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function uploadStorageText(
  context: AgentServerContext,
  input: StorageUploadTextInput,
  audit: AgentAuditContext
): Promise<StorageUploadTextResult> {
  try {
    const contentType = input.contentType ?? "text/plain; charset=utf-8";
    const { error } = await context.supabaseClient.storage.from(input.bucket).upload(input.path, input.content, {
      contentType,
      upsert: input.upsert ?? true,
    });

    if (error) throw new ToolExecutionError(error.message);
    await auditSuccess(context, audit, { bucket: input.bucket, path: input.path, contentType });
    return { bucket: input.bucket, path: input.path, contentType };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

function decodeBase64Payload(base64Payload: string) {
  const normalized = base64Payload.includes(",")
    ? base64Payload.slice(base64Payload.indexOf(",") + 1)
    : base64Payload;

  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    throw new ToolExecutionError("fileBase64 no tiene un formato base64 valido.");
  }
}

function sanitizeAttachmentFileName(fileName: string) {
  return fileName.replace(/[^\w.\-]+/g, "_");
}

function inferDownloadFileName(downloadUrl: string) {
  try {
    const pathname = new URL(downloadUrl).pathname;
    const rawName = pathname.split("/").pop();
    return rawName ? decodeURIComponent(rawName) : "attachment.bin";
  } catch {
    return "attachment.bin";
  }
}

async function resolveTaskAttachmentSource(
  input: TaskAttachmentUploadInput
): Promise<{ fileBytes: Uint8Array; fileName: string; mimeType: string }> {
  if (input.fileBase64) {
    return {
      fileBytes: decodeBase64Payload(input.fileBase64),
      fileName: input.fileName ?? "attachment.bin",
      mimeType: input.mimeType ?? "application/octet-stream",
    };
  }

  const fileRef = input.file as OpenAiFileUploadInput | undefined;
  if (!fileRef?.download_url) {
    throw new ToolExecutionError("Debes enviar file o fileBase64 para adjuntar a la tarea.");
  }

  const response = await fetch(fileRef.download_url);
  if (!response.ok) {
    throw new ToolExecutionError(`No se pudo descargar el archivo adjunto (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);
  const mimeType =
    input.mimeType ??
    fileRef.mime_type ??
    response.headers.get("content-type")?.split(";")[0]?.trim() ??
    "application/octet-stream";
  const fileName =
    input.fileName ??
    fileRef.file_name ??
    inferDownloadFileName(fileRef.download_url);

  return {
    fileBytes,
    fileName,
    mimeType,
  };
}

async function uploadTaskAttachment(
  context: AgentServerContext,
  input: TaskAttachmentUploadInput,
  audit: AgentAuditContext
): Promise<TaskAttachmentUploadResult> {
  const { fileBytes, fileName, mimeType } = await resolveTaskAttachmentSource(input);
  const fileSize = fileBytes.byteLength;

  if (fileSize < 1) {
    throw new ToolExecutionError("El archivo adjunto esta vacio.");
  }

  if (fileSize > MAX_TASK_ATTACHMENT_BYTES) {
    throw new ToolExecutionError("El archivo adjunto excede el maximo permitido de 10MB.");
  }

  const safeFileName = sanitizeAttachmentFileName(fileName);
  const filePath = `${input.taskId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  try {
    const { error: uploadError } = await context.supabaseClient.storage
      .from(TASK_ATTACHMENTS_BUCKET)
      .upload(filePath, fileBytes, {
        contentType: mimeType,
        upsert: input.upsert ?? false,
      });

    if (uploadError) {
      throw new ToolExecutionError(uploadError.message);
    }

    const uploaderIsManager = context.userRole === "admin" || context.userRole === "pm";
    const uploaderIsDev = context.userRole === "dev";

    const { data: attachmentRow, error: attachmentError } = await context.supabaseClient
      .from("task_attachments")
      .insert({
        task_id: input.taskId,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        file_type: mimeType,
        uploaded_by: context.userId,
        viewed_by_pm: uploaderIsManager,
        viewed_by_dev: uploaderIsDev,
      })
      .select("id")
      .single();

    if (attachmentError || !attachmentRow) {
      await context.supabaseClient.storage.from(TASK_ATTACHMENTS_BUCKET).remove([filePath]);
      throw new ToolExecutionError(attachmentError?.message ?? "No se pudo guardar el adjunto.");
    }

    const taskUpdates: Record<string, unknown> = {
      last_attachment_by: context.userId,
      last_attachment_at: new Date().toISOString(),
    };

    if (uploaderIsDev) {
      taskUpdates.has_new_attachments_for_pm = true;
    } else if (uploaderIsManager) {
      taskUpdates.has_new_attachments_for_dev = true;
    }

    const { error: taskUpdateError } = await context.supabaseClient
      .from("tasks")
      .update(taskUpdates)
      .eq("id", input.taskId);

    if (taskUpdateError) {
      throw new ToolExecutionError(taskUpdateError.message);
    }

    await auditSuccess(context, audit, {
      attachmentId: attachmentRow.id,
      bucket: TASK_ATTACHMENTS_BUCKET,
      fileName,
      filePath,
      fileSize,
      mimeType,
    });

    return {
      attachmentId: attachmentRow.id,
      taskId: input.taskId,
      bucket: TASK_ATTACHMENTS_BUCKET,
      fileName,
      filePath,
      fileSize,
      mimeType,
    };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function deleteStorageObjects(
  context: AgentServerContext,
  input: StorageDeleteInput,
  audit: AgentAuditContext
): Promise<StorageDeleteResult> {
  try {
    if (input.confirm !== true) {
      throw new ToolExecutionError("confirm debe ser true para eliminar objetos de storage.");
    }

    const { data, error } = await context.supabaseClient.storage.from(input.bucket).remove(input.paths);
    if (error) throw new ToolExecutionError(error.message);

    await auditSuccess(context, audit, { bucket: input.bucket, deleted_count: input.paths.length });
    return { bucket: input.bucket, deletedCount: (data ?? []).length || input.paths.length, paths: input.paths };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

function sanitizeUser(user: any): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    role: user.role ?? null,
    created_at: user.created_at ?? null,
    updated_at: user.updated_at ?? null,
    email_confirmed_at: user.email_confirmed_at ?? null,
    app_metadata: user.app_metadata ?? {},
    user_metadata: user.user_metadata ?? {},
    banned_until: user.banned_until ?? null,
  };
}

async function listAuthUsers(
  context: AgentServerContext,
  input: AuthListUsersInput,
  audit: AgentAuditContext
): Promise<AuthListUsersResult> {
  try {
    const { data, error } = await context.supabaseClient.auth.admin.listUsers({
      page: input.page,
      perPage: input.perPage,
    });

    if (error) throw new ToolExecutionError(error.message);
    const users = (data?.users ?? []).map(sanitizeUser);
    await auditSuccess(context, audit, { count: users.length, page: input.page, perPage: input.perPage });
    return { count: users.length, users };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function getAuthUser(
  context: AgentServerContext,
  input: AuthGetUserInput,
  audit: AgentAuditContext
): Promise<AuthUserResult> {
  try {
    const { data, error } = await context.supabaseClient.auth.admin.getUserById(input.userId);
    if (error) throw new ToolExecutionError(error.message);
    if (!data.user) throw new ToolExecutionError("Usuario no encontrado.");

    await auditSuccess(context, audit, { user_id: input.userId });
    return { user: sanitizeUser(data.user) };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function createAuthUser(
  context: AgentServerContext,
  input: AuthCreateUserInput,
  audit: AgentAuditContext
): Promise<AuthUserResult> {
  try {
    const { data, error } = await context.supabaseClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: input.emailConfirm,
      phone: input.phone,
      user_metadata: input.userMetadata,
      app_metadata: input.appMetadata,
    });

    if (error) throw new ToolExecutionError(error.message);
    if (!data.user) throw new ToolExecutionError("No se pudo crear el usuario.");

    await auditSuccess(context, audit, { user_id: data.user.id, email: data.user.email ?? input.email });
    return { user: sanitizeUser(data.user) };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function updateAuthUser(
  context: AgentServerContext,
  input: AuthUpdateUserInput,
  audit: AgentAuditContext
): Promise<AuthUserResult> {
  try {
    const { data, error } = await context.supabaseClient.auth.admin.updateUserById(input.userId, {
      email: input.email,
      password: input.password,
      phone: input.phone,
      user_metadata: input.userMetadata,
      app_metadata: input.appMetadata,
      ban_duration: input.banDuration,
      email_confirm: input.emailConfirm,
    });

    if (error) throw new ToolExecutionError(error.message);
    if (!data.user) throw new ToolExecutionError("No se pudo actualizar el usuario.");

    await auditSuccess(context, audit, { user_id: input.userId, updated: true });
    return { user: sanitizeUser(data.user) };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

async function deleteAuthUser(
  context: AgentServerContext,
  input: AuthDeleteUserInput,
  audit: AgentAuditContext
): Promise<{ userId: string; deleted: true }> {
  try {
    if (input.confirm !== true) {
      throw new ToolExecutionError("confirm debe ser true para eliminar un usuario auth.");
    }

    const { error } = await context.supabaseClient.auth.admin.deleteUser(input.userId, input.shouldSoftDelete);
    if (error) throw new ToolExecutionError(error.message);

    await auditSuccess(context, audit, { user_id: input.userId, soft_delete: input.shouldSoftDelete });
    return { userId: input.userId, deleted: true };
  } catch (error) {
    await auditFailure(context, audit, error);
    throw error;
  }
}

type McpToolHandlerInput = { context: AgentServerContext; input: unknown };

const mcpToolHandlers = {
  nexus_backend_schema: async ({ context, input }: McpToolHandlerInput) =>
    getBackendSchema(context, backendSchemaSchema.parse(input ?? {}), {
      enabled: true,
      action_type: "nexus_backend_schema",
      entity_type: "schema",
      input_text: "mcp:nexus_backend_schema",
    }),
  nexus_db_select: async ({ context, input }: McpToolHandlerInput) => {
    const parsed = dbSelectSchema.parse(input ?? {});
    return selectRows(context, parsed, {
      enabled: true,
      action_type: "nexus_db_select",
      entity_type: parsed.table,
      input_text: "mcp:nexus_db_select",
    });
  },
  nexus_db_insert: async ({ context, input }: McpToolHandlerInput) => {
    const parsed = dbInsertSchema.parse(input);
    return insertRow(context, parsed, {
      enabled: true,
      action_type: "nexus_db_insert",
      entity_type: parsed.table,
      input_text: "mcp:nexus_db_insert",
    });
  },
  nexus_db_update: async ({ context, input }: McpToolHandlerInput) => {
    const parsed = dbUpdateSchema.parse(input);
    return updateRows(context, parsed, {
      enabled: true,
      action_type: "nexus_db_update",
      entity_type: parsed.table,
      input_text: "mcp:nexus_db_update",
    });
  },
  nexus_db_delete: async ({ context, input }: McpToolHandlerInput) => {
    const parsed = dbDeleteSchema.parse(input);
    return deleteRows(context, parsed, {
      enabled: true,
      action_type: "nexus_db_delete",
      entity_type: parsed.table,
      input_text: "mcp:nexus_db_delete",
    });
  },
  nexus_db_rpc: async ({ context, input }: McpToolHandlerInput) =>
    executeRpc(context, dbRpcSchema.parse(input ?? {}), {
      enabled: true,
      action_type: "nexus_db_rpc",
      entity_type: "rpc",
      input_text: "mcp:nexus_db_rpc",
    }),
  nexus_storage_list_buckets: async ({ context, input }: McpToolHandlerInput) =>
    listStorageBuckets(context, storageListBucketsSchema.parse(input ?? {}), {
      enabled: true,
      action_type: "nexus_storage_list_buckets",
      entity_type: "storage_bucket",
      input_text: "mcp:nexus_storage_list_buckets",
    }),
  nexus_storage_list_objects: async ({ context, input }: McpToolHandlerInput) =>
    listStorageObjects(context, storageListObjectsSchema.parse(input), {
      enabled: true,
      action_type: "nexus_storage_list_objects",
      entity_type: "storage_object",
      input_text: "mcp:nexus_storage_list_objects",
    }),
  nexus_storage_upload_text: async ({ context, input }: McpToolHandlerInput) =>
    uploadStorageText(context, storageUploadTextSchema.parse(input), {
      enabled: true,
      action_type: "nexus_storage_upload_text",
      entity_type: "storage_object",
      input_text: "mcp:nexus_storage_upload_text",
    }),
  nexus_task_attachment_upload: async ({ context, input }: McpToolHandlerInput) => {
    const parsed = taskAttachmentUploadSchema.parse(input);
    return uploadTaskAttachment(context, parsed, {
      enabled: true,
      action_type: "nexus_task_attachment_upload",
      entity_type: "task_attachment",
      task_id: parsed.taskId,
      input_text: "mcp:nexus_task_attachment_upload",
    });
  },
  nexus_storage_delete: async ({ context, input }: McpToolHandlerInput) =>
    deleteStorageObjects(context, storageDeleteSchema.parse(input), {
      enabled: true,
      action_type: "nexus_storage_delete",
      entity_type: "storage_object",
      input_text: "mcp:nexus_storage_delete",
    }),
  nexus_auth_list_users: async ({ context, input }: McpToolHandlerInput) =>
    listAuthUsers(context, authListUsersSchema.parse(input ?? {}), {
      enabled: true,
      action_type: "nexus_auth_list_users",
      entity_type: "auth_user",
      input_text: "mcp:nexus_auth_list_users",
    }),
  nexus_auth_get_user: async ({ context, input }: McpToolHandlerInput) => {
    const parsed = authGetUserSchema.parse(input);
    return getAuthUser(context, parsed, {
      enabled: true,
      action_type: "nexus_auth_get_user",
      entity_type: "auth_user",
      entity_id: parsed.userId,
      input_text: "mcp:nexus_auth_get_user",
    });
  },
  nexus_auth_create_user: async ({ context, input }: McpToolHandlerInput) =>
    createAuthUser(context, authCreateUserSchema.parse(input), {
      enabled: true,
      action_type: "nexus_auth_create_user",
      entity_type: "auth_user",
      input_text: "mcp:nexus_auth_create_user",
    }),
  nexus_auth_update_user: async ({ context, input }: McpToolHandlerInput) => {
    const parsed = authUpdateUserSchema.parse(input);
    return updateAuthUser(context, parsed, {
      enabled: true,
      action_type: "nexus_auth_update_user",
      entity_type: "auth_user",
      entity_id: parsed.userId,
      input_text: "mcp:nexus_auth_update_user",
    });
  },
  nexus_auth_delete_user: async ({ context, input }: McpToolHandlerInput) => {
    const parsed = authDeleteUserSchema.parse(input);
    return deleteAuthUser(context, parsed, {
      enabled: true,
      action_type: "nexus_auth_delete_user",
      entity_type: "auth_user",
      entity_id: parsed.userId,
      input_text: "mcp:nexus_auth_delete_user",
    });
  },
} as const;

const mcpToolDefinitions = [
  {
    name: "nexus_backend_schema",
    description: "Descubre tablas, columnas, funciones public y buckets disponibles en el backend de Supabase.",
    inputSchema: backendSchemaSchema,
  },
  {
    name: "nexus_db_select",
    description: "Lee filas de cualquier tabla del schema public expuesta en Supabase usando filtros simples por igualdad.",
    inputSchema: dbSelectSchema,
  },
  {
    name: "nexus_db_insert",
    description:
      "Inserta filas en tablas permitidas del schema public, con auditoria obligatoria y user_id por defecto cuando aplica. No usar para tablas protegidas ni tablas respaldadas por Storage como task_attachments.",
    inputSchema: dbInsertSchema,
  },
  {
    name: "nexus_db_update",
    description:
      "Actualiza filas en tablas permitidas del schema public usando filtros obligatorios. No usar para tablas protegidas ni tablas respaldadas por Storage como task_attachments.",
    inputSchema: dbUpdateSchema,
  },
  {
    name: "nexus_db_delete",
    description:
      "Elimina filas en tablas permitidas del schema public solo con confirmacion explicita y filtros obligatorios. No usar para tablas protegidas ni tablas respaldadas por Storage como task_attachments.",
    inputSchema: dbDeleteSchema,
  },
  {
    name: "nexus_db_rpc",
    description: "Ejecuta una funcion RPC del schema public si existe y esta expuesta en Supabase.",
    inputSchema: dbRpcSchema,
  },
  {
    name: "nexus_storage_list_buckets",
    description: "Lista buckets de Supabase Storage disponibles para el backend MCP.",
    inputSchema: storageListBucketsSchema,
  },
  {
    name: "nexus_storage_list_objects",
    description: "Lista objetos de un bucket de Storage con prefijo y limite opcionales.",
    inputSchema: storageListObjectsSchema,
  },
  {
    name: "nexus_storage_upload_text",
    description: "Crea o reemplaza un archivo de texto en Supabase Storage.",
    inputSchema: storageUploadTextSchema,
  },
  {
    name: "nexus_task_attachment_upload",
    description:
      "Adjunta una imagen o archivo a una tarea usando file param de ChatGPT o base64, guardando Storage y metadata en task_attachments.",
    inputSchema: taskAttachmentUploadSchema,
    _meta: {
      "openai/fileParams": ["file"],
    },
  },
  {
    name: "nexus_storage_delete",
    description: "Elimina objetos de Storage solo con confirmacion explicita.",
    inputSchema: storageDeleteSchema,
  },
  {
    name: "nexus_auth_list_users",
    description: "Lista usuarios de Supabase Auth desde backend con service role.",
    inputSchema: authListUsersSchema,
  },
  {
    name: "nexus_auth_get_user",
    description: "Consulta un usuario especifico de Supabase Auth por id.",
    inputSchema: authGetUserSchema,
  },
  {
    name: "nexus_auth_create_user",
    description: "Crea un usuario en Supabase Auth desde backend.",
    inputSchema: authCreateUserSchema,
  },
  {
    name: "nexus_auth_update_user",
    description: "Actualiza un usuario existente de Supabase Auth.",
    inputSchema: authUpdateUserSchema,
  },
  {
    name: "nexus_auth_delete_user",
    description: "Elimina un usuario de Supabase Auth solo con confirmacion explicita.",
    inputSchema: authDeleteUserSchema,
  },
];

async function dispatchTool(toolName: string, input: unknown, identity?: AuthenticatedIdentity) {
  const handler = mcpToolHandlers[toolName as keyof typeof mcpToolHandlers];

  if (!handler) {
    throw new UnsupportedToolError(toolName);
  }

  try {
    return await handler({
      context: buildAgentServerContext(identity),
      input,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new InvalidToolInputError(error.issues.map((issue) => issue.message).join("; "));
    }

    throw new ToolExecutionError(toSafeErrorMessage(error));
  }
}

function createNexusMcpServer(identity?: AuthenticatedIdentity) {
  const server = new McpServer({
    name: "nexus-pm-mcp-edge",
    version: "0.1.0",
  });

  for (const tool of mcpToolDefinitions) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        _meta: tool._meta,
      } as any,
      async (input: Record<string, unknown>) => {
        const result = await dispatchTool(tool.name, input, identity);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        } satisfies ToolCallResult;
      }
    );
  }

  return server;
}

function getFirstHeaderValue(value: string | null) {
  return value?.trim() || null;
}

function extractBearerToken(value: string | null) {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

function buildCorsHeaders(request: Request) {
  const origin = getFirstHeaderValue(request.headers.get("origin"));
  const allowedOrigins = getConfig().MCP_ALLOWED_ORIGINS;
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version, x-mcp-api-key",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version, www-authenticate",
    Vary: "Origin",
  };
}

function jsonResponse(
  request: Request,
  status: number,
  body: Record<string, unknown>,
  extraHeaders?: HeadersInit
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(request),
      ...(extraHeaders ?? {}),
    },
  });
}

function getProjectOrigin() {
  return new URL(getConfig().SUPABASE_URL).origin;
}

function getOAuthIssuer() {
  return `${getProjectOrigin()}/auth/v1`;
}

function getProtectedResourceMetadataUrl(request: Request) {
  return `${getProjectOrigin()}${OAUTH_PROTECTED_RESOURCE_FUNCTION_PATH}`;
}

function getUnauthorizedHeaders(request: Request, error?: "invalid_token") {
  const metadataUrl = getProtectedResourceMetadataUrl(request);
  const challenge = `Bearer realm="Nexus PM MCP", resource_metadata="${metadataUrl}"${error ? `, error="${error}"` : ""}`;
  return { "WWW-Authenticate": challenge };
}

function buildProtectedResourceMetadata(request: Request) {
  return {
    resource: `${getProjectOrigin()}${MCP_BASE_PATH}`,
    authorization_servers: [getOAuthIssuer()],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "profile", "email"],
    resource_documentation: "https://github.com/rickbroken/Nexus-PM",
  };
}

function ensureOriginAllowed(request: Request) {
  const origin = getFirstHeaderValue(request.headers.get("origin"));
  if (!origin) return null;

  if (!getConfig().MCP_ALLOWED_ORIGINS.includes(origin)) {
    return jsonResponse(request, 403, {
      jsonrpc: "2.0",
      error: { code: -32000, message: `Invalid Origin: ${origin}` },
      id: null,
    });
  }

  return null;
}

async function resolveIdentityFromOAuthToken(accessToken: string): Promise<AuthenticatedIdentity> {
  const {
    data: { user },
    error,
  } = await getSupabaseClient().auth.getUser(accessToken);

  if (error || !user) {
    throw new ToolExecutionError("Token OAuth invalido.");
  }

  const requiredRole = getConfig().NEXUS_MCP_ALLOWED_ROLE;
  const profile = await getUserRole(user.id);

  if (profile.role !== requiredRole) {
    throw new ToolExecutionError(`Este MCP requiere rol ${requiredRole}.`);
  }

  return {
    userId: user.id,
    userRole: profile.role,
    authMode: "oauth",
    email: profile.email ?? user.email ?? null,
  };
}

async function ensureAuthorized(request: Request) {
  const expectedApiKey = getConfig().MCP_HTTP_API_KEY;
  const authorization = getFirstHeaderValue(request.headers.get("authorization"));
  const headerApiKey = getFirstHeaderValue(request.headers.get("x-mcp-api-key"));
  const bearerToken = extractBearerToken(authorization);
  const apiKey = bearerToken ?? headerApiKey ?? null;

  if (!apiKey) {
    return {
      identity: null,
      response: jsonResponse(
        request,
        401,
        {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Missing bearer token" },
          id: null,
        },
        getUnauthorizedHeaders(request)
      ),
    };
  }

  if (apiKey !== expectedApiKey) {
    try {
      const identity = await resolveIdentityFromOAuthToken(apiKey);
      return { identity, response: null };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      const status = message.includes("requiere rol") ? 403 : 401;
      return {
        identity: null,
        response: jsonResponse(
          request,
          status,
          {
            jsonrpc: "2.0",
            error: { code: -32001, message },
            id: null,
          },
          getUnauthorizedHeaders(request, "invalid_token")
        ),
      };
    }
  }

  return {
    identity: {
      userId: getConfig().NEXUS_MCP_ALLOWED_USER_ID,
      userRole: getConfig().NEXUS_MCP_ALLOWED_ROLE,
      authMode: "api_key",
      email: null,
    } satisfies AuthenticatedIdentity,
    response: null,
  };
}

async function handleRequest(request: Request) {
  try {
    const pathname = new URL(request.url).pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request) });
    }

    const originError = ensureOriginAllowed(request);
    if (originError) return originError;

    const authResult = await ensureAuthorized(request);
    if (authResult.response) return authResult.response;

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    const identity = authResult.identity ?? undefined;
    const server = createNexusMcpServer(identity);
    await server.connect(transport);

    const response = await transport.handleRequest(request);
    const headers = new Headers(response.headers);
    const corsHeaders = buildCorsHeaders(request);
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof InvalidConfigurationError ? error.message : toSafeErrorMessage(error);

    return jsonResponse(request, 500, {
      jsonrpc: "2.0",
      error: { code: -32603, message },
      id: null,
    });
  }
}

Deno.serve((request) => {
  if (request.method === "POST") {
    return handleRequest(request);
  }

  if (request.method === "GET") {
    return handleRequest(request);
  }

  if (request.method === "DELETE") {
    return handleRequest(request);
  }

  if (request.method === "OPTIONS") {
    return handleRequest(request);
  }

  return jsonResponse(request, 405, {
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed" },
    id: null,
  });
});
