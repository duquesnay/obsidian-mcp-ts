/**
 * Utility to check if the current environment is a test environment.
 * This helps avoid logging noise and other test-specific behaviors.
 */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}