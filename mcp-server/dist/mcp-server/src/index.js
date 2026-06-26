import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { InvalidConfigurationError, toSafeErrorMessage } from './errors.js';
import { getServerConfig } from './config.js';
import { startHttpServer } from './http.js';
import { createNexusMcpServer } from './server.js';
async function main() {
    const config = getServerConfig();
    if (config.MCP_TRANSPORT === 'http') {
        const runtime = await startHttpServer();
        await new Promise((resolve, reject) => {
            let shuttingDown = false;
            const handleSignal = async () => {
                if (shuttingDown)
                    return;
                shuttingDown = true;
                process.off('SIGINT', handleSignal);
                process.off('SIGTERM', handleSignal);
                try {
                    await runtime.shutdown();
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            };
            process.once('SIGINT', handleSignal);
            process.once('SIGTERM', handleSignal);
        });
        return;
    }
    if (config.MCP_TRANSPORT === 'stdio') {
        const server = createNexusMcpServer();
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('[nexus-mcp] stdio server ready');
        return;
    }
    throw new InvalidConfigurationError('MCP_TRANSPORT invalido');
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
