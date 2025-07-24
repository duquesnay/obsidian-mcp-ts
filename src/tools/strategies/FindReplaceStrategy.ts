import { BaseEditStrategy } from './BaseEditStrategy.js';
import { EditOperation, EditContext, EditResult, ReplaceOperation } from './IEditStrategy.js';

/**
 * Strategy for handling find and replace operations
 * Finds text in a file and replaces it with new text
 */
export class FindReplaceStrategy extends BaseEditStrategy {
  /**
   * Checks if the operation is a replace operation
   */
  async canHandle(operation: EditOperation): Promise<boolean> {
    return operation.type === 'replace';
  }

  /**
   * Executes the find and replace operation
   */
  async execute(operation: EditOperation, context: EditContext): Promise<EditResult> {
    if (operation.type !== 'replace') {
      throw new Error('Cannot execute non-replace operation');
    }

    const replaceOp = operation as ReplaceOperation;

    try {
      // Get current content
      const currentContent = await this.getFileContent(context.filepath, context.client);
      
      // Perform replacement
      const newContent = currentContent.replace(replaceOp.find, replaceOp.replace);
      
      // Check if replacement actually happened
      if (currentContent === newContent) {
        return {
          success: false,
          error: `Text "${replaceOp.find}" not found in ${context.filepath}`,
          suggestion: 'Check the exact text to replace. Text search is case-sensitive.',
          working_alternative: {
            description: 'Append instead',
            example: { file: context.filepath, append: replaceOp.replace }
          }
        };
      }
      
      // Update file
      await this.updateFileContent(context.filepath, newContent, context.client);
      
      return this.formatResult({
        success: true,
        message: `Successfully replaced "${replaceOp.find}" with "${replaceOp.replace}" in ${context.filepath}`,
        operation: 'replace',
        filepath: context.filepath,
        find: replaceOp.find,
        replace: replaceOp.replace
      });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return this.formatErrorWithAlternative(
        `Replace failed: ${errorMessage}`,
        'Try obsidian_simple_replace for basic text replacement',
        { filepath: context.filepath, find: replaceOp.find, replace: replaceOp.replace }
      );
    }
  }
}