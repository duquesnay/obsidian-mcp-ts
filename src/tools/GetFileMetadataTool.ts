import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class GetFileMetadataTool extends BaseTool {
  name = 'obsidian_get_file_metadata';
  description = 'Get file metadata (size, dates, permissions) without retrieving content - efficient for large files.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to file to get metadata from (relative to vault root)'
      }
    },
    required: ['filepath']
  };

  async executeTyped(args: { filepath: string }): Promise<any> {
    try {
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      const metadata = await client.getFileContents(args.filepath, 'metadata');
      
      return this.formatResponse({
        success: true,
        filepath: args.filepath,
        metadata
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}