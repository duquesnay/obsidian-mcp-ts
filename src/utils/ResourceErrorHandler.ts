import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { HttpError, JsonObject, JsonValue } from '../types/common.js';

/**
 * Standardized error handling for resource handlers (MCP3)
 *
 * Uses MCP protocol-compliant error codes for consistent error handling
 * across all MCP clients and tools. Maps HTTP status codes to appropriate
 * MCP error codes while preserving error context.
 *
 * Error Code Mapping:
 * - 404 → MethodNotFound (-32601): Resource not found
 * - 400, 401, 403 → InvalidParams (-32602): Validation/auth errors
 * - 500+ → InternalError (-32603): Server errors
 *
 * @example
 * ```typescript
 * try {
 *   const resource = await client.getResource(uri);
 * } catch (error) {
 *   ResourceErrorHandler.handle(error, 'vault://note', 'meeting-notes.md');
 *   // Throws McpError with appropriate error code
 * }
 * ```
 */
export class ResourceErrorHandler {
  /**
   * Map HTTP status codes to MCP error codes
   *
   * Maps based on semantic meaning to maintain protocol compliance
   * while providing meaningful error context to clients.
   */
  private static mapHttpStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case 404:
        return ErrorCode.MethodNotFound; // Resource not found
      case 401:
      case 403:
        return ErrorCode.InvalidParams; // Authentication/authorization failure
      case 400:
        return ErrorCode.InvalidParams; // Bad request
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorCode.InternalError; // Server error
      default:
        return ErrorCode.InternalError; // Unknown errors default to internal error
    }
  }

  /**
   * Main error handler that delegates based on error type
   */
  static handle(error: unknown, resourceType: string, context?: string): never {
    // If it's a 404 error, format the message appropriately
    if (this.isHttpError(error) && error.response?.status === 404) {
      const message = context
        ? `${resourceType} not found: ${context}`
        : `${resourceType} not found`;
      throw new McpError(ErrorCode.MethodNotFound, message);
    }

    // For other errors, use handleApiError
    this.handleApiError(error, resourceType, context);
  }

  /**
   * Handle validation errors with consistent messaging
   */
  static validationError(paramName: string, reason: string): never {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid ${paramName}: ${reason}`
    );
  }

  /**
   * Handle not found errors with consistent messaging
   */
  static handleNotFound(resourceType: string, path?: string): never {
    const message = path
      ? `${resourceType} not found: ${path}`
      : `${resourceType} not found`;
    throw new McpError(ErrorCode.MethodNotFound, message);
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

      // If status is undefined, treat as internal error
      if (status === undefined) {
        throw new McpError(
          ErrorCode.InternalError,
          error.message || 'Unknown HTTP error occurred'
        );
      }

      const errorCode = this.mapHttpStatusToErrorCode(status);

      switch (status) {
        case 404:
          this.handleNotFound(resourceType || 'Resource', path);
          break;
        case 403:
          throw new McpError(
            ErrorCode.InvalidParams,
            `Access denied to ${resourceType}: ${path}`
          );
        case 401:
          throw new McpError(
            ErrorCode.InvalidParams,
            'Authentication failed. Please check your API key.'
          );
        case 500:
        case 502:
        case 503:
        case 504:
          throw new McpError(
            ErrorCode.InternalError,
            `Server error: ${error.message}`
          );
        default:
          // For unknown HTTP errors, wrap in McpError
          throw new McpError(
            errorCode,
            error.message || 'Unknown error occurred'
          );
      }
    }

    // For non-HTTP errors, wrap in McpError with InternalError code
    if (error instanceof Error) {
      throw new McpError(ErrorCode.InternalError, error.message);
    }

    // For completely unknown errors
    throw new McpError(
      ErrorCode.InternalError,
      'An unknown error occurred'
    );
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