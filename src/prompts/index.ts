/**
 * MCP Prompts for Obsidian
 *
 * This module provides prompt templates for common multi-tool workflows.
 * Prompts orchestrate multiple tools and resources to accomplish complex tasks.
 *
 * Available prompts:
 * - daily_note_workflow: Access or create daily notes with templates
 * - batch_tag_operation: Batch tag operations across multiple files
 *
 * @module prompts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { promptRegistry } from './PromptRegistry.js';
import { registerPromptHandlers } from './PromptHandler.js';
import { DailyNoteWorkflow } from './templates/DailyNoteWorkflow.js';
import { BatchTagOperation } from './templates/BatchTagOperation.js';

// Export types
export type { PromptDefinition, PromptArgument, PromptMessage, PromptResult } from './types.js';

// Export classes
export { BasePrompt } from './BasePrompt.js';
export { PromptRegistry, promptRegistry } from './PromptRegistry.js';
export { registerPromptHandlers } from './PromptHandler.js';

// Export prompt templates
export { DailyNoteWorkflow } from './templates/DailyNoteWorkflow.js';
export { BatchTagOperation } from './templates/BatchTagOperation.js';

/**
 * Register all prompts with the MCP server
 *
 * This function:
 * 1. Registers all available prompt templates (if not already registered)
 * 2. Sets up MCP protocol handlers (prompts/list, prompts/get)
 * 3. Enables prompt capabilities in server
 *
 * @param server - The MCP server instance
 */
export async function registerPrompts(server: Server): Promise<void> {
  // Register all prompt templates (only if not already registered)
  // This allows multiple server initializations without duplicate registration errors
  const prompts = [new DailyNoteWorkflow(), new BatchTagOperation()];

  for (const prompt of prompts) {
    if (!promptRegistry.hasPrompt(prompt.name)) {
      promptRegistry.registerPrompt(prompt);
    }
  }

  // Register MCP protocol handlers
  await registerPromptHandlers(server);
}
