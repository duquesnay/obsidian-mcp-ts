import { BatchGetFileContentsArgs } from './types/BatchGetFileContentsArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { validateRequiredArgs, PAGE_PAGINATION_SCHEMA } from '../utils/validation.js';
import { BatchOperationOptions } from '../obsidian/interfaces/IFileOperationsClient.js';

export class BatchGetFileContentsTool extends BaseTool<BatchGetFileContentsArgs> {
  name = 'obsidian_batch_get_file_contents';
  description = 'Read multiple Obsidian vault notes at once (vault-only - NOT filesystem access). Returns concatenated content with optional progress tracking.';
  
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
      ...PAGE_PAGINATION_SCHEMA
    },
    required: ['filepaths']
  };

  async executeTyped(args: BatchGetFileContentsArgs): Promise<ToolResponse> {
    try {
      // Validate required arguments - filepaths must be a non-empty array
      validateRequiredArgs(args, ['filepaths'], { filepaths: { notEmpty: true } });
      
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
      
      // Track progress information
      const progressInfo: { completed: number; total: number } = {
        completed: 0,
        total: filesToProcess.length
      };
      
      // Create batch options with progress callback
      const batchOptions: BatchOperationOptions = {
        onProgress: (completed: number, total: number) => {
          progressInfo.completed = completed;
          progressInfo.total = total;
        }
      };
      
      const content = await client.getBatchFileContents(filesToProcess);
      
      // Create response with progress information
      const responseData = {
        content,
        progress: {
          completed: progressInfo.completed,
          total: progressInfo.total,
          percentage: progressInfo.total > 0 ? Math.round((progressInfo.completed / progressInfo.total) * 100) : 0
        }
      };
      
      return this.formatResponse(responseData);
    } catch (error) {
      return this.handleError(error);
    }
  }
}