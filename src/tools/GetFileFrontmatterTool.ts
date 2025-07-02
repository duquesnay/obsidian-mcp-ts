import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class GetFileFrontmatterTool extends BaseTool {
  name = 'obsidian_get_file_frontmatter';
  description = 'Get only the frontmatter of a file without content - efficient for metadata analysis.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to file to get frontmatter from (relative to vault root)'
      }
    },
    required: ['filepath']
  };

  async execute(args: { filepath: string }): Promise<any> {
    try {
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      const frontmatter = await client.getFileContents(args.filepath, 'frontmatter');
      
      return this.formatResponse({
        success: true,
        filepath: args.filepath,
        frontmatter
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}