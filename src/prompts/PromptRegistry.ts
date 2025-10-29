/**
 * Registry for managing prompt templates
 */

import type { BasePrompt } from './BasePrompt.js';
import type { PromptDefinition, PromptResult } from './types.js';

/**
 * Registry for managing prompt templates
 *
 * Provides centralized registration and lookup of prompt templates,
 * ensuring unique names and efficient access.
 */
export class PromptRegistry {
  private readonly prompts = new Map<string, BasePrompt>();

  /**
   * Register a prompt template
   *
   * @param prompt - The prompt template to register
   * @throws Error if a prompt with the same name already exists
   */
  registerPrompt(prompt: BasePrompt): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt '${prompt.name}' is already registered`);
    }
    this.prompts.set(prompt.name, prompt);
  }

  /**
   * Register multiple prompt templates
   *
   * @param prompts - Array of prompts to register
   * @throws Error if any prompt has a duplicate name
   */
  registerPrompts(prompts: BasePrompt[]): void {
    for (const prompt of prompts) {
      this.registerPrompt(prompt);
    }
  }

  /**
   * Get all registered prompt definitions for MCP ListPrompts response
   *
   * @returns Array of prompt definitions
   */
  listPrompts(): PromptDefinition[] {
    return Array.from(this.prompts.values()).map(prompt => prompt.getDefinition());
  }

  /**
   * Get a specific prompt by name
   *
   * @param name - Name of the prompt to retrieve
   * @returns The prompt template
   * @throws Error if prompt not found
   */
  getPrompt(name: string): BasePrompt {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt '${name}' not found`);
    }
    return prompt;
  }

  /**
   * Check if a prompt exists
   *
   * @param name - Name of the prompt to check
   * @returns True if the prompt exists
   */
  hasPrompt(name: string): boolean {
    return this.prompts.has(name);
  }

  /**
   * Generate a prompt with the given arguments
   *
   * @param name - Name of the prompt
   * @param args - Arguments to pass to the prompt
   * @returns Promise resolving to prompt result
   * @throws Error if prompt not found or arguments invalid
   */
  async generate(name: string, args: Record<string, string> = {}): Promise<PromptResult> {
    const prompt = this.getPrompt(name);
    return await prompt.generate(args);
  }

  /**
   * Get count of registered prompts
   */
  get size(): number {
    return this.prompts.size;
  }

  /**
   * Clear all registered prompts (useful for testing)
   */
  clear(): void {
    this.prompts.clear();
  }
}

/**
 * Singleton instance of the prompt registry
 */
export const promptRegistry = new PromptRegistry();
