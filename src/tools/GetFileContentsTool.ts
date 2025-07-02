import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class GetFileContentsTool extends BaseTool {
  name = 'obsidian_get_file_contents';
  description = 'Return the content of a single file in your vault.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to get the content from (relative to vault root).'
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
      const content = await client.getFileContents(args.filepath);
      return this.formatResponse(content);
    } catch (error) {
      return this.handleError(error);
    }
  }
}