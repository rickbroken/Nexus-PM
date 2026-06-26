import { ToolExecutionError } from '../errors.js';
import { getServerConfig } from '../config.js';
import type {
  AgentAuditContext,
  AgentServerContext,
  BackendSchemaInput,
  BackendSchemaResult,
} from './types.js';
import { logAgentAction, tryLogAgentFailure } from './audit.service.js';

type PostgrestOpenApi = {
  paths?: Record<string, unknown>;
  definitions?: Record<
    string,
    {
      properties?: Record<string, { format?: string; type?: string; description?: string }>;
      required?: string[];
    }
  >;
};

let cachedOpenApi: PostgrestOpenApi | null = null;

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

  cachedOpenApi = (await response.json()) as PostgrestOpenApi;
  return cachedOpenApi;
}

function extractTables(openApi: PostgrestOpenApi) {
  return Object.keys(openApi.paths ?? {})
    .filter((path) => /^\/[a-zA-Z_][a-zA-Z0-9_]*$/.test(path))
    .map((path) => ({
      name: path.slice(1),
      type: 'BASE TABLE',
    }))
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
        dataType: metadata?.format ?? metadata?.type ?? 'unknown',
        isNullable: !required.has(columnName),
      }));
    })
    .sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`));
}

function extractRpcs(openApi: PostgrestOpenApi) {
  return Object.keys(openApi.paths ?? {})
    .filter((path) => path.startsWith('/rpc/'))
    .map((path) => ({
      name: path.replace('/rpc/', ''),
      returnType: null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBackendSchema(
  context: AgentServerContext,
  input: BackendSchemaInput,
  audit: AgentAuditContext
): Promise<BackendSchemaResult> {
  try {
    const openApi = await getPostgrestOpenApi();
    const result: BackendSchemaResult = {
      resource: input.resource,
    };

    if (input.resource === 'tables' || input.resource === 'all') {
      result.tables = extractTables(openApi);
    }

    if (input.resource === 'columns' || input.resource === 'all') {
      result.columns = extractColumns(openApi, input.table);
    }

    if (input.resource === 'rpcs' || input.resource === 'all') {
      result.rpcs = extractRpcs(openApi);
    }

    if (input.resource === 'buckets' || input.resource === 'all') {
      const { data, error } = await context.supabaseClient.storage.listBuckets();
      if (error) throw new ToolExecutionError(error.message);

      result.buckets = (data ?? []).map((bucket: any) => ({
        id: bucket.id,
        name: bucket.name,
        public: bucket.public ?? null,
      }));
    }

    if (audit.enabled) {
      await logAgentAction(context, {
        action_type: audit.action_type,
        entity_type: audit.entity_type ?? 'schema',
        input_text: audit.input_text ?? null,
        result: {
          resource: input.resource,
          tables: result.tables?.length ?? 0,
          columns: result.columns?.length ?? 0,
          rpcs: result.rpcs?.length ?? 0,
          buckets: result.buckets?.length ?? 0,
        },
        status: 'success',
      });
    }

    return result;
  } catch (error) {
    if (audit.enabled) {
      await tryLogAgentFailure(context, {
        action_type: audit.action_type,
        entity_type: audit.entity_type ?? 'schema',
        input_text: audit.input_text ?? null,
        error_message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
    throw error;
  }
}
