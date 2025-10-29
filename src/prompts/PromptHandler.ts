/**
 * MCP Protocol Handler for Prompts
 *
 * Handles prompts/list and prompts/get requests according to MCP specification
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promptRegistry } from './PromptRegistry.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Register prompt handlers with the MCP server
 *
 * Sets up handlers for:
 * - prompts/list: Returns all available prompt templates
 * - prompts/get: Generates a specific prompt with provided arguments
 *
 * @param server - The MCP server instance
 */
export async function registerPromptHandlers(server: Server): Promise<void> {
  // Handle prompts/list requests
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = promptRegistry.listPrompts();
    return { prompts };
  });

  // Handle prompts/get requests
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      // Check if prompt exists
      if (!promptRegistry.hasPrompt(name)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Prompt '${name}' not found. Available prompts: ${promptRegistry
            .listPrompts()
            .map(p => p.name)
            .join(', ')}`
        );
      }

      // Generate the prompt with provided arguments
      const result = await promptRegistry.generate(name, args);

      // Return in MCP GetPromptResult format
      return {
        description: result.description,
        messages: result.messages,
      };
    } catch (error) {
      // Handle known errors
      if (error instanceof McpError) {
        throw error;
      }

      // Handle validation errors (missing arguments, etc.)
      if (error instanceof Error) {
        throw new McpError(ErrorCode.InvalidParams, error.message);
      }

      // Handle unexpected errors
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to generate prompt: ${String(error)}`
      );
    }
  });
}
