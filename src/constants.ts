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

  /**
   * Detects tag names that start with # prefix.
   * Used for tag normalization and validation.
   * 
   * Valid examples (will match):
   * - #project
   * - #meeting-notes
   * - #todo/urgent
   * - #dev/javascript
   * 
   * Invalid examples (won't match):
   * - project (no # prefix)
   * - ##project (double #)
   * - # (just hash, no name)
   * - #   (hash with just spaces)
   */
  TAG_PREFIX: /^#/,

  /**
   * Validates proper tag name format.
   * Matches tags that contain only valid characters for Obsidian tags.
   * Valid characters: letters, numbers, hyphens, underscores, forward slashes
   * 
   * Valid examples:
   * - project
   * - meeting-notes
   * - todo_item
   * - dev/javascript
   * - tag123
   * - parent/child/grandchild
   * 
   * Invalid examples:
   * - project with spaces
   * - tag@name (special chars)
   * - tag.name (dots not allowed)
   * - tag&name (ampersand not allowed)
   */
  TAG_NAME_VALIDATION: /^[a-zA-Z0-9_/-]+$/,

  /**
   * Detects hierarchical tag separators.
   * Used to identify parent/child tag relationships.
   * 
   * Valid examples:
   * - parent/child
   * - category/subcategory/item
   * - dev/frontend/react
   * 
   * Usage:
   * - Split hierarchical tags: tag.split(HIERARCHICAL_TAG_SEPARATOR)
   * - Check if tag is hierarchical: HIERARCHICAL_TAG_SEPARATOR.test(tag)
   */
  HIERARCHICAL_TAG_SEPARATOR: /\//,

  /**
   * Matches Markdown file extensions.
   * Primary file format for Obsidian notes.
   * 
   * Valid examples:
   * - note.md
   * - daily-notes.md
   * - project-plan.md
   * 
   * Usage:
   * - Filter markdown files: files.filter(f => MARKDOWN_FILE.test(f))
   * - Validate file type: MARKDOWN_FILE.test(filename)
   * - Extract markdown files from directory listings
   */
  MARKDOWN_FILE: /\.md$/,

  /**
   * Matches common text file extensions supported by Obsidian.
   * Used for file type validation and filtering.
   * 
   * Valid examples:
   * - document.txt
   * - readme.txt
   * - notes.md
   * - data.json
   * - config.yaml
   * - style.css
   * - script.js
   * 
   * Usage:
   * - Filter text files: files.filter(f => TEXT_FILE.test(f))
   * - Validate editable files: TEXT_FILE.test(filename)
   * - Content operations support: check if file can be edited
   */
  TEXT_FILE: /\.(md|txt|json|yaml|yml|css|js|ts|html|htm|xml|csv)$/i,

  /**
   * Matches image file extensions commonly used in Obsidian.
   * Used for embedding and attachment validation.
   * 
   * Valid examples:
   * - diagram.png
   * - screenshot.jpg
   * - icon.svg
   * - chart.gif
   * - photo.webp
   * 
   * Usage:
   * - Filter images: attachments.filter(f => IMAGE_FILE.test(f))
   * - Validate attachment type: IMAGE_FILE.test(filename)
   * - Media file handling: determine if file is an image
   */
  IMAGE_FILE: /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i,

  /**
   * Matches date format in filenames (YYYY-MM-DD).
   * Common pattern for daily notes and dated files.
   * 
   * Valid examples:
   * - 2024-01-15.md
   * - daily-2024-12-25.md
   * - meeting-2024-06-30.md
   * 
   * Usage:
   * - Parse date from filename: filename.match(DATE_IN_FILENAME)
   * - Validate daily note format: DATE_IN_FILENAME.test(filename)
   * - Sort files by date: extract dates for chronological ordering
   */
  DATE_IN_FILENAME: /(\d{4}-\d{2}-\d{2})/,

  /**
   * Matches ISO 8601 date format (YYYY-MM-DD).
   * Used for date validation in various contexts.
   * 
   * Valid examples:
   * - 2024-01-15
   * - 2024-12-31
   * - 2024-06-30
   * 
   * Invalid examples:
   * - 2024-13-01 (invalid month)
   * - 2024-01-32 (invalid day)
   * - 24-01-15 (incomplete year)
   * 
   * Usage:
   * - Validate date strings: ISO_DATE_FORMAT.test(dateStr)
   * - Parse user input: check format before processing
   * - API parameter validation: ensure proper date format
   */
  ISO_DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,

  /**
   * Matches block reference IDs in Obsidian.
   * Block references are used to link to specific paragraphs or sections.
   * 
   * Valid examples:
   * - ^abc123
   * - ^block-ref-1
   * - ^my-important-note
   * 
   * Usage:
   * - Extract block IDs: content.match(BLOCK_REFERENCE)
   * - Validate block format: BLOCK_REFERENCE.test(blockId)
   * - Parse block references: find all block markers in content
   */
  BLOCK_REFERENCE: /\^([a-zA-Z0-9-]+)\s*$/,

  /**
   * Matches and captures block reference content for cleaning.
   * Used to remove block references from content while preserving text.
   * 
   * Valid examples (will match and remove):
   * - Some text ^block123
   * - Important note ^my-ref
   * - Content here ^abc-def
   * 
   * Usage:
   * - Clean content: text.replace(BLOCK_REFERENCE_CLEANUP, '')
   * - Remove block markers: preserve content, remove references
   * - Content processing: clean text for display or export
   */
  BLOCK_REFERENCE_CLEANUP: /\s*\^[a-zA-Z0-9-]+\s*$/,
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