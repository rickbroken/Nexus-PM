import { createClient } from '@supabase/supabase-js';
import type { AgentApiContext } from '../../src/lib/agent-api/index.js';
import { getServerConfig } from './config.js';

type ServerSupabaseClient = AgentApiContext['supabaseClient'];

let cachedClient: ServerSupabaseClient | null = null;

export function getServerSupabaseClient(): ServerSupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getServerConfig();
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as unknown as ServerSupabaseClient;
  cachedClient = client;

  return client;
}
