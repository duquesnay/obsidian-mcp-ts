import { HttpError, JsonObject, JsonValue } from '../types/common.js';

/**
 * Standardized error handling for resource handlers
 */
export class ResourceErrorHandler {
  /**
   * Main error handler that delegates based on error type
   */
  static handle(error: unknown, resourceType: string, context?: string): never {
    // If it's a 404 error, format the message appropriately
    if (this.isHttpError(error) && error.response?.status === 404) {
      const message = context 
        ? `${resourceType} not found: ${context}`
        : `${resourceType} not found`;
      throw new Error(message);
    }
    
    // For other errors, use handleApiError
    this.handleApiError(error, resourceType, context);
  }

  /**
   * Handle validation errors with consistent messaging
   */
  static validationError(paramName: string, reason: string): never {
    throw new Error(`Invalid ${paramName}: ${reason}`);
  }

  /**
   * Handle not found errors with consistent messaging
   */
  static handleNotFound(resourceType: string, path?: string): never {
    const message = path 
      ? `${resourceType} not found: ${path}`
      : `${resourceType} not found`;
    throw new Error(message);
  }

  /**
   * Handle validation errors with consistent messaging (alias for backwards compatibility)
   */
  static handleValidationError(paramName: string, reason: string): never {
    this.validationError(paramName, reason);
  }

  /**
   * Handle API errors with appropriate messages based on status code
   */
  static handleApiError(error: unknown, resourceType?: string, path?: string): never {
    // Check if it's an HTTP error with status code
    if (this.isHttpError(error)) {
      const status = error.response?.status;
      
      switch (status) {
        case 404:
          this.handleNotFound(resourceType || 'Resource', path);
          break;
        case 403:
          throw new Error(`Access denied to ${resourceType}: ${path}`);
        case 401:
          throw new Error('Authentication failed. Please check your API key.');
        case 500:
          throw new Error(`Server error: ${error.message}`);
        default:
          throw error;
      }
    }
    
    // For non-HTTP errors, throw as-is
    throw error;
  }

  /**
   * Format error response for resource handlers
   */
  static formatResourceError(message: string, uri: string, details?: unknown): JsonObject {
    const response: JsonObject = {
      error: message,
      uri
    };
    
    if (details !== undefined) {
      // Ensure details is JSON-serializable
      response.details = this.toJsonValue(details);
    }
    
    return response;
  }
  
  /**
   * Convert unknown value to JsonValue
   */
  private static toJsonValue(value: unknown): JsonValue {
    if (value === null || 
        typeof value === 'string' || 
        typeof value === 'number' || 
        typeof value === 'boolean') {
      return value;
    }
    
    if (Array.isArray(value)) {
      return value.map(v => this.toJsonValue(v));
    }
    
    if (typeof value === 'object' && value !== null) {
      const result: JsonObject = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.toJsonValue(val);
      }
      return result;
    }
    
    // For functions, undefined, symbols, etc., convert to string
    return String(value);
  }

  /**
   * Type guard to check if error has HTTP response
   */
  static isHttpError(error: unknown): error is HttpError {
    return !!(error && 
           typeof error === 'object' && 
           'response' in error &&
           (error as any).response &&
           typeof (error as any).response === 'object' &&
           'status' in (error as any).response &&
           typeof (error as any).response.status === 'number');
  }
}