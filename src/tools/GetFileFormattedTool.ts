import { GetFileFormattedArgs } from './types/GetFileFormattedArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';

export class GetFileFormattedTool extends BaseTool<GetFileFormattedArgs> {
  name = 'obsidian_get_file_formatted';
  description = 'Convert vault note to specific output format. Format required: plain (strip markdown) / html (render) / content (raw markdown).';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['get', 'read', 'file', 'format', 'html', 'plain', 'content'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to file to retrieve (relative to vault root)'
      },
      format: {
        type: 'string',
        enum: ['plain', 'html', 'content'],
        description: 'Format to retrieve: plain (markdown stripped), html (rendered), content (default markdown)'
      }
    },
    required: ['filepath', 'format']
  };

  async executeTyped(args: GetFileFormattedArgs): Promise<ToolResponse> {
    try {
      PathValidationUtil.validate(args.filepath, 'filepath', { type: PathValidationType.FILE });
      
      const client = this.getClient();
      const content = await client.getFileContents(args.filepath, args.format);
      
      return this.formatResponse({
        success: true,
        filepath: args.filepath,
        format: args.format,
        content
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}