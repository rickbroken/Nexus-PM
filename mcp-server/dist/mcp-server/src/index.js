import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { dispatchTool } from './handlers.js';
import { InvalidConfigurationError, toSafeErrorMessage } from './errors.js';
import { mcpToolDefinitions, mcpToolRuntimeSchemas } from './tools.js';
import { getServerConfig } from './config.js';
const server = new McpServer({
    name: 'nexus-pm-mcp-server',
    version: '0.1.0',
});
for (const tool of mcpToolDefinitions) {
    const runtimeSchema = mcpToolRuntimeSchemas[tool.name];
    const toolConfig = {
        description: tool.description,
        inputSchema: runtimeSchema.shape,
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
async function main() {
    getServerConfig();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[nexus-mcp] stdio server ready');
}
main().catch((error) => {
    const message = toSafeErrorMessage(error);
    if (error instanceof InvalidConfigurationError) {
        console.error(`[nexus-mcp] config error: ${message}`);
    }
    else {
        console.error(`[nexus-mcp] startup error: ${message}`);
    }
    process.exit(1);
});
