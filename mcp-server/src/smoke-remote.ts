import assert from "node:assert/strict";
import process from "node:process";

const remoteUrl = process.env.MCP_REMOTE_URL?.trim();
const apiKey = process.env.MCP_HTTP_API_KEY?.trim();

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} es obligatoria`);
  }
  return value;
}

async function postJsonRpc(body: Record<string, unknown>, authorized = true) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-03-26",
  };

  if (authorized) {
    headers.Authorization = `Bearer ${requireEnv("MCP_HTTP_API_KEY", apiKey)}`;
  }

  const response = await fetch(requireEnv("MCP_REMOTE_URL", remoteUrl), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();

  return {
    status: response.status,
    text,
    json: text ? JSON.parse(text) : null,
  };
}

async function main() {
  const unauthorized = await postJsonRpc(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "codex-smoke-remote", version: "1.0.0" },
      },
    },
    false
  );

  assert.equal(unauthorized.status, 401);

  const initialize = await postJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "codex-smoke-remote", version: "1.0.0" },
    },
  });

  assert.equal(initialize.status, 200);
  assert.equal(initialize.json?.jsonrpc, "2.0");
  assert.equal(initialize.json?.id, 2);
  assert.equal(initialize.json?.result?.serverInfo?.name, "nexus-pm-mcp-edge");

  const toolsList = await postJsonRpc({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/list",
    params: {},
  });

  assert.equal(toolsList.status, 200);
  const toolNames = toolsList.json?.result?.tools?.map((tool: { name: string }) => tool.name) ?? [];
  assert.ok(toolNames.includes("nexus_backend_schema"));
  assert.ok(toolNames.includes("nexus_db_select"));
  assert.ok(toolNames.includes("nexus_task_attachment_upload"));

  const schemaCall = await postJsonRpc({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "nexus_backend_schema",
      arguments: { resource: "tables" },
    },
  });

  assert.equal(schemaCall.status, 200);
  const contentText = schemaCall.json?.result?.content?.[0]?.text;
  assert.ok(contentText, "La respuesta de nexus_backend_schema debe incluir contenido");
  const payload = JSON.parse(contentText);
  assert.equal(payload.resource, "tables");
  assert.ok(Array.isArray(payload.tables));

  console.log("Smoke remoto MCP OK");
  console.log(JSON.stringify({ initialize: initialize.json, tools: toolNames.length, tables: payload.tables.length }, null, 2));
}

main().catch((error) => {
  console.error("Smoke remoto MCP falló");
  console.error(error);
  process.exitCode = 1;
});
