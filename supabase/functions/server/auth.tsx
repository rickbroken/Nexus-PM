import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function verifyUser(authHeader: string | null) {
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: 'Invalid token' };
    }

    return { user, error: null };
  } catch (error) {
    console.error('Error verifying user:', error);
    return { user: null, error: 'Authentication failed' };
  }
}

export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    return { profile: data, error: null };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { profile: null, error: 'Failed to get profile' };
  }
}
