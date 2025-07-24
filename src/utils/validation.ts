/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Options for argument validation
 */
interface ValidationOptions {
  [argName: string]: {
    notEmpty?: boolean;  // For array validation
  };
}

/**
 * Validates that required arguments are present and not empty
 * @param args The arguments object to validate
 * @param required Array of required argument names
 * @param options Optional validation options for specific arguments
 * @throws ValidationError if any required argument is missing
 */
export function validateRequiredArgs(
  args: Record<string, any>,
  required: string[],
  options?: ValidationOptions
): void {
  for (const argName of required) {
    const value = args[argName];
    
    // Check if argument is missing, null, undefined, or empty string
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${argName} argument missing in arguments`);
    }
    
    // Check additional validation options
    if (options && options[argName]) {
      const argOptions = options[argName];
      
      // Check for non-empty array
      if (argOptions.notEmpty && Array.isArray(value) && value.length === 0) {
        throw new ValidationError(`${argName} argument must be a non-empty array`);
      }
    }
  }
}

/**
 * Valid period types
 */
export const VALID_PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
export type PeriodType = typeof VALID_PERIODS[number];

/**
 * Validates a period string
 * @param period The period to validate
 * @throws ValidationError if period is invalid
 */
export function validatePeriod(period: string): asserts period is PeriodType {
  if (!period || period === null || period === undefined) {
    throw new ValidationError('period argument missing in arguments');
  }
  
  if (!VALID_PERIODS.includes(period as PeriodType)) {
    throw new ValidationError(`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`);
  }
}

/**
 * Reusable schema fragment for path parameters
 */
export const PATH_SCHEMA = {
  type: 'string',
  description: 'Path to the file or directory (relative to vault root)'
} as const;

/**
 * Reusable schema fragment for file path parameters
 */
export const FILE_PATH_SCHEMA = {
  type: 'string',
  description: 'Path to the file (relative to vault root)'
} as const;

/**
 * Reusable schema fragment for directory path parameters
 */
export const DIR_PATH_SCHEMA = {
  type: 'string',
  description: 'Path to the directory (relative to vault root)'
} as const;

/**
 * Reusable schema fragment for pagination parameters (limit/offset based)
 */
export const PAGINATION_SCHEMA = {
  limit: {
    type: 'integer',
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 1000,
    default: 100
  },
  offset: {
    type: 'integer',
    description: 'Number of results to skip for pagination',
    minimum: 0,
    default: 0
  }
} as const;

/**
 * Reusable schema fragment for page-based pagination parameters
 */
export const PAGE_PAGINATION_SCHEMA = {
  page: {
    type: 'number',
    description: 'Page number (0-based) for pagination',
    minimum: 0,
    default: 0
  },
  pageSize: {
    type: 'number',
    description: 'Number of items per page',
    minimum: 1,
    default: 10
  }
} as const;

/**
 * Reusable schema fragment for period parameters
 */
export const PERIOD_SCHEMA = {
  type: 'string',
  enum: VALID_PERIODS,
  description: 'The type of periodic note'
} as const;

/**
 * Reusable schema fragment for tag parameters
 */
export const TAG_SCHEMA = {
  type: 'string',
  description: 'Tag name (with or without # prefix)'
} as const;

/**
 * Reusable schema fragment for tags array parameters
 */
export const TAGS_ARRAY_SCHEMA = {
  type: 'array',
  items: { type: 'string' },
  description: 'Array of tags to filter by'
} as const;

/**
 * Reusable schema fragment for boolean flag parameters
 */
export const BOOLEAN_FLAG_SCHEMA = {
  type: 'boolean',
  default: false
} as const;

/**
 * Reusable schema fragment for content parameters
 */
export const CONTENT_SCHEMA = {
  type: 'string',
  description: 'The content to write/append'
} as const;

/**
 * Reusable schema fragment for search query parameters
 */
export const SEARCH_QUERY_SCHEMA = {
  type: 'string',
  description: 'Search query'
} as const;

/**
 * Reusable schema fragment for context length parameters
 */
export const CONTEXT_LENGTH_SCHEMA = {
  type: 'integer',
  description: 'Number of characters to include around matches',
  minimum: 0
} as const;

/**
 * Validates pagination parameters
 * @param limit The limit value to validate
 * @param offset The offset value to validate
 * @throws ValidationError if parameters are invalid
 */
export function validatePaginationParams(limit?: number, offset?: number): void {
  if (limit !== undefined && limit < 1) {
    throw new ValidationError('limit must be a positive integer');
  }
  
  if (offset !== undefined && offset < 0) {
    throw new ValidationError('offset must be non-negative');
  }
}

/**
 * Normalizes a tag name by removing the # prefix if present
 * @param tagName The tag name to normalize
 * @returns The normalized tag name without # prefix
 */
export function normalizeTagName(tagName: string): string {
  return tagName.startsWith('#') ? tagName.substring(1) : tagName;
}