/**
 * Logging module exports
 *
 * Provides MCP-compatible logging infrastructure with:
 * - Circular buffer for memory-efficient log storage
 * - Level-based filtering
 * - Integration with MCP protocol
 */

export { LoggingManager } from './LoggingManager.js';
export { LoggingHandler } from './LoggingHandler.js';
export type {
  LogLevel,
  LogEntry,
  LoggingConfig,
} from './types.js';
export { LOG_LEVEL_SEVERITY } from './types.js';

/**
 * Register logging with MCP server
 *
 * This function creates and configures a LoggingHandler for the server.
 * It should be called during server initialization.
 *
 * @param server The MCP server instance
 * @param config Optional logging configuration
 * @returns The configured LoggingHandler
 *
 * @example
 * ```typescript
 * import { registerLogging } from './logging/index.js';
 *
 * const server = new Server({ name: 'my-server', version: '1.0.0' });
 * const loggingHandler = await registerLogging(server, {
 *   maxEntries: 2000,
 *   minLevel: 'info',
 * });
 * ```
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { LoggingHandler } from './LoggingHandler.js';
import { LoggingManager } from './LoggingManager.js';
import { LoggingConfig } from './types.js';

export async function registerLogging(
  server: Server,
  config?: LoggingConfig
): Promise<LoggingHandler> {
  // Create logging manager
  const loggingManager = new LoggingManager(config);

  // Create and setup handler
  const loggingHandler = new LoggingHandler(server, loggingManager);

  // Log initialization
  await loggingHandler.logMessage('info', 'Logging system initialized', 'LoggingSystem', {
    config: loggingManager.getConfig(),
  });

  return loggingHandler;
}
