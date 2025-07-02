import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class DeleteFileTool extends BaseTool {
  name = 'obsidian_delete_file';
  description = 'Delete a file or directory from your vault.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to the file or directory to delete (relative to vault root).'
      }
    },
    required: ['filepath']
  };

  async execute(args: { filepath: string }): Promise<any> {
    try {
      if (!args.filepath) {
        throw new Error('filepath argument missing in arguments');
      }
      
      // Validate the filepath
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      await client.deleteFile(args.filepath);
      
      return this.formatResponse({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      return this.handleError(error);
    }
  }
}