import { ObsidianError } from '../types/errors.js';
import { PATH_VALIDATION } from '../constants.js';

const DANGEROUS_PATH_PATTERNS = [
  /\.\.[\/\\]/,           // Path traversal: ../ or ..\
  /^[\/\\]/,              // Absolute paths starting with / or \
  /^[a-zA-Z]:[\/\\]/,     // Windows absolute paths (C:\, D:\, etc.)
  /\0/,                   // Null bytes
  /[\x00-\x1f\x7f]/,      // Control characters
  /^~/,                   // Home directory expansion
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
  if (/^\.+[\/\\]/.test(path)) {
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
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

  // Remove path traversal sequences
  sanitized = sanitized.replace(/\.\.[\/\\]/g, '');

  // Remove leading slashes and home directory references
  sanitized = sanitized.replace(/^[\/\\~]+/, '');

  // Remove dangerous characters
  for (const char of DANGEROUS_CHARS) {
    sanitized = sanitized.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }

  // Normalize multiple slashes
  sanitized = sanitized.replace(/[\/\\]+/g, '/');

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