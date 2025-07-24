import { BaseEditStrategy } from './BaseEditStrategy.js';
import { EditOperation, EditContext, EditResult, HeadingInsertOperation } from './IEditStrategy.js';

/**
 * Strategy for handling heading insert operations
 * Inserts content before or after a specified heading
 */
export class HeadingInsertStrategy extends BaseEditStrategy {
  /**
   * Checks if the operation is a heading-insert operation
   */
  async canHandle(operation: EditOperation): Promise<boolean> {
    return operation.type === 'heading-insert';
  }

  /**
   * Executes the heading insert operation
   */
  async execute(operation: EditOperation, context: EditContext): Promise<EditResult> {
    if (operation.type !== 'heading-insert') {
      throw new Error('Cannot execute non-heading-insert operation');
    }

    const headingOp = operation as HeadingInsertOperation;

    try {
      // Prepare patch options based on position
      const patchOptions = {
        targetType: 'heading' as const,
        target: headingOp.heading,
        insertAfter: headingOp.position === 'after',
        insertBefore: headingOp.position === 'before',
        createIfNotExists: false
      };

      // Execute the patch
      await this.patchFileContent(
        context.filepath,
        headingOp.content,
        patchOptions,
        context.client
      );

      // Return success result
      const operationType = headingOp.position === 'after' 
        ? 'insert_after_heading' 
        : 'insert_before_heading';
      
      return this.formatResult({
        success: true,
        message: `Successfully inserted content ${headingOp.position} heading "${headingOp.heading}" in ${context.filepath}`,
        operation: operationType,
        filepath: context.filepath,
        heading: headingOp.heading
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Return error with helpful alternatives
      return {
        success: false,
        error: `Heading insertion failed: ${errorMessage}`,
        possible_causes: [
          `Heading "${headingOp.heading}" not found in document`,
          "File doesn't exist",
          "Permission or API issues"
        ],
        working_alternatives: [
          {
            description: "Append to end instead",
            example: { file: context.filepath, append: headingOp.content }
          },
          {
            description: "Use simple text replacement",
            example: { file: context.filepath, find: "TBD", replace: headingOp.content }
          }
        ]
      };
    }
  }
}