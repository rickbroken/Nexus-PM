import 'dotenv/config';
import { z } from 'zod';
import { InvalidConfigurationError } from './errors.js';

const configSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL invalida'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY es obligatoria'),
  NEXUS_MCP_ALLOWED_USER_ID: z.string().uuid('NEXUS_MCP_ALLOWED_USER_ID debe ser un UUID'),
  NEXUS_MCP_ALLOWED_ROLE: z.enum(['admin', 'pm', 'dev', 'advisor']).default('admin'),
});

export type McpServerConfig = z.infer<typeof configSchema>;

let cachedConfig: McpServerConfig | null = null;

export function getServerConfig(): McpServerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new InvalidConfigurationError(
      parsed.error.issues.map((issue) => issue.message).join('; ')
    );
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}
