/**
 * Common validation and extraction utilities for resource handlers
 */
export class ResourceValidationUtil {
  /**
   * Extract a parameter from a URI given a prefix
   * Handles edge cases like trailing slashes and URL encoding
   */
  static extractUriParameter(uri: string, prefix: string, paramName: string): string {
    // Handle edge cases where URI equals prefix with or without trailing slash
    if (uri === prefix || uri === prefix.slice(0, -1)) {
      return '';
    }
    
    // Extract the parameter
    let param = uri.substring(prefix.length);
    
    // Remove trailing slash if present
    if (param.endsWith('/')) {
      param = param.slice(0, -1);
    }
    
    // URL decode the parameter
    try {
      param = decodeURIComponent(param);
    } catch (e) {
      // If decoding fails, return the original parameter
    }
    
    return param;
  }

  /**
   * Validate that a required parameter is present and not empty
   * @throws Error if parameter is missing or empty
   */
  static validateRequiredParameter(value: any, paramName: string): void {
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
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
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