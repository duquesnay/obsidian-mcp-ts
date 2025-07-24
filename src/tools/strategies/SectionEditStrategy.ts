import { BaseEditStrategy } from './BaseEditStrategy.js';
import { EditOperation, EditContext, EditResult, NewSectionOperation } from './IEditStrategy.js';

/**
 * Strategy for handling new section operations
 * Creates new sections in documents at specified positions
 */
export class SectionEditStrategy extends BaseEditStrategy {
  /**
   * Checks if the operation is a new-section operation
   */
  async canHandle(operation: EditOperation): Promise<boolean> {
    return operation.type === 'new-section';
  }

  /**
   * Executes the new section operation
   */
  async execute(operation: EditOperation, context: EditContext): Promise<EditResult> {
    if (operation.type !== 'new-section') {
      throw new Error('Cannot execute non-new-section operation');
    }

    const sectionOp = operation as NewSectionOperation;
    const sectionContent = sectionOp.content || '';
    const newSection = `\n## ${sectionOp.title}\n${sectionContent}`;

    try {
      if (sectionOp.at === 'end') {
        // Simple append for end position
        await this.appendToFile(context.filepath, newSection, context.client);
      } else if (sectionOp.at === 'start') {
        // Prepend to start
        const currentContent = await this.getFileContent(context.filepath, context.client);
        const newContent = newSection + '\n\n' + currentContent;
        await this.updateFileContent(context.filepath, newContent, context.client);
      } else {
        // Insert after specified heading
        await this.patchFileContent(
          context.filepath,
          newSection,
          {
            targetType: 'heading',
            target: sectionOp.at,
            insertAfter: true,
            createIfNotExists: false
          },
          context.client
        );
      }

      return this.formatResult({
        success: true,
        message: `Successfully created section "${sectionOp.title}" in ${context.filepath}`,
        operation: 'new_section',
        filepath: context.filepath,
        section: sectionOp.title,
        position: sectionOp.at
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return this.formatErrorWithAlternative(
        `New section creation failed: ${errorMessage}`,
        'Try appending the section to the end',
        {
          file: context.filepath,
          append: `\n## ${sectionOp.title}\n${sectionContent}`
        }
      );
    }
  }
}