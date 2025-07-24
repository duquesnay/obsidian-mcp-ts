import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationError } from '../utils/PathValidationUtil.js';
import { GetFileContentsArgs } from './types/GetFileContentsArgs.js';

export class GetFileContentsTool extends BaseTool<GetFileContentsArgs> {
  name = 'obsidian_get_file_contents';
  description = 'Read content from an Obsidian vault note (NOT filesystem files - vault notes only). Supports different formats.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['read', 'get', 'content', 'file', 'note'],
    version: '1.0.0'
  };
  
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

  async executeTyped(args: GetFileContentsArgs): Promise<ToolResponse> {
    try {
      // Validate the filepath using new utility
      try {
        PathValidationUtil.validate(args.filepath, 'filepath');
      } catch (error) {
        if (error instanceof PathValidationError) {
          return this.handleSimplifiedError(
            error,
            'Provide a valid filepath to read. Use obsidian_list_files_in_vault to browse available files first',
            {
              filepath: 'notes/example.md',
              format: 'content'
            }
          );
        }
        throw error;
      }
      
      const client = this.getClient();
      const result = await client.getFileContents(args.filepath, args.format);
      return this.formatResponse(result);
    } catch (error: unknown) {
      // Use the new handleHttpError method with custom handlers for specific status codes
      if (error && typeof error === 'object' && 'response' in error && (error as any).response?.status) {
        return this.handleHttpError(error, {
          404: {
            message: 'File not found',
            suggestion: 'Alternative options: Browse files in your vault (tool: obsidian_list_files_in_vault), Search for files by content (tool: obsidian_simple_search)',
            example: { query: 'search term' }
          }
        });
      }
      
      // Fallback to basic error handling for non-HTTP errors
      return this.handleSimplifiedError(
        error,
        'Alternative options: Browse files in your vault (tool: obsidian_list_files_in_vault), Search for files by content (tool: obsidian_simple_search)',
        { query: 'search term' }
      );
    }
  }
}