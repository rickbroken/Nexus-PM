import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerConfig } from '../config.js';

export type ServerSupabaseClient = SupabaseClient<any>;

let cachedClient: ServerSupabaseClient | null = null;

export function getServerSupabaseClient(): ServerSupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getServerConfig();
  cachedClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
