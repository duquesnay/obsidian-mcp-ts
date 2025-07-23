import { BaseTool, ToolMetadata, ToolResponse } from './base.js';

export class ListFilesInVaultTool extends BaseTool {
  name = 'obsidian_list_files_in_vault';
  description = 'List all notes and folders in your Obsidian vault root (NOT filesystem access - Obsidian vault files only).';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['list', 'files', 'vault', 'browse', 'directory'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {},
    required: []
  };

  async executeTyped(args: any): Promise<ToolResponse> {
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
      // Use the new handleHttpError method with custom handlers
      if (error.response?.status) {
        return this.handleHttpError(error, {
          500: 'Server error. The Obsidian REST API may be experiencing issues'
        });
      }
      
      if (error.message?.includes('vault') || error.message?.includes('connection')) {
        return this.handleSimplifiedError(
          error,
          'Cannot connect to Obsidian vault. Ensure Obsidian is running and the Local REST API plugin is active'
        );
      }
      
      // Fallback to basic error handling
      return this.handleSimplifiedError(error);
    }
  }
}