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
      // Enhanced input validation with recovery
      if (!filepath || !heading || !content) {
        return this.handleErrorWithRecovery(
          new Error('Missing required parameters'),
          {
            suggestion: 'Provide filepath, heading, and content parameters',
            workingAlternative: 'Use obsidian_list_files_in_vault to browse available files if you need to find the target file',
            example: {
              filepath: 'notes/example.md',
              heading: 'Section Title',
              content: 'Content to insert',
              create_file_if_missing: false
            }
          }
        );
      }

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
      // Enhanced error handling with HTTP status codes
      if (error.response?.status === 404) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'File does not exist. Check the filepath or set create_file_if_missing to true',
            workingAlternative: 'Use obsidian_list_files_in_vault to find the correct file path',
            example: {
              filepath: 'corrected/file/path.md',
              heading: heading,
              content: content,
              create_file_if_missing: true
            }
          }
        );
      }
      
      if (error.response?.status === 403) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'Permission denied. Check your API key and ensure the Obsidian Local REST API plugin is running',
            workingAlternative: 'Verify your OBSIDIAN_API_KEY environment variable and plugin status',
            example: {
              filepath: filepath,
              heading: heading,
              content: content
            }
          }
        );
      }
      
      if (error.message?.includes('invalid-target') || error.message?.includes('heading not found')) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: `Heading "${heading}" not found in ${filepath}. Try using obsidian_simple_replace instead with surrounding context`,
            workingAlternative: `Use obsidian_simple_replace to find the heading with context like "## ${heading}\\n\\nExisting content" and replace with "## ${heading}\\n\\nExisting content\\n\\n${content}"`,
            example: {
              filepath: filepath,
              find: `## ${heading}`,
              replace: `## ${heading}\\n\\n${content}`
            }
          }
        );
      }
      
      // Fallback to basic error handling with alternatives
      return this.handleError(error, [
        {
          description: 'Get file content to see available headings',
          tool: 'obsidian_get_file_contents',
          example: { filepath: filepath }
        },
        {
          description: 'Use simple replace with heading context',
          tool: 'obsidian_simple_replace',
          example: { filepath: filepath, find: `## ${heading}`, replace: `## ${heading}\\n\\n${content}` }
        },
        {
          description: 'Append content to end of file',
          tool: 'obsidian_simple_append',
          example: { filepath: filepath, content: content }
        }
      ]);
    }
  }
}