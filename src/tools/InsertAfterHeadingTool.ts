import { BaseTool } from './base.js';

interface InsertAfterHeadingArgs {
  filepath: string;
  heading: string;
  content: string;
  create_file_if_missing?: boolean;
}

export class InsertAfterHeadingTool extends BaseTool {
  name = 'obsidian_insert_after_heading';
  description = 'Insert content after a specific heading. Use this to add content under a heading. If this fails, try obsidian_simple_replace with the heading text and surrounding context instead.';

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
      // Enhanced error handling with recovery suggestions
      if (error.message?.includes('invalid-target') || error.message?.includes('heading not found')) {
        return this.formatResponse({
          success: false,
          error: `Heading "${heading}" not found in ${filepath}`,
          suggestion: `Try using obsidian_simple_replace instead. Find the heading with context like "## ${heading}\\n\\nExisting content" and replace with "## ${heading}\\n\\nExisting content\\n\\n${content}"`,
          alternative_approach: "Use obsidian_simple_append to add content at the end of the document, or obsidian_simple_replace with specific text patterns.",
          operation: 'insert_after_heading',
          filepath,
          heading
        });
      }
      
      return this.handleError(error);
    }
  }
}