/**
 * MCP Completions Module
 *
 * Provides auto-completion for resource template parameters:
 * - File paths: vault://note/{path}, vault://folder/{path}
 * - Tags: vault://tag/{tagname}
 *
 * Uses cached data sources (5min TTL) for fast response times (<100ms target).
 */

export { CompletionHandler } from './CompletionHandler.js';
export type {
  CompletionProvider,
  CompletionReference,
  CompletionArgument,
  CompletionRequest,
  CompletionResult,
} from './types.js';

// Convenience function for registration
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CompletionHandler } from './CompletionHandler.js';

/**
 * Register completion handlers with MCP server
 *
 * @param server - MCP server instance
 */
export async function registerCompletions(server: Server): Promise<void> {
  const handler = new CompletionHandler();
  handler.register(server);
}
