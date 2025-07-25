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

export const DEDUPLICATION_DEFAULTS = {
  /** Length of hash for batch operations */
  BATCH_HASH_LENGTH: 8,
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

  /**
   * Detects parent directory traversal attempts.
   * Matches: ../ or ..\
   * Security: Prevents accessing files outside the vault
   * 
   * Valid examples (will match - these are dangerous):
   * - ../
   * - ..\
   * - ../../secret.md
   * - path/../other
   * 
   * Invalid examples (won't match - these are safe):
   * - ./file.md
   * - ..file.md
   * - path..name/file.md
   */
  PATH_TRAVERSAL: /\.\.[\/\\]/,

  /**
   * Detects Unix/Linux absolute paths.
   * Matches paths starting with / or \
   * Security: Ensures paths are relative to vault root
   * 
   * Valid examples (will match - these are absolute):
   * - /home/user/file.md
   * - /var/log/notes.txt
   * - \network\share
   * 
   * Invalid examples (won't match - these are relative):
   * - home/user/file.md
   * - ./relative/path.md
   * - file.txt
   */
  ABSOLUTE_PATH_UNIX: /^[\/\\]/,

  /**
   * Detects Windows absolute paths.
   * Matches: Drive letter followed by :\ or :/
   * Security: Prevents accessing files outside the vault on Windows
   * 
   * Valid examples (will match - these are absolute):
   * - C:\
   * - D:\Documents\notes.md
   * - Z:/path/to/file.txt
   * 
   * Invalid examples (won't match - these are relative):
   * - folder\file.txt
   * - C:file.txt (missing slash)
   * - 1:\path (invalid drive letter)
   */
  ABSOLUTE_PATH_WINDOWS: /^[a-zA-Z]:[\/\\]/,

  /**
   * Detects home directory expansion.
   * Matches paths starting with ~
   * Security: Prevents expanding to user's home directory
   * 
   * Valid examples (will match - these expand):
   * - ~
   * - ~/Documents
   * - ~username/files
   * 
   * Invalid examples (won't match - no expansion):
   * - path/~/file
   * - file~name.txt
   */
  HOME_DIRECTORY: /^~/,

  /**
   * Detects control characters including null bytes.
   * Matches: ASCII 0x00-0x1F and 0x7F
   * Security: Prevents injection of non-printable characters
   * 
   * Valid examples (will match - these contain control chars):
   * - file\x00name (null byte)
   * - path\x0d\x0a (CRLF)
   * - text\x1bsequence (escape)
   * 
   * Invalid examples (won't match - these are clean):
   * - normal-file_name.txt
   * - path/to/file with spaces
   * - UTF-8 文件名.md
   */
  CONTROL_CHARACTERS: /[\x00-\x1f\x7f]/,

  /**
   * Detects hidden files/directories that start with dots followed by slashes.
   * Matches: Paths starting with one or more dots followed by / or \
   * Note: This is used to prevent certain path constructions, not all hidden files
   * 
   * Valid examples (will match):
   * - ./
   * - ../
   * - .hidden/
   * - ..secret\
   * 
   * Invalid examples (won't match):
   * - .gitignore (valid hidden file)
   * - folder/.hidden (hidden file in folder)
   * - normal/path
   */
  HIDDEN_FILE_WITH_SLASH: /^\.+[\/\\]/,

  /**
   * Detects multiple consecutive slashes or backslashes.
   * Used for path normalization
   * 
   * Valid examples (will match - need normalization):
   * - //
   * - ///path
   * - folder\\\\file
   * - path//to///file
   * 
   * Invalid examples (won't match - already normalized):
   * - /
   * - path/to/file
   * - folder\file
   */
  MULTIPLE_SLASHES: /[\/\\]{2,}/,

  /**
   * Detects leading slashes.
   * Used for removing absolute path indicators
   * 
   * Valid examples (will match):
   * - /
   * - /path
   * - //multiple
   * - ///many/slashes
   * 
   * Invalid examples (won't match):
   * - path/to/file
   * - relative/path
   * - file.txt
   */
  LEADING_SLASH: /^\/+/,

  /**
   * Detects trailing slashes.
   * Used for path normalization
   * 
   * Valid examples (will match):
   * - path/
   * - folder//
   * - directory///
   * 
   * Invalid examples (won't match):
   * - path/to/file
   * - file.txt
   * - /absolute/path
   */
  TRAILING_SLASH: /\/+$/,

  /**
   * Matches all backslashes for conversion to forward slashes.
   * Used for path normalization to ensure consistent path separators.
   * 
   * Valid examples (will match):
   * - folder\file.txt
   * - C:\Users\Documents
   * - path\to\nested\file
   * 
   * Invalid examples (won't match):
   * - path/to/file (no backslashes)
   * - file.txt (no backslashes)
   */
  BACKSLASH: /\\/g,

  /**
   * Matches markdown headings (levels 1-6).
   * Captures:
   * - Group 1: The hash symbols (1-6 of them)
   * - Group 2: The heading text (must have non-whitespace content)
   * 
   * Valid examples:
   * - # Heading 1
   * - ## Heading 2  
   * - ### Heading 3
   * - #### Heading 4
   * - ##### Heading 5
   * - ###### Heading 6
   * - ## Heading with `code` and **bold**
   * - ### Heading with [links](url)
   * 
   * Invalid examples:
   * - ####### Too many hashes (7+)
   * - #No space after hash
   * -  # Leading space before hash
   * - Text before # the hash
   * - # (just hash with no text)
   * - ##\t (tab after hash instead of space)
   */
  MARKDOWN_HEADING: /^(#{1,6}) +(\S.*)$/,

  /**
   * Factory function to create a regex for a specific heading level.
   * @param level - The heading level (1-6)
   * @returns RegExp that matches only headings of the specified level
   * @throws Error if level is not between 1 and 6
   * 
   * Examples:
   * - MARKDOWN_HEADING_WITH_LEVEL(1) matches only # Heading
   * - MARKDOWN_HEADING_WITH_LEVEL(2) matches only ## Heading
   * - MARKDOWN_HEADING_WITH_LEVEL(3) matches only ### Heading
   */
  MARKDOWN_HEADING_WITH_LEVEL: (level: number): RegExp => {
    if (level < 1 || level > 6) {
      throw new Error(`Invalid heading level: ${level}. Must be between 1 and 6.`);
    }
    return new RegExp(`^#{${level}} +(\\S.*)$`);
  },
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