
// MCP tool response format
interface ToolResponse {
  type: 'text';
  text: string;
}

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
  static handleHttpError(error: any, toolName: string): ToolResponse {
    if (!error.response) {
      return this.formatResponse({
        success: false,
        error: error.message || 'Unknown error occurred',
        tool: toolName
      });
    }

    const status = error.response.status;
    
    switch (status) {
      case 401:
        return this.handle401(error, toolName);
      case 403:
        return this.handle403(error, toolName);
      case 404:
        return this.handle404(error, toolName);
      case 500:
        return this.handle500(error, toolName);
      default:
        return this.formatResponse({
          success: false,
          error: `HTTP ${status}: ${error.message}`,
          tool: toolName
        });
    }
  }

  private static handle401(error: any, toolName: string): ToolResponse {
    return this.formatResponse({
      success: false,
      error: error.message || 'Authentication failed',
      tool: toolName,
      suggestion: 'Check your OBSIDIAN_API_KEY environment variable',
      working_alternative: 'Ensure the Obsidian Local REST API plugin is running and you have the correct API key',
      example: {
        setup: 'export OBSIDIAN_API_KEY=your_api_key_here'
      }
    });
  }

  private static handle403(error: any, toolName: string): ToolResponse {
    return this.formatResponse({
      success: false,
      error: error.message || 'Permission denied',
      tool: toolName,
      suggestion: 'Verify your OBSIDIAN_API_KEY is correct and has the necessary permissions',
      working_alternative: 'Check the Local REST API plugin settings in Obsidian',
      example: {
        troubleshooting: 'Go to Settings → Community plugins → Local REST API → Copy API Key'
      }
    });
  }

  private static handle404(error: any, toolName: string): ToolResponse {
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

  private static handle500(error: any, toolName: string): ToolResponse {
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