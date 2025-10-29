/**
 * Base class for MCP prompt templates
 */

import type { PromptDefinition, PromptMessage, PromptResult } from './types.js';

/**
 * Abstract base class for all prompt templates
 *
 * Prompt templates generate multi-message conversations for common workflows,
 * orchestrating multiple tools and resources.
 */
export abstract class BasePrompt {
  /** Unique identifier for the prompt */
  abstract readonly name: string;

  /** Human-readable description of what the prompt does */
  abstract readonly description: string;

  /** Optional list of arguments the prompt accepts */
  abstract readonly arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;

  /**
   * Get the prompt definition for MCP ListPrompts response
   */
  getDefinition(): PromptDefinition {
    return {
      name: this.name,
      description: this.description,
      arguments: this.arguments.length > 0 ? this.arguments : undefined,
    };
  }

  /**
   * Generate the prompt messages based on provided arguments
   *
   * @param args - Arguments provided by the client
   * @returns Promise resolving to prompt result with messages
   * @throws Error if required arguments are missing or invalid
   */
  abstract generate(args: Record<string, string>): Promise<PromptResult>;

  /**
   * Validate that all required arguments are provided
   *
   * @param args - Arguments to validate
   * @throws Error if validation fails
   */
  protected validateArguments(args: Record<string, string>): void {
    const requiredArgs = this.arguments.filter(arg => arg.required);

    for (const arg of requiredArgs) {
      if (!(arg.name in args) || args[arg.name] === undefined || args[arg.name] === '') {
        throw new Error(`Required argument '${arg.name}' is missing`);
      }
    }
  }

  /**
   * Helper to create a user message
   */
  protected createUserMessage(text: string): PromptMessage {
    return {
      role: 'user',
      content: {
        type: 'text',
        text,
      },
    };
  }

  /**
   * Helper to create an assistant message
   */
  protected createAssistantMessage(text: string): PromptMessage {
    return {
      role: 'assistant',
      content: {
        type: 'text',
        text,
      },
    };
  }
}
