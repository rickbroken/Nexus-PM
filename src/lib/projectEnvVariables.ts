let projectEnvVariablesAvailable: boolean | null = null;

export function canUseProjectEnvVariables(): boolean {
  return projectEnvVariablesAvailable !== false;
}

export function markProjectEnvVariablesUnavailable() {
  projectEnvVariablesAvailable = false;
}

export function markProjectEnvVariablesAvailable() {
  projectEnvVariablesAvailable = true;
}

export function isProjectEnvVariablesUnsupportedError(error: any): boolean {
  const code = error?.code ?? '';
  const message = String(error?.message ?? '').toLowerCase();

  return (
    code === 'PGRST205' ||
    code === 'A0000' ||
    message.includes('could not find the table') ||
    message.includes('set-returning functions are not allowed in where')
  );
}
