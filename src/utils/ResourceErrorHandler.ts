/**
 * Standardized error handling for resource handlers
 */
export class ResourceErrorHandler {
  /**
   * Main error handler that delegates based on error type
   */
  static handle(error: any, resourceType: string, context?: string): never {
    // If it's a 404 error, format the message appropriately
    if (this.isHttpError(error) && error.response.status === 404) {
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
  static handleApiError(error: any, resourceType?: string, path?: string): never {
    // Check if it's an HTTP error with status code
    if (this.isHttpError(error)) {
      const status = error.response.status;
      
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
  static formatResourceError(message: string, uri: string, details?: any): any {
    const response: any = {
      error: message,
      uri
    };
    
    if (details) {
      response.details = details;
    }
    
    return response;
  }

  /**
   * Type guard to check if error has HTTP response
   */
  static isHttpError(error: any): error is { response: { status: number } } {
    return error && 
           typeof error === 'object' && 
           'response' in error &&
           error.response &&
           typeof error.response.status === 'number';
  }
}