import { REGEX_PATTERNS } from '../constants.js';

/**
 * Common validation and extraction utilities for resource handlers
 */
export class ResourceValidationUtil {
  /**
   * Extract a parameter from a URI given a prefix
   * Handles edge cases like trailing slashes and URL encoding
   */
  static extractUriParameter(uri: string, prefix: string, paramName: string): string {
    // Remove query parameters first
    const cleanUri = uri.split('?')[0];
    
    // Normalize the prefix to handle trailing slash variations
    const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    const normalizedUri = cleanUri.endsWith('/') && cleanUri.length > normalizedPrefix.length + 1 ? cleanUri.slice(0, -1) : cleanUri;
    
    // Validate that URI starts with the expected prefix
    if (!normalizedUri.startsWith(normalizedPrefix)) {
      throw new Error(`URI does not start with expected prefix '${prefix}'`);
    }
    
    // Handle edge cases where URI equals prefix
    if (normalizedUri === normalizedPrefix) {
      return '';
    }
    
    // Extract the parameter - handle both with and without separator
    let param = normalizedUri.substring(normalizedPrefix.length);
    if (param.startsWith('/')) {
      param = param.substring(1);
    }
    
    // URL decode the parameter
    try {
      param = decodeURIComponent(param);
    } catch (e) {
      // Log warning but continue with original parameter
      console.warn(`Failed to decode URI parameter: ${param}`, e);
    }
    
    return param;
  }

  /**
   * Validate that a required parameter is present and not empty
   * @throws Error if parameter is missing or empty
   */
  static validateRequiredParameter(value: unknown, paramName: string): void {
    if (value === null || value === undefined) {
      throw new Error(`${paramName} is required`);
    }
    
    // For strings, also check if they're empty or whitespace-only
    if (typeof value === 'string' && !value.trim()) {
      throw new Error(`${paramName} is required`);
    }
  }

  /**
   * Normalize a URI by adding or removing trailing slash
   */
  static normalizeUri(uri: string, addTrailingSlash: boolean): string {
    // Remove all trailing slashes first
    let normalized = uri;
    while (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    // Add trailing slash if requested
    if (addTrailingSlash) {
      normalized += '/';
    }
    
    return normalized;
  }

  /**
   * Validate date format (YYYY-MM-DD or "today")
   */
  static validateDateFormat(date: string): boolean {
    if (date === 'today') {
      return true;
    }
    
    // Check format with regex
    const dateRegex = REGEX_PATTERNS.ISO_DATE_FORMAT;
    if (!dateRegex.test(date)) {
      return false;
    }
    
    // Validate it's a real date
    const dateObj = new Date(date + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return false;
    }
    
    // Check if the date components match (to catch invalid dates like 2024-13-45)
    const [year, month, day] = date.split('-').map(Number);
    return dateObj.getFullYear() === year &&
           dateObj.getMonth() === month - 1 &&
           dateObj.getDate() === day;
  }

  /**
   * Normalize tag name by removing # prefix and trimming
   */
  static normalizeTagName(tag: string): string {
    let normalized = tag.trim();
    
    if (normalized.startsWith('#')) {
      normalized = normalized.substring(1);
    }
    
    return normalized;
  }
}