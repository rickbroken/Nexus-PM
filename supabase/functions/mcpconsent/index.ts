import { z } from "npm:zod@4.4.3";

const configSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL invalida"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY es obligatoria"),
});

function getConfig() {
  const parsed = configSchema.safeParse({
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  return parsed.data;
}

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}

function renderConsentPage(request: Request) {
  const config = getConfig();
  const authorizationId = new URL(request.url).searchParams.get("authorization_id") ?? "";

  return htmlResponse(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Autorizar Nexus PM MCP</title>
    <style>
      :root { color-scheme: light; --bg: #f4f1ea; --card: #fffdf8; --border: #ddd3c1; --text: #1f2937; --muted: #6b7280; --accent: #0f766e; --accent-strong: #115e59; --danger: #b91c1c; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; font-family: "Segoe UI", system-ui, sans-serif; background: radial-gradient(circle at top left, rgba(15,118,110,0.12), transparent 28%), linear-gradient(180deg, #f8f4ec 0%, var(--bg) 100%); color: var(--text); display: grid; place-items: center; padding: 24px; }
      .card { width: min(720px, 100%); background: var(--card); border: 1px solid var(--border); border-radius: 24px; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12); overflow: hidden; }
      .hero { padding: 28px 28px 16px; background: linear-gradient(135deg, rgba(15,118,110,0.12), rgba(245,158,11,0.08)); border-bottom: 1px solid var(--border); }
      .hero h1 { margin: 0 0 8px; font-size: 28px; }
      .hero p { margin: 0; color: var(--muted); line-height: 1.5; }
      .content { padding: 24px 28px 28px; display: grid; gap: 20px; }
      .panel { border: 1px solid var(--border); border-radius: 18px; padding: 18px; background: #fff; }
      .panel h2 { margin: 0 0 12px; font-size: 18px; }
      .hidden { display: none; }
      .row { display: grid; gap: 8px; margin-bottom: 12px; }
      label { font-size: 14px; font-weight: 600; }
      input { width: 100%; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; font: inherit; }
      button { border: 0; border-radius: 999px; padding: 12px 18px; font: inherit; font-weight: 600; cursor: pointer; }
      .btn-primary { background: var(--accent); color: white; }
      .btn-primary:hover { background: var(--accent-strong); }
      .btn-secondary { background: #efe7d8; color: var(--text); }
      .btn-danger { background: #fee2e2; color: var(--danger); }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; }
      .status { min-height: 24px; font-size: 14px; color: var(--muted); }
      .status.error { color: var(--danger); }
      .pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 600; }
      ul { margin: 10px 0 0; padding-left: 18px; }
      .muted { color: var(--muted); }
    </style>
  </head>
  <body>
    <main class="card">
      <section class="hero">
        <h1>Autorizar Nexus PM MCP</h1>
        <p>Este consentimiento permite que ChatGPT use el backend MCP publicado en Supabase con tu identidad de Nexus PM.</p>
      </section>
      <section class="content">
        <div id="status" class="status">Inicializando consentimiento OAuth...</div>
        <section id="login-panel" class="panel hidden">
          <h2>Inicia sesión</h2>
          <p class="muted">Debes autenticarte con tu cuenta de Nexus PM antes de aprobar el acceso.</p>
          <form id="login-form">
            <div class="row"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required /></div>
            <div class="row"><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required /></div>
            <button class="btn-primary" type="submit">Entrar y continuar</button>
          </form>
        </section>
        <section id="consent-panel" class="panel hidden">
          <div class="pill">Sesión activa</div>
          <h2 id="client-name">Aplicación solicitante</h2>
          <p id="client-description" class="muted"></p>
          <div id="user-summary" class="muted"></div>
          <div><strong>Scopes solicitados</strong><ul id="scope-list"></ul></div>
          <div class="actions" style="margin-top: 18px;">
            <button id="approve-button" class="btn-primary" type="button">Autorizar</button>
            <button id="deny-button" class="btn-danger" type="button">Denegar</button>
            <button id="logout-button" class="btn-secondary" type="button">Cerrar sesión</button>
          </div>
        </section>
      </section>
    </main>
    <script type="module">
      import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
      const supabase = createClient(${JSON.stringify(config.SUPABASE_URL)}, ${JSON.stringify(config.SUPABASE_ANON_KEY)}, { auth: { persistSession: true, autoRefreshToken: true } });
      const authorizationId = ${JSON.stringify(authorizationId)};
      const statusEl = document.getElementById("status");
      const loginPanel = document.getElementById("login-panel");
      const consentPanel = document.getElementById("consent-panel");
      const loginForm = document.getElementById("login-form");
      const approveButton = document.getElementById("approve-button");
      const denyButton = document.getElementById("deny-button");
      const logoutButton = document.getElementById("logout-button");
      const clientNameEl = document.getElementById("client-name");
      const clientDescriptionEl = document.getElementById("client-description");
      const scopeListEl = document.getElementById("scope-list");
      const userSummaryEl = document.getElementById("user-summary");
      function setStatus(message, isError = false) { statusEl.textContent = message; statusEl.className = isError ? "status error" : "status"; }
      function showLogin() { loginPanel.classList.remove("hidden"); consentPanel.classList.add("hidden"); }
      function showConsent() { consentPanel.classList.remove("hidden"); loginPanel.classList.add("hidden"); }
      async function loadAuthorizationDetails() {
        if (!authorizationId) { setStatus("Falta authorization_id en la URL.", true); showLogin(); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setStatus("Debes iniciar sesión para revisar esta solicitud."); showLogin(); return; }
        const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
        if (error || !data) { setStatus(error?.message ?? "No se pudo obtener la solicitud OAuth.", true); showLogin(); return; }
        const client = data.client ?? {};
        const scopes = Array.isArray(data.scopes) ? data.scopes : [];
        clientNameEl.textContent = client.client_name || client.client_id || "Cliente OAuth";
        clientDescriptionEl.textContent = client.client_uri || "ChatGPT solicita acceso a Nexus PM MCP.";
        userSummaryEl.textContent = session.user.email ? "Sesión activa como " + session.user.email : "Sesión activa";
        scopeListEl.replaceChildren(...(scopes.length ? scopes : ["openid", "profile", "email"]).map((scope) => { const li = document.createElement("li"); li.textContent = scope; return li; }));
        setStatus("Revisa la solicitud y decide si deseas autorizarla.");
        showConsent();
      }
      loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(loginForm);
        const email = String(form.get("email") || "").trim();
        const password = String(form.get("password") || "");
        if (!email || !password) { setStatus("Debes ingresar email y contraseña.", true); return; }
        setStatus("Iniciando sesión...");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setStatus(error.message, true); return; }
        await loadAuthorizationDetails();
      });
      approveButton?.addEventListener("click", async () => { setStatus("Autorizando acceso..."); const { error } = await supabase.auth.oauth.approveAuthorization(authorizationId); if (error) setStatus(error.message, true); });
      denyButton?.addEventListener("click", async () => { setStatus("Denegando acceso..."); const { error } = await supabase.auth.oauth.denyAuthorization(authorizationId); if (error) setStatus(error.message, true); });
      logoutButton?.addEventListener("click", async () => { await supabase.auth.signOut(); showLogin(); setStatus("Sesión cerrada."); });
      loadAuthorizationDetails().catch((error) => { setStatus(error instanceof Error ? error.message : "Error inesperado", true); showLogin(); });
    </script>
  </body>
</html>`);
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
    return new Response("Method not allowed", { status: 405 });
  }

  return renderConsentPage(request);
});
