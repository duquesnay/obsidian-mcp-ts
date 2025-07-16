/**
 * Constants for Obsidian MCP server configuration and defaults
 */

export const OBSIDIAN_DEFAULTS = {
  /** Default port for Obsidian Local REST API */
  PORT: 27124,
  
  /** Default host for Obsidian Local REST API */
  HOST: '127.0.0.1',
  
  /** Default timeout in milliseconds for API requests */
  TIMEOUT_MS: 6000,
  
  /** Default batch size for batch operations */
  BATCH_SIZE: 5,
  
  /** Default context length for search results */
  CONTEXT_LENGTH: 100,
  
  /** Default page size for paginated results */
  PAGE_SIZE: 10,
} as const;

export const API_ENDPOINTS = {
  BASE: 'https://{host}:{port}',
  VAULT: '/vault',
  SEARCH: '/search',
  PERIODIC_NOTES: '/periodic-notes',
  TAGS: '/tags',
} as const;

export const ERROR_MESSAGES = {
  MISSING_API_KEY: 'OBSIDIAN_API_KEY environment variable is not set',
  CONNECTION_FAILED: 'Failed to connect to Obsidian REST API',
  FILE_NOT_FOUND: 'File does not exist in the vault',
  PERMISSION_DENIED: 'Permission denied. Verify your OBSIDIAN_API_KEY is correct',
  INVALID_PATH: 'Invalid file path provided',
} as const;