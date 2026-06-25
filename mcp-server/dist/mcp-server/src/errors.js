export class InvalidConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidConfigurationError';
    }
}
export class UnsupportedToolError extends Error {
    constructor(toolName) {
        super(`Tool no soportada: ${toolName}`);
        this.name = 'UnsupportedToolError';
    }
}
export class InvalidToolInputError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidToolInputError';
    }
}
export class ToolExecutionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ToolExecutionError';
    }
}
export function toSafeErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return 'Error no controlado';
}
