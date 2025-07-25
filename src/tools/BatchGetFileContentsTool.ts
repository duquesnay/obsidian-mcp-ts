import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';

export class BatchGetFileContentsTool extends BaseTool {
  name = 'obsidian_batch_get_file_contents';
  description = 'Read multiple Obsidian vault notes at once (vault-only - NOT filesystem access). Returns concatenated content.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['batch', 'read', 'multiple', 'files', 'content', 'bulk'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepaths: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of paths to get contents from (relative to vault root).'
      },
      page: {
        type: 'number',
        description: 'Page number (0-based) for pagination. Optional.'
      },
      pageSize: {
        type: 'number',
        description: `Number of files per page. Defaults to ${OBSIDIAN_DEFAULTS.PAGE_SIZE}. Optional.`
      }
    },
    required: ['filepaths']
  };

  async executeTyped(args: { filepaths: string[]; page?: number; pageSize?: number }): Promise<ToolResponse> {
    try {
      if (!args.filepaths || !Array.isArray(args.filepaths)) {
        throw new Error('filepaths argument must be an array');
      }
      
      // Validate all filepaths
      PathValidationUtil.validateBatch(args.filepaths, { type: PathValidationType.FILE });
      
      // Apply pagination if specified
      let filesToProcess = args.filepaths;
      if (args.page !== undefined || args.pageSize !== undefined) {
        const pageSize = args.pageSize || OBSIDIAN_DEFAULTS.PAGE_SIZE;
        const page = args.page || 0;
        const startIdx = page * pageSize;
        const endIdx = startIdx + pageSize;
        
        filesToProcess = args.filepaths.slice(startIdx, endIdx);
        
        // If no files in this page, return empty result
        if (filesToProcess.length === 0) {
          return this.formatResponse('');
        }
      }
      
      const client = this.getClient();
      const content = await client.getBatchFileContents(filesToProcess);
      return this.formatResponse(content);
    } catch (error) {
      return this.handleError(error);
    }
  }
}