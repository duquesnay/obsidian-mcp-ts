import { BaseTool } from './base.js';

interface InsertAfterHeadingArgs {
  filepath: string;
  heading: string;
  content: string;
  create_file_if_missing?: boolean;
}

export class InsertAfterHeadingTool extends BaseTool {
  name = 'obsidian_insert_after_heading';
  description = 'Insert content after a specific heading. Use this to add content under a heading.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string' as const,
        description: 'Path to the file (relative to vault root)'
      },
      heading: {
        type: 'string' as const,
        description: 'The heading text to insert after (without # symbols)'
      },
      content: {
        type: 'string' as const,
        description: 'Content to insert after the heading'
      },
      create_file_if_missing: {
        type: 'boolean' as const,
        description: 'Create the file if it doesn\'t exist (default: false)',
        default: false
      }
    },
    required: ['filepath', 'heading', 'content']
  };

  async execute(args: InsertAfterHeadingArgs): Promise<any> {
    const { filepath, heading, content, create_file_if_missing = false } = args;

    try {
      const client = this.getClient();
      
      // Use the existing patch_content functionality with insertAfterHeading
      await client.patchContent(filepath, content, {
        targetType: 'heading',
        target: heading,
        insertAfter: true,
        createIfNotExists: create_file_if_missing
      });
      
      return this.formatResponse({
        success: true,
        message: `Successfully inserted content after heading "${heading}" in ${filepath}`,
        operation: 'insert_after_heading',
        filepath,
        heading
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}