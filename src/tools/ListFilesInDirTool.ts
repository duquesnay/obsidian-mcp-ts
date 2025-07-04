import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class ListFilesInDirTool extends BaseTool {
  name = 'obsidian_list_files_in_dir';
  description = 'Lists all files and directories that exist in a specific Obsidian directory.';
  
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

  async execute(args: { dirpath: string }): Promise<any> {
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
        if (error.message?.includes('404') || error.message?.includes('Not Found')) {
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
    } catch (error) {
      return this.handleError(error);
    }
  }
}