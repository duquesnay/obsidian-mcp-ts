import { ObsidianError } from '../types/errors.js';
import { REGEX_PATTERNS } from '../constants.js';

/**
 * Types of paths that can be validated
 */
export enum PathValidationType {
  FILE = 'file',
  DIRECTORY = 'directory',
  ANY = 'any'
}

/**
 * Options for path validation
 */
export interface PathValidationOptions {
  /** Type of path to validate */
  type?: PathValidationType;
  /** Maximum allowed path length */
  maxLength?: number;
  /** Custom error messages */
  messages?: {
    empty?: string;
    security?: string;
    tooLong?: string;
    invalidFormat?: string;
  };
}

/**
 * Custom error class for path validation errors
 */
export class PathValidationError extends ObsidianError {
  public readonly fieldName?: string;
  public readonly paramName?: string;

  constructor(message: string, fieldName?: string) {
    super(message, 400); // Use 400 (Bad Request) as the error code
    this.name = 'PathValidationError';
    this.fieldName = fieldName;
    this.paramName = fieldName; // For compatibility with tests expecting paramName
  }
}

/**
 * Utility class for comprehensive path validation
 */
export class PathValidationUtil {
  // Dangerous patterns that could lead to security issues
  private static readonly DANGEROUS_PATTERNS = [
    REGEX_PATTERNS.PATH_TRAVERSAL,        // Parent directory traversal: ../ or ..\
    REGEX_PATTERNS.ABSOLUTE_PATH_UNIX,    // Absolute paths starting with / or \
    REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS, // Windows absolute paths (C:\, D:\, etc.)
    REGEX_PATTERNS.HOME_DIRECTORY,        // Home directory expansion
  ];

  // Dangerous characters that should not be in paths
  private static readonly DANGEROUS_CHARS = [
    '\0',  // Null byte
    '<',   // Potential HTML injection
    '>',   // Potential HTML injection
    '|',   // Pipe (command injection risk)
    '\n',  // Newline
    '\r',  // Carriage return
  ];

  // Control characters regex
  private static readonly CONTROL_CHARS = REGEX_PATTERNS.CONTROL_CHARACTERS;

  // Default maximum path length
  private static readonly DEFAULT_MAX_LENGTH = 1000;

  /**
   * Validates a single path
   * @param path The path to validate
   * @param fieldName Optional field name for error messages
   * @param options Validation options
   * @throws PathValidationError if validation fails
   */
  static validate(path: string, fieldName: string = 'Path', options: PathValidationOptions = {}): void {
    const type = options.type ?? PathValidationType.FILE;
    const maxLength = options.maxLength ?? this.DEFAULT_MAX_LENGTH;
    const messages = options.messages ?? {};

    // Check for empty or invalid input
    if (!path || typeof path !== 'string' || path.trim() === '') {
      const message = messages.empty ?? `${fieldName} cannot be empty`;
      throw new PathValidationError(message, fieldName);
    }

    const trimmedPath = path.trim();

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmedPath)) {
        let specificMessage = messages.security ?? `${fieldName} contains dangerous pattern`;
        
        // Provide specific error messages for common patterns
        if (REGEX_PATTERNS.PATH_TRAVERSAL.test(trimmedPath)) {
          specificMessage = messages.security ?? `${fieldName} contains parent directory traversal`;
        } else if (REGEX_PATTERNS.ABSOLUTE_PATH_UNIX.test(trimmedPath) || REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS.test(trimmedPath)) {
          specificMessage = messages.security ?? `${fieldName} cannot be an absolute path`;
        } else if (REGEX_PATTERNS.HOME_DIRECTORY.test(trimmedPath)) {
          specificMessage = messages.security ?? `${fieldName} cannot start with home directory reference`;
        }
        
        throw new PathValidationError(specificMessage, fieldName);
      }
    }

    // Check for dangerous characters first (more specific)
    for (const char of this.DANGEROUS_CHARS) {
      if (trimmedPath.includes(char)) {
        const message = messages.invalidFormat ?? `${fieldName} contains dangerous character: ${char === '\0' ? 'null byte' : char === '\n' ? 'newline' : char === '\r' ? 'carriage return' : char}`;
        throw new PathValidationError(message, fieldName);
      }
    }

    // Check for control characters (excluding those already checked)
    if (this.CONTROL_CHARS.test(trimmedPath)) {
      // Skip if it's one of the dangerous chars we already checked
      const hasOnlyCheckedChars = [...trimmedPath].every(c => 
        this.DANGEROUS_CHARS.includes(c) || !this.CONTROL_CHARS.test(c)
      );
      if (!hasOnlyCheckedChars) {
        const message = messages.invalidFormat ?? `${fieldName} contains control characters`;
        throw new PathValidationError(message, fieldName);
      }
    }

    // Check path length
    if (trimmedPath.length > maxLength) {
      const message = messages.tooLong ?? `${fieldName} exceeds maximum length of ${maxLength} characters`;
      throw new PathValidationError(message, fieldName);
    }

    // Type-specific validations
    if (type === PathValidationType.FILE && trimmedPath.endsWith('/')) {
      const message = messages.invalidFormat ?? `${fieldName} cannot end with a slash when validating as a file`;
      throw new PathValidationError(message, fieldName);
    }
  }

  /**
   * Validates multiple paths
   * @param paths Array of paths to validate
   * @param options Validation options applied to all paths
   * @throws PathValidationError if any path fails validation
   */
  static validateBatch(paths: string[], options: PathValidationOptions = {}): void {
    if (!Array.isArray(paths)) {
      throw new PathValidationError('Paths must be an array');
    }

    paths.forEach((path, index) => {
      try {
        this.validate(path, `Path at index ${index}`, options);
      } catch (error) {
        if (error instanceof PathValidationError) {
          // Re-throw with index information preserved
          throw error;
        }
        throw error;
      }
    });
  }

  /**
   * Normalizes a path by cleaning it up
   * @param path The path to normalize
   * @param type The type of path (affects trailing slash handling)
   * @returns The normalized path
   */
  static normalize(path: string, type: PathValidationType = PathValidationType.FILE): string {
    if (!path || typeof path !== 'string') {
      return '';
    }

    let normalized = path.trim();

    // Convert backslashes to forward slashes
    normalized = normalized.replace(REGEX_PATTERNS.BACKSLASH, '/');

    // Remove leading slashes
    normalized = normalized.replace(REGEX_PATTERNS.LEADING_SLASH, '');

    // Normalize multiple slashes
    normalized = normalized.replace(new RegExp(REGEX_PATTERNS.MULTIPLE_SLASHES.source, 'g'), '/');

    // Remove trailing slashes (always remove for consistency)
    normalized = normalized.replace(REGEX_PATTERNS.TRAILING_SLASH, '');

    return normalized;
  }

  /**
   * Checks if a path is valid without throwing
   * @param path The path to check
   * @param options Validation options
   * @returns true if valid, false otherwise
   */
  static isValid(path: string, options: PathValidationOptions = {}): boolean {
    try {
      this.validate(path, 'Path', options);
      return true;
    } catch {
      return false;
    }
  }
}