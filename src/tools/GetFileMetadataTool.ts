import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';

export class GetFileMetadataTool extends BaseTool {
  name = 'obsidian_get_file_metadata';
  description = 'Get Obsidian note metadata without content (vault-only - NOT filesystem metadata). Efficient for large notes.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['get', 'read', 'metadata', 'info', 'stats'],
    version: '1.0.0'
  };
  
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

  async executeTyped(args: { filepath: string }): Promise<ToolResponse> {
    try {
      PathValidationUtil.validate(args.filepath, 'filepath', { type: PathValidationType.FILE });
      
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