import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';

export class GetFileFrontmatterTool extends BaseTool {
  name = 'obsidian_get_file_frontmatter';
  description = 'Get frontmatter from Obsidian notes (vault-only - NOT filesystem files). Returns YAML metadata only.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['get', 'read', 'frontmatter', 'metadata', 'yaml'],
    version: '1.0.0'
  };
  
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

  async executeTyped(args: { filepath: string }): Promise<ToolResponse> {
    try {
      PathValidationUtil.validate(args.filepath, 'filepath', { type: PathValidationType.FILE });
      
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