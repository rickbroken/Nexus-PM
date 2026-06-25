import { createClient } from '@supabase/supabase-js';
const { VITE_SUPABASE_PROYECT_ID, VITE_SUPABASE_ANON_KEY } = import.meta.env;
const supabaseUrl = `https://${VITE_SUPABASE_PROYECT_ID}.supabase.co`;
const supabaseAnonKey = VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});
