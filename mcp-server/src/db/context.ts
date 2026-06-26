import { getServerConfig } from '../config.js';
import { getServerSupabaseClient } from './supabase.js';
import type { AgentServerContext } from '../services/types.js';

export function buildAgentServerContext(): AgentServerContext {
  const config = getServerConfig();

  return {
    supabaseClient: getServerSupabaseClient(),
    userId: config.NEXUS_MCP_ALLOWED_USER_ID,
    userRole: config.NEXUS_MCP_ALLOWED_ROLE,
  };
}
