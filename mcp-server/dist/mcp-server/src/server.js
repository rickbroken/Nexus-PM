import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { dispatchTool } from './handlers.js';
import { mcpToolDefinitions } from './tools/toolDefinitions.js';
import { mcpToolRuntimeSchemas } from './tools/toolSchemas.js';
export function createNexusMcpServer() {
    const server = new McpServer({
        name: 'nexus-pm-mcp-server',
        version: '0.1.0',
    });
    for (const tool of mcpToolDefinitions) {
        const runtimeSchema = mcpToolRuntimeSchemas[tool.name];
        const toolConfig = {
            description: tool.description,
            inputSchema: runtimeSchema.shape,
            _meta: tool.meta,
        };
        server.registerTool(tool.name, toolConfig, async (input) => {
            const result = await dispatchTool(tool.name, input);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        });
    }
    return server;
}
