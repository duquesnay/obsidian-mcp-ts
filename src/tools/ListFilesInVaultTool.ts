import { BaseTool } from './base.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

export class ListFilesInVaultTool extends BaseTool {
  name = 'obsidian_list_files_in_vault';
  description = 'List all notes and folders in your Obsidian vault root (NOT filesystem access - Obsidian vault files only).';
  
  inputSchema = {
    type: 'object' as const,
    properties: {},
    required: []
  };

  async executeTyped(args: any): Promise<any> {
    try {
      const client = this.getClient();
      const files = await client.listFilesInVault();
      
      // Structure the response with files and count properties
      const response = {
        files,
        count: files.length
      };
      
      return this.formatResponse(response);
    } catch (error: any) {
      // Use common error handler for HTTP errors
      if (error.response?.status) {
        return ObsidianErrorHandler.handleHttpError(error, this.name);
      }
      
      if (error.message?.includes('vault') || error.message?.includes('connection')) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'Cannot connect to Obsidian vault. Ensure Obsidian is running and the Local REST API plugin is active',
            workingAlternative: 'Check that Obsidian is open and the plugin is enabled in settings',
            example: {}
          }
        );
      }
      
      // Fallback to basic error handling with alternatives
      return this.handleError(error, [
        {
          description: 'Search for specific files',
          tool: 'obsidian_simple_search',
          example: { query: 'filename' }
        },
        {
          description: 'Get specific file content',
          tool: 'obsidian_get_file_contents',
          example: { filepath: 'notes/example.md' }
        }
      ]);
    }
  }
}