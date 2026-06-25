import type { AgentApiContext } from '../../src/lib/agent-api/index.js';
import { getServerConfig } from './config.js';
import { getServerSupabaseClient } from './supabase.js';

export function buildAgentApiContext(): AgentApiContext {
  const config = getServerConfig();

  return {
    supabaseClient: getServerSupabaseClient() as AgentApiContext['supabaseClient'],
    userId: config.NEXUS_MCP_ALLOWED_USER_ID,
    userRole: config.NEXUS_MCP_ALLOWED_ROLE,
  };
}
