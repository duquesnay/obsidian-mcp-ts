
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import type { HttpError } from '../types/common.js';
import type { ToolResponse } from '../tools/base.js';

// Error response structure
interface ErrorResponse {
  success: false;
  error: string;
  tool: string;
  suggestion?: string;
  working_alternative?: string;
  example?: Record<string, unknown>;
}

/**
 * Centralized error handler for common HTTP status codes in Obsidian API
 */
export class ObsidianErrorHandler {
  /**
   * Handle HTTP errors with appropriate recovery suggestions
   */
  static handleHttpError(error: unknown, toolName: string): ToolResponse {
    // Type guard to check if it's an HTTP error
    const isHttpError = (err: unknown): err is HttpError => {
      return err instanceof Error && 'response' in err && 
        typeof (err as any).response === 'object' &&
        'status' in (err as any).response;
    };

    if (!isHttpError(error)) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check for specific network errors
      if (errorMessage.includes('ECONNREFUSED')) {
        return this.handleConnectionRefused(toolName);
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ESOCKETTIMEDOUT')) {
        return this.handleTimeout(toolName);
      } else if (errorMessage.includes('ENOTFOUND')) {
        return this.handleHostNotFound(toolName);
      }
      
      return this.formatResponse({
        success: false,
        error: errorMessage,
        tool: toolName
      });
    }

    const status = error.response!.status;
    
    switch (status) {
      case 401:
        return this.handle401(error, toolName);
      case 403:
        return this.handle403(error, toolName);
      case 404:
        return this.handle404(error, toolName);
      case 500:
        return this.handle500(error, toolName);
      case 502:
      case 503:
      case 504:
        return this.handleServiceUnavailable(error, toolName, status);
      default:
        return this.formatResponse({
          success: false,
          error: `HTTP ${status}: ${error.message || 'Unknown error'}`,
          tool: toolName,
          suggestion: 'Check the Obsidian REST API plugin status and logs'
        });
    }
  }

  private static handleConnectionRefused(toolName: string): ToolResponse {
    return this.formatResponse({
      success: false,
      error: 'Connection refused - Cannot connect to Obsidian REST API',
      tool: toolName,
      suggestion: 'Ensure the Obsidian Local REST API plugin is enabled and running',
      working_alternative: 'Open Obsidian → Settings → Community plugins → Enable "Local REST API"',
      example: {
        troubleshooting: `Check that Obsidian is running and the REST API is listening on port ${OBSIDIAN_DEFAULTS.PORT}`
      }
    });
  }

  private static handleTimeout(toolName: string): ToolResponse {
    return this.formatResponse({
      success: false,
      error: 'Request timeout - Obsidian REST API is not responding',
      tool: toolName,
      suggestion: 'The request took too long. Obsidian might be busy or the REST API plugin might be unresponsive',
      working_alternative: 'Try restarting the Local REST API plugin or Obsidian itself',
      example: {
        troubleshooting: 'Disable and re-enable the Local REST API plugin in Obsidian settings'
      }
    });
  }

  private static handleHostNotFound(toolName: string): ToolResponse {
    return this.formatResponse({
      success: false,
      error: 'Host not found - Cannot resolve Obsidian REST API address',
      tool: toolName,
      suggestion: 'Check your OBSIDIAN_HOST environment variable',
      working_alternative: `Use the default host: ${OBSIDIAN_DEFAULTS.HOST} or localhost`,
      example: {
        setup: `export OBSIDIAN_HOST=${OBSIDIAN_DEFAULTS.HOST}`
      }
    });
  }

  private static handleServiceUnavailable(error: HttpError, toolName: string, status: number): ToolResponse {
    return this.formatResponse({
      success: false,
      error: `Service unavailable (HTTP ${status}) - Obsidian REST API is experiencing issues`,
      tool: toolName,
      suggestion: 'The Obsidian REST API service is temporarily unavailable',
      working_alternative: 'Wait a moment and try again, or restart the Local REST API plugin',
      example: {
        troubleshooting: 'Check Obsidian console logs for any plugin errors'
      }
    });
  }

  private static handle401(error: HttpError, toolName: string): ToolResponse {
    return this.formatResponse({
      success: false,
      error: 'Authentication failed',
      tool: toolName,
      suggestion: 'Check your OBSIDIAN_API_KEY environment variable',
      working_alternative: 'Ensure the Obsidian Local REST API plugin is running and you have the correct API key',
      example: {
        setup: 'export OBSIDIAN_API_KEY=your_api_key_here'
      }
    });
  }

  private static handle403(error: HttpError, toolName: string): ToolResponse {
    return this.formatResponse({
      success: false,
      error: 'Permission denied',
      tool: toolName,
      suggestion: 'Verify your OBSIDIAN_API_KEY is correct and has the necessary permissions',
      working_alternative: 'Check the Local REST API plugin settings in Obsidian',
      example: {
        troubleshooting: 'Go to Settings → Community plugins → Local REST API → Copy API Key'
      }
    });
  }

  private static handle404(error: HttpError, toolName: string): ToolResponse {
    const isDirectory = toolName.includes('Dir') || toolName.includes('Directory');
    const resourceType = isDirectory ? 'Directory' : 'File';
    
    return this.formatResponse({
      success: false,
      error: `${resourceType} not found`,
      tool: toolName,
      suggestion: `${resourceType} does not exist in the vault`,
      working_alternative: `Use obsidian_list_files_in_vault to see available files${isDirectory ? ' and directories' : ''}`,
      example: {
        tool: 'obsidian_list_files_in_vault',
        args: {}
      }
    });
  }

  private static handle500(error: HttpError, toolName: string): ToolResponse {
    return this.formatResponse({
      success: false,
      error: 'Internal server error',
      tool: toolName,
      suggestion: 'The Obsidian REST API encountered an error',
      working_alternative: 'Try restarting the Local REST API plugin or check Obsidian console for errors',
      example: {
        troubleshooting: 'Disable and re-enable the Local REST API plugin in Obsidian settings'
      }
    });
  }

  /**
   * Format response as MCP tool response
   */
  private static formatResponse(errorResponse: ErrorResponse): ToolResponse {
    return {
      type: 'text',
      text: JSON.stringify(errorResponse, null, 2)
    };
  }

}