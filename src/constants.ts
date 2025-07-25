/**
 * Constants for Obsidian MCP server configuration and defaults
 */

export const OBSIDIAN_DEFAULTS = {
  /** Default port for Obsidian Local REST API */
  PORT: 27124,
  
  /** Default host for Obsidian Local REST API */
  HOST: '127.0.0.1',
  
  /** @deprecated Use TIMEOUTS.DEFAULT_REQUEST instead */
  TIMEOUT_MS: 6000,
  
  /** Default batch size for batch operations */
  BATCH_SIZE: 5,
  
  /** Default context length for search results */
  CONTEXT_LENGTH: 100,
  
  /** Default page size for paginated results */
  PAGE_SIZE: 10,
  
  /** Default search limit for simple search */
  DEFAULT_SEARCH_LIMIT: 50,
  
  /** Maximum search results for simple search */
  MAX_SEARCH_RESULTS: 200,
  
  /** Default search limit for advanced search */
  DEFAULT_ADVANCED_SEARCH_LIMIT: 100,
  
  /** Maximum search results for advanced search */
  MAX_ADVANCED_SEARCH_RESULTS: 1000,
  
  /** Maximum context length for search results */
  MAX_CONTEXT_LENGTH: 500,
  
  /** Default limit for list operations */
  DEFAULT_LIST_LIMIT: 1000,
  
  /** Maximum limit for list operations to prevent memory issues */
  MAX_LIST_LIMIT: 5000,
} as const;

export const CACHE_DEFAULTS = {
  /** Default cache size for resources */
  MAX_SIZE: 100,
  
  /** TTL for fast-changing resources (recent files) in milliseconds */
  FAST_TTL: 30000, // 30 seconds
  
  /** TTL for stable resources (tags, structure) in milliseconds */
  STABLE_TTL: 300000, // 5 minutes
  
  /** TTL for individual notes in milliseconds */
  NOTE_TTL: 120000, // 2 minutes
} as const;

export const LRU_CACHE = {
  /** Value indicating no expiration for cache entries */
  NO_EXPIRATION: 0,
} as const;

export const BATCH_PROCESSOR = {
  /** Default number of retry attempts for failed operations */
  DEFAULT_RETRY_ATTEMPTS: 2,
  
  /** Default delay between retry attempts in milliseconds */
  DEFAULT_RETRY_DELAY_MS: 1000,
} as const;

export const REQUEST_DEDUPLICATOR = {
  /** Default TTL for deduplication cache in milliseconds */
  DEFAULT_TTL_MS: 5000, // 5 seconds
} as const;

export const API_ENDPOINTS = {
  BASE: 'https://{host}:{port}',
  VAULT: '/vault',
  SEARCH: '/search',
  PERIODIC_NOTES: '/periodic-notes',
  TAGS: '/tags',
} as const;

export const PATH_VALIDATION = {
  /** Maximum allowed length for file paths to prevent excessively long paths */
  MAX_LENGTH: 1000,
} as const;

export const ERROR_MESSAGES = {
  MISSING_API_KEY: 'OBSIDIAN_API_KEY environment variable is not set',
  CONNECTION_FAILED: 'Failed to connect to Obsidian REST API',
  FILE_NOT_FOUND: 'File does not exist in the vault',
  PERMISSION_DENIED: 'Permission denied. Verify your OBSIDIAN_API_KEY is correct',
  INVALID_PATH: 'Invalid file path provided',
} as const;

export const TIMEOUTS = {
  /** Default timeout for API requests in milliseconds */
  DEFAULT_REQUEST: 6000,
  
  /** Timeout for directory operations (move, copy) in milliseconds - 2 minutes */
  DIRECTORY_OPERATIONS: 120000,
  
  /** Timeout for search operations in milliseconds - 30 seconds */
  SEARCH_OPERATIONS: 30000,
} as const;

export const REGEX_PATTERNS = {
  /**
   * Validates HTTP and HTTPS URLs.
   * Matches URLs with:
   * - Protocol: http:// or https://
   * - Host: domain names, localhost, or IP addresses
   * - Optional port: :number
   * - Optional path, query string, and fragment
   * 
   * Examples:
   * - http://localhost:27124
   * - https://127.0.0.1:27124
   * - https://example.com/path?query=value#fragment
   */
  URL_VALIDATION: /^https?:\/\/(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/,
} as const;

export const SUBSCRIPTION_EVENTS = {
  /** Event emitted when cache entries are invalidated */
  CACHE_INVALIDATED: 'cache:invalidated',
  
  /** Event emitted when a new file is created in the vault */
  FILE_CREATED: 'file:created',
  
  /** Event emitted when an existing file is updated in the vault */
  FILE_UPDATED: 'file:updated',
  
  /** Event emitted when a file is deleted from the vault */
  FILE_DELETED: 'file:deleted',
  
  /** Event emitted when a new directory is created in the vault */
  DIRECTORY_CREATED: 'directory:created',
  
  /** Event emitted when a directory is deleted from the vault */
  DIRECTORY_DELETED: 'directory:deleted',
  
  /** Event emitted when a tag is added to a file */
  TAG_ADDED: 'tag:added',
  
  /** Event emitted when a tag is removed from a file */
  TAG_REMOVED: 'tag:removed',
} as const;