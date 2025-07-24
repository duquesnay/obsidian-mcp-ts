import { IEditStrategy, EditOperation, EditContext, EditResult } from './IEditStrategy.js';
import type { IObsidianClient } from '../../obsidian/interfaces/IObsidianClient.js';

/**
 * Abstract base class for edit strategies
 * Provides common functionality and helper methods
 */
export abstract class BaseEditStrategy implements IEditStrategy {
  /**
   * Determines if this strategy can handle the given operation
   */
  abstract canHandle(operation: EditOperation): Promise<boolean>;

  /**
   * Executes the edit operation
   */
  abstract execute(operation: EditOperation, context: EditContext): Promise<EditResult>;

  /**
   * Formats a successful result
   */
  protected formatResult(result: Partial<EditResult> & { success: true }): EditResult {
    return {
      success: true,
      ...result
    };
  }

  /**
   * Formats an error result
   */
  protected formatError(error: string, suggestion?: string): EditResult {
    const result: EditResult = {
      success: false,
      error
    };

    if (suggestion) {
      result.suggestion = suggestion;
    }

    return result;
  }

  /**
   * Formats an error with a working alternative
   */
  protected formatErrorWithAlternative(
    error: string,
    alternativeDescription: string,
    alternativeExample: Record<string, any>
  ): EditResult {
    return {
      success: false,
      error,
      working_alternative: {
        description: alternativeDescription,
        example: alternativeExample
      }
    };
  }

  /**
   * Gets the current content of a file
   */
  protected async getFileContent(filepath: string, client: IObsidianClient): Promise<string> {
    const content = await client.getFileContents(filepath);
    // Type assertion is safe here because we're not passing a format parameter
    return content as string;
  }

  /**
   * Updates the content of a file
   */
  protected async updateFileContent(filepath: string, content: string, client: IObsidianClient): Promise<void> {
    await client.updateFile(filepath, content);
  }

  /**
   * Appends content to a file
   */
  protected async appendToFile(filepath: string, content: string, client: IObsidianClient): Promise<void> {
    await client.appendContent(filepath, content, false);
  }

  /**
   * Patches content in a file using the Obsidian API
   */
  protected async patchFileContent(
    filepath: string,
    content: string,
    options: {
      targetType: 'heading' | 'block' | 'frontmatter';
      target: string;
      insertAfter?: boolean;
      insertBefore?: boolean;
      createIfNotExists?: boolean;
    },
    client: IObsidianClient
  ): Promise<void> {
    await client.patchContent(filepath, content, options);
  }
}