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

const validRoles = ["admin", "pm", "dev", "advisor"] as const;

const getErrorMessage = (error: unknown, fallback = "Error desconocido") => {
  if (error instanceof Error && error.message && error.message !== "{}") {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    for (const key of ["message", "msg", "error", "error_description"]) {
      const value = record[key];
      if (typeof value === "string" && value && value !== "{}") {
        return value;
      }
    }

    const json = JSON.stringify(error);
    if (json && json !== "{}") {
      return json;
    }
  }

  return fallback;
};

const getErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  const record = error as Record<string, unknown>;
  return {
    code: record.code,
    status: record.status,
    name: record.name,
    details: record.details,
    hint: record.hint,
  };
};

const normalizeCreateUserBody = (body: CreateUserRequest) => {
  const email = body.email?.trim().toLowerCase();
  const fullName = body.full_name?.trim();
  const password = body.password;
  const role = body.role;
  const avatarUrl = body.avatar_url?.trim() || null;

  if (!email || !password || !fullName || !role) {
    return { error: "Faltan campos requeridos" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Email inválido" };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  if (!validRoles.includes(role)) {
    return { error: "Rol inválido" };
  }

  if (avatarUrl) {
    try {
      new URL(avatarUrl);
    } catch {
      return { error: "URL de avatar inválida" };
    }
  }

  return {
    data: {
      email,
      password,
      full_name: fullName,
      role,
      avatar_url: avatarUrl,
    },
  };
};

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
    const requestBody: CreateUserRequest = await c.req.json();
    const normalized = normalizeCreateUserBody(requestBody);

    if (normalized.error || !normalized.data) {
      return c.json({ error: normalized.error ?? "Payload inválido" }, 400);
    }

    const body = normalized.data;

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
      const errorMessage = getErrorMessage(createError, "No se pudo crear el usuario en Auth");
      const errorDetails = getErrorDetails(createError);
      
      // Handle specific error cases
      if (errorMessage.includes("already been registered") || errorMessage.includes("email_exists")) {
        return c.json({ 
          error: "Ya existe un usuario con este email. Por favor usa otro email." 
        }, 409); // 409 Conflict
      }
      
      return c.json({
        error: errorMessage,
        ...errorDetails,
      }, 400);
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
        
        return c.json({
          error: "No se pudo actualizar el perfil del usuario",
          details: getErrorMessage(profileUpdateError),
          ...getErrorDetails(profileUpdateError),
        }, 500);
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
        
        return c.json({
          error: "No se pudo crear el perfil del usuario",
          details: getErrorMessage(profileInsertError),
          ...getErrorDetails(profileInsertError),
        }, 500);
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
