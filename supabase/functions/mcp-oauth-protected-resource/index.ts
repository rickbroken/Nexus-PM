import { z } from "npm:zod@4.4.3";

const configSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL invalida"),
});

function getConfig() {
  const parsed = configSchema.safeParse({
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  return parsed.data;
}

function getProjectOrigin() {
  return new URL(getConfig().SUPABASE_URL).origin;
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve((request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  if (request.method !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const origin = getProjectOrigin();
  return jsonResponse(200, {
    resource: `${origin}/functions/v1/mcp`,
    authorization_servers: [`${origin}/auth/v1`],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "profile", "email"],
    resource_documentation: "https://github.com/rickbroken/Nexus-PM",
  });
});
