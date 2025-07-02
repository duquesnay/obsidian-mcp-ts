import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class GetFileContentsTool extends BaseTool {
  name = 'obsidian_get_file_contents';
  description = 'Return the content of a single file in your vault. Supports different formats for token optimization.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to get the content from (relative to vault root).'
      },
      format: {
        type: 'string',
        enum: ['content', 'metadata', 'frontmatter', 'plain', 'html'],
        description: 'Format to retrieve: content (default), metadata (file info only), frontmatter (YAML only), plain (no markdown), html (rendered)'
      }
    },
    required: ['filepath']
  };

  async execute(args: { filepath: string; format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html' }): Promise<any> {
    try {
      if (!args.filepath) {
        throw new Error('filepath argument missing in arguments');
      }
      
      // Validate the filepath
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      const result = await client.getFileContents(args.filepath, args.format);
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}