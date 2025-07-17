import { BaseTool, ToolMetadata } from './base.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

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