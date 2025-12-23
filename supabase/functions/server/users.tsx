import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

// Create Supabase Admin client with service role key
const getAdminClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// Create regular client for verifying the requesting user
const getClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "pm" | "dev" | "advisor";
  avatar_url?: string;
}

/**
 * Create a new user with email already confirmed
 * POST /make-server-17d656ff/users/create
 */
export const createUser = async (c: Context) => {
  try {
    // Verify that the requesting user is an admin
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Use admin client for all operations to bypass RLS
    const adminClient = getAdminClient();
    
    // Verify the token and get the user
    const { data: { user: requestingUser }, error: authError } = await adminClient.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.error("Auth error:", authError);
      return c.json({ error: "Unauthorized" }, 401);
    }

    console.log(`🔍 Checking if user ${requestingUser.id} is admin...`);

    // Check if requesting user is admin (using admin client to bypass RLS)
    const { data: profile, error: profileError } = await adminClient
      .from("users_profiles")
      .select("role, email")
      .eq("id", requestingUser.id)
      .single();

    console.log(`👤 User profile:`, profile);
    console.log(`❓ Profile error:`, profileError);

    if (profileError || !profile || profile.role !== "admin") {
      console.error("❌ Not an admin:", { profileError, profile });
      return c.json({ error: "Only admins can create users" }, 403);
    }

    console.log(`✅ User ${profile.email} is admin, proceeding...`);

    // Parse request body
    const body: CreateUserRequest = await c.req.json();

    if (!body.email || !body.password || !body.full_name || !body.role) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Create user with admin client (auto-confirms email)
    
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // ✅ This bypasses email confirmation!
      user_metadata: {
        full_name: body.full_name,
        role: body.role,
      },
    });

    if (createError) {
      console.error("❌ [Supabase] Error creating user in auth:", createError);
      
      // Handle specific error cases
      if (createError.message.includes("already been registered") || createError.message.includes("email_exists")) {
        return c.json({ 
          error: "Ya existe un usuario con este email. Por favor usa otro email." 
        }, 409); // 409 Conflict
      }
      
      return c.json({ error: createError.message }, 400);
    }

    if (!authData.user) {
      return c.json({ error: "User creation failed" }, 500);
    }

    // Create user profile
    const { data: profileData, error: profileInsertError } = await adminClient
      .from("users_profiles")
      .insert([{
        id: authData.user.id,
        email: body.email,
        full_name: body.full_name,
        role: body.role,
        avatar_url: body.avatar_url || null,
        is_active: true,
      }])
      .select()
      .single();

    if (profileInsertError) {
      console.error("Error creating user profile:", profileInsertError);
      
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      
      return c.json({ error: "Failed to create user profile" }, 500);
    }

    console.log(`✅ User created successfully: ${body.email} (${body.role})`);

    return c.json({
      success: true,
      user: profileData,
      message: "User created successfully with email confirmed",
    }, 201);

  } catch (error) {
    console.error("Error in createUser:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, 500);
  }
};