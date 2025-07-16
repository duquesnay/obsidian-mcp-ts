import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

export class ListFilesInDirTool extends BaseTool {
  name = 'obsidian_list_files_in_dir';
  description = 'List notes and folders in a specific Obsidian vault directory (vault-only - NOT general filesystem access).';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      dirpath: {
        type: 'string',
        description: 'Path to list files from (relative to your vault root). Note that empty directories will not be returned.'
      }
    },
    required: ['dirpath']
  };

  async executeTyped(args: { dirpath: string }): Promise<any> {
    try {
      if (!args.dirpath) {
        throw new Error('dirpath argument missing in arguments');
      }
      
      // Validate the directory path
      validatePath(args.dirpath, 'dirpath');
      
      const client = this.getClient();
      
      try {
        const files = await client.listFilesInDir(args.dirpath);
        return this.formatResponse(files);
      } catch (error: any) {
        // If we get a 404 error, check if it's an empty directory
        if (error.response?.status === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
          // Check if the path exists and is a directory
          const pathInfo = await client.checkPathExists(args.dirpath);
          
          if (pathInfo.exists && pathInfo.type === 'directory') {
            // It's an empty directory, return empty array
            return this.formatResponse([]);
          }
        }
        
        // Re-throw the error if it's not an empty directory case
        throw error;
      }
    } catch (error: any) {
      // Use common error handler for HTTP errors
      if (error.response?.status) {
        return ObsidianErrorHandler.handleHttpError(error, this.name);
      }
      
      return this.handleError(error);
    }
  }
}