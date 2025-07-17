import { BaseTool, ToolMetadata } from './base.js';
import { validatePath } from '../utils/pathValidator.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';
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

  async executeTyped(args: GetFileContentsArgs): Promise<any> {
    try {
      // Enhanced input validation with recovery
      if (!args.filepath) {
        return this.handleSimplifiedError(
          new Error('Missing required parameters'),
          'Provide filepath parameter to specify which file to read. Use obsidian_list_files_in_vault to browse available files first',
          {
            filepath: 'notes/example.md',
            format: 'content'
          }
        );
      }
      
      // Validate the filepath
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      const result = await client.getFileContents(args.filepath, args.format);
      return this.formatResponse(result);
    } catch (error: any) {
      // Use centralized error handler for common HTTP errors
      if (error.response?.status) {
        return ObsidianErrorHandler.handleHttpError(error, this.name);
      }
      
      // Fallback to basic error handling
      return this.handleSimplifiedError(
        error,
        'Alternative options: Browse files in your vault (tool: obsidian_list_files_in_vault), Search for files by content (tool: obsidian_simple_search)',
        { query: 'search term' }
      );
    }
  }
}