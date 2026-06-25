import { createClient } from '@supabase/supabase-js';
import { getServerConfig } from './config.js';
let cachedClient = null;
export function getServerSupabaseClient() {
    if (cachedClient) {
        return cachedClient;
    }
    const config = getServerConfig();
    const client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    cachedClient = client;
    return client;
}
