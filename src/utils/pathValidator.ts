import { ObsidianError } from '../types/errors.js';
import { PATH_VALIDATION, REGEX_PATTERNS } from '../constants.js';

const DANGEROUS_PATH_PATTERNS = [
  REGEX_PATTERNS.PATH_TRAVERSAL,        // Path traversal: ../ or ..\
  REGEX_PATTERNS.ABSOLUTE_PATH_UNIX,    // Absolute paths starting with / or \
  REGEX_PATTERNS.ABSOLUTE_PATH_WINDOWS, // Windows absolute paths (C:\, D:\, etc.)
  /\0/,                                 // Null bytes (keeping for specific check)
  REGEX_PATTERNS.CONTROL_CHARACTERS,    // Control characters
  REGEX_PATTERNS.HOME_DIRECTORY,        // Home directory expansion
];

const DANGEROUS_CHARS = [
  '\0',  // Null byte
  '<',   // Potential HTML injection
  '>',   // Potential HTML injection
  '|',   // Pipe (command injection risk)
  '\n',  // Newline
  '\r',  // Carriage return
];

/**
 * Validates a file path to ensure it's safe to use
 * @param path The path to validate
 * @param fieldName The name of the field being validated (for error messages)
 * @throws ObsidianError if the path is invalid
 */
export function validatePath(path: string, fieldName: string = 'path'): void {
  if (!path || typeof path !== 'string') {
    throw new ObsidianError(`Invalid ${fieldName}: must be a non-empty string`);
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATH_PATTERNS) {
    if (pattern.test(path)) {
      throw new ObsidianError(`Invalid ${fieldName}: contains dangerous pattern`);
    }
  }

  // Check for dangerous characters
  for (const char of DANGEROUS_CHARS) {
    if (path.includes(char)) {
      throw new ObsidianError(`Invalid ${fieldName}: contains dangerous character`);
    }
  }

  // Check path length (reasonable limit)
  if (path.length > PATH_VALIDATION.MAX_LENGTH) {
    throw new ObsidianError(`Invalid ${fieldName}: path too long`);
  }

  // Ensure path doesn't start with dots (hidden files) followed by slashes
  if (REGEX_PATTERNS.HIDDEN_FILE_WITH_SLASH.test(path)) {
    throw new ObsidianError(`Invalid ${fieldName}: invalid path format`);
  }
}

/**
 * Sanitizes a path by removing dangerous sequences
 * Note: This is a fallback - prefer throwing errors for invalid paths
 * @param path The path to sanitize
 * @returns The sanitized path
 */
export function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  let sanitized = path;

  // Remove null bytes and control characters
  sanitized = sanitized.replace(REGEX_PATTERNS.CONTROL_CHARACTERS, '');

  // Remove path traversal sequences
  sanitized = sanitized.replace(REGEX_PATTERNS.PATH_TRAVERSAL, '');

  // Remove leading slashes and home directory references
  // Note: This combines multiple patterns for efficiency in sanitization
  sanitized = sanitized.replace(/^[\/\\~]+/, '');

  // Remove dangerous characters
  for (const char of DANGEROUS_CHARS) {
    sanitized = sanitized.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }

  // Normalize multiple slashes
  sanitized = sanitized.replace(REGEX_PATTERNS.MULTIPLE_SLASHES, '/');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validates multiple paths at once
 * @param paths Array of paths to validate
 * @param fieldName The name of the field being validated
 * @throws ObsidianError if any path is invalid
 */
export function validatePaths(paths: string[], fieldName: string = 'paths'): void {
  if (!Array.isArray(paths)) {
    throw new ObsidianError(`Invalid ${fieldName}: must be an array`);
  }

  paths.forEach((path, index) => {
    validatePath(path, `${fieldName}[${index}]`);
  });
}