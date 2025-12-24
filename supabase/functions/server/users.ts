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
 * POST /users/create
 */
export const createUser = async (c: Context) => {
  try {
    // Verify that the requesting user is an admin
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Use REGULAR client to verify user JWT (not admin client!)
    const regularClient = getClient();
    
    // Verify the token and get the user
    const { data: { user: requestingUser }, error: authError } = await regularClient.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.error("Auth error:", authError);
      return c.json({ error: "Invalid JWT", details: authError?.message }, 401);
    }

    console.log(`🔍 Checking if user ${requestingUser.id} (${requestingUser.email}) is admin...`);

    // Use admin client for database operations to bypass RLS
    const adminClient = getAdminClient();
    
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

    // Check if profile already exists (could be created by a trigger)
    const { data: existingProfile } = await adminClient
      .from("users_profiles")
      .select("id")
      .eq("id", authData.user.id)
      .single();

    let profileData;
    
    if (existingProfile) {
      // Profile exists, update it
      console.log(`🔄 Profile already exists for ${authData.user.id}, updating...`);
      
      const { data: updatedProfile, error: profileUpdateError } = await adminClient
        .from("users_profiles")
        .update({
          email: body.email,
          full_name: body.full_name,
          role: body.role,
          avatar_url: body.avatar_url || null,
          is_active: true,
        })
        .eq("id", authData.user.id)
        .select()
        .single();

      if (profileUpdateError) {
        console.error("Error updating user profile:", profileUpdateError);
        
        // Rollback: delete the auth user
        await adminClient.auth.admin.deleteUser(authData.user.id);
        
        return c.json({ error: "Failed to update user profile" }, 500);
      }
      
      profileData = updatedProfile;
    } else {
      // Profile doesn't exist, create it
      console.log(`➕ Creating new profile for ${authData.user.id}...`);
      
      const { data: newProfile, error: profileInsertError } = await adminClient
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
      
      profileData = newProfile;
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
