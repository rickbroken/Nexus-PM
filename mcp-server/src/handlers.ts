import { ZodError } from 'zod';
import { mcpToolHandlers } from '../../src/lib/agent-mcp/index.js';
import { buildAgentApiContext } from './context.js';
import {
  InvalidToolInputError,
  ToolExecutionError,
  UnsupportedToolError,
  toSafeErrorMessage,
} from './errors.js';

export async function dispatchTool(toolName: string, input: unknown) {
  const handler = mcpToolHandlers[toolName as keyof typeof mcpToolHandlers];

  if (!handler) {
    throw new UnsupportedToolError(toolName);
  }

  try {
    return await handler({
      context: buildAgentApiContext(),
      input,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new InvalidToolInputError(error.issues.map((issue) => issue.message).join('; '));
    }

    throw new ToolExecutionError(toSafeErrorMessage(error));
  }
}
