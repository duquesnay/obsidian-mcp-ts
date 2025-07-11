import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class GetFileContentsTool extends BaseTool {
  name = 'obsidian_get_file_contents';
  description = 'Return the content of a single file in your vault. Supports different formats for token optimization.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to get the content from (relative to vault root).'
      },
      format: {
        type: 'string',
        enum: ['content', 'metadata', 'frontmatter', 'plain', 'html'],
        description: 'Format to retrieve: content (default), metadata (file info only), frontmatter (YAML only), plain (no markdown), html (rendered)'
      }
    },
    required: ['filepath']
  };

  async executeTyped(args: { filepath: string; format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html' }): Promise<any> {
    try {
      // Enhanced input validation with recovery
      if (!args.filepath) {
        return this.handleErrorWithRecovery(
          new Error('Missing required parameters'),
          {
            suggestion: 'Provide filepath parameter to specify which file to read',
            workingAlternative: 'Use obsidian_list_files_in_vault to browse available files first',
            example: {
              filepath: 'notes/example.md',
              format: 'content'
            }
          }
        );
      }
      
      // Validate the filepath
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      const result = await client.getFileContents(args.filepath, args.format);
      return this.formatResponse(result);
    } catch (error: any) {
      // Enhanced error handling with HTTP status codes
      if (error.response?.status === 404) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'File does not exist. Check the filepath or use obsidian_list_files_in_vault to browse available files',
            workingAlternative: 'Use obsidian_list_files_in_vault to find the correct file path',
            example: {
              filepath: 'corrected/file/path.md'
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
              filepath: args.filepath
            }
          }
        );
      }
      
      // Fallback to basic error handling with alternatives
      return this.handleError(error, [
        {
          description: 'Browse files in your vault',
          tool: 'obsidian_list_files_in_vault'
        },
        {
          description: 'Search for files by content',
          tool: 'obsidian_simple_search',
          example: { query: 'search term' }
        }
      ]);
    }
  }
}