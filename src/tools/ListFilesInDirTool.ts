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
      const files = await client.listFilesInDir(args.dirpath);
      return this.formatResponse(files);
    } catch (error) {
      return this.handleError(error);
    }
  }
}