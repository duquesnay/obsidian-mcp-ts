import { BaseTool } from './base.js';

export class ListFilesInVaultTool extends BaseTool {
  name = 'obsidian_list_files_in_vault';
  description = 'List all files and directories in the root directory of your Obsidian vault.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {},
    required: []
  };

  async execute(args: any): Promise<any> {
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
      // Enhanced error handling with HTTP status codes
      if (error.response?.status === 403) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'Permission denied. Check your API key and ensure the Obsidian Local REST API plugin is running',
            workingAlternative: 'Verify your OBSIDIAN_API_KEY environment variable and plugin status',
            example: {}
          }
        );
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