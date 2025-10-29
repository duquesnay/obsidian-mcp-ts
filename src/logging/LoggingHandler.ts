import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { LoggingManager } from './LoggingManager.js';
import { LogLevel } from './types.js';

/**
 * Integrates logging with MCP protocol
 *
 * Features:
 * - Sends logs to client via server.sendLoggingMessage()
 * - Provides methods for tools to log their usage
 * - Graceful degradation if client doesn't support logging
 */
export class LoggingHandler {
  private loggingManager: LoggingManager;
  private server: Server;
  private clientSupportsLogging = false;

  constructor(server: Server, loggingManager: LoggingManager) {
    this.server = server;
    this.loggingManager = loggingManager;

    // Store reference to original oninitialized callback if it exists
    const originalOnInitialized = server.oninitialized;

    // Check if client supports logging after initialization
    server.oninitialized = () => {
      // Call original callback if it existed
      if (originalOnInitialized) {
        originalOnInitialized();
      }

      const capabilities = server.getClientCapabilities();
      this.clientSupportsLogging = capabilities?.logging !== undefined;

      if (this.clientSupportsLogging) {
        this.logMessage('info', 'Logging enabled for MCP client');
      } else {
        this.logMessage('info', 'Client does not support logging (will log locally only)');
      }
    };
  }

  /**
   * Log a message and optionally send to client
   */
  public async logMessage(
    level: LogLevel,
    message: string,
    toolName?: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    // Always log locally
    const logged = this.loggingManager.logMessage(level, message, toolName, context);

    if (!logged) {
      // Filtered out by level
      return;
    }

    // Send to client if supported and enabled
    if (this.clientSupportsLogging && this.loggingManager.getConfig().sendToClient) {
      try {
        await this.server.sendLoggingMessage({
          level,
          data: message,
          logger: toolName,
        });
      } catch (error) {
        // Don't throw on logging errors - just track them locally
        this.loggingManager.logError(
          'Failed to send log to client',
          error as Error,
          'LoggingHandler'
        );
      }
    }
  }

  /**
   * Log an error
   */
  public async logError(
    message: string,
    error: Error,
    toolName?: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    // Log locally with error details
    this.loggingManager.logError(message, error, toolName, context);

    // Send to client
    if (this.clientSupportsLogging && this.loggingManager.getConfig().sendToClient) {
      try {
        await this.server.sendLoggingMessage({
          level: 'error',
          data: `${message}: ${error.message}`,
          logger: toolName,
        });
      } catch (sendError) {
        // Ignore errors sending to client
        this.loggingManager.logError(
          'Failed to send error log to client',
          sendError as Error,
          'LoggingHandler'
        );
      }
    }
  }

  /**
   * Log a tool execution start
   * This should be called by tools themselves at the start of execution
   */
  public async logToolStart(toolName: string, args?: Record<string, unknown>): Promise<number> {
    const startTime = Date.now();
    await this.logMessage('debug', `Tool called: ${toolName}`, toolName, { args });
    return startTime;
  }

  /**
   * Log a successful tool execution
   * This should be called by tools themselves after successful completion
   */
  public async logToolSuccess(
    toolName: string,
    startTime: number,
    result?: unknown
  ): Promise<void> {
    const duration = Date.now() - startTime;
    await this.logMessage('info', `Tool completed successfully in ${duration}ms`, toolName, {
      duration,
      resultSize: result ? JSON.stringify(result).length : 0,
    });
  }

  /**
   * Log a failed tool execution
   * This should be called by tools themselves in catch blocks
   */
  public async logToolError(
    toolName: string,
    startTime: number,
    error: Error
  ): Promise<void> {
    const duration = Date.now() - startTime;
    await this.logError(`Tool failed after ${duration}ms`, error, toolName, { duration });
  }

  /**
   * Get the underlying logging manager
   */
  public getManager(): LoggingManager {
    return this.loggingManager;
  }
}
