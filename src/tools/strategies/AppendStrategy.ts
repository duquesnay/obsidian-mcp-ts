import { BaseEditStrategy } from './BaseEditStrategy.js';
import { EditOperation, EditContext, EditResult, AppendOperation } from './IEditStrategy.js';

/**
 * Strategy for handling append operations
 * Adds content to the end of a file
 */
export class AppendStrategy extends BaseEditStrategy {
  /**
   * Checks if the operation is an append operation
   */
  async canHandle(operation: EditOperation): Promise<boolean> {
    return operation.type === 'append';
  }

  /**
   * Executes the append operation
   */
  async execute(operation: EditOperation, context: EditContext): Promise<EditResult> {
    if (operation.type !== 'append') {
      throw new Error('Cannot execute non-append operation');
    }

    const appendOp = operation as AppendOperation;

    try {
      await this.appendToFile(context.filepath, appendOp.content, context.client);
      
      return this.formatResult({
        success: true,
        message: `Successfully appended content to ${context.filepath}`,
        operation: 'append',
        filepath: context.filepath
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return this.formatErrorWithAlternative(
        `Append failed: ${errorMessage}`,
        'Try using obsidian_simple_append instead',
        {
          filepath: context.filepath,
          content: appendOp.content,
          create_file_if_missing: true
        }
      );
    }
  }
}