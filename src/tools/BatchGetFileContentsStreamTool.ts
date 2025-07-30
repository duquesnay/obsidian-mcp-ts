import { BatchGetFileContentsArgs } from './types/BatchGetFileContentsArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { validateRequiredArgs } from '../utils/validation.js';
import { BatchOperationOptions } from '../obsidian/interfaces/IFileOperationsClient.js';

interface StreamBatchGetFileContentsArgs extends BatchGetFileContentsArgs {
  streamMode?: boolean;
  maxFilesPerResponse?: number;
}

export class BatchGetFileContentsStreamTool extends BaseTool<StreamBatchGetFileContentsArgs> {
  name = 'obsidian_batch_get_file_contents_stream';
  description = 'Read multiple Obsidian vault notes with streaming support for memory efficiency (vault-only). Ideal for processing hundreds or thousands of files.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['batch', 'read', 'multiple', 'files', 'content', 'bulk', 'stream', 'memory-efficient'],
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
      streamMode: {
        type: 'boolean',
        description: 'Use streaming mode for memory-efficient processing of large file sets (default: true for > 100 files)',
        default: undefined
      },
      maxFilesPerResponse: {
        type: 'number',
        description: 'Maximum number of files to include in each streamed response chunk (default: 50)',
        default: 50
      }
    },
    required: ['filepaths']
  };

  async executeTyped(args: StreamBatchGetFileContentsArgs): Promise<ToolResponse> {
    try {
      // Validate required arguments
      validateRequiredArgs(args, ['filepaths'], { filepaths: { notEmpty: true } });
      
      // Validate all filepaths
      PathValidationUtil.validateBatch(args.filepaths, { type: PathValidationType.FILE });
      
      const client = this.getClient();
      
      // Determine whether to use streaming mode
      const useStreaming = args.streamMode ?? (args.filepaths.length > 100);
      const maxFilesPerResponse = args.maxFilesPerResponse || 50;
      
      if (!useStreaming) {
        // Use regular batch processing for smaller file sets
        const progressInfo: { completed: number; total: number } = {
          completed: 0,
          total: args.filepaths.length
        };
        
        const batchOptions: BatchOperationOptions = {
          onProgress: (completed: number, total: number) => {
            progressInfo.completed = completed;
            progressInfo.total = total;
          }
        };
        
        const content = await client.getBatchFileContents(args.filepaths);
        
        const responseData = {
          content,
          progress: {
            completed: progressInfo.completed,
            total: progressInfo.total,
            percentage: progressInfo.total > 0 ? Math.round((progressInfo.completed / progressInfo.total) * 100) : 0
          },
          mode: 'batch'
        };
        
        return this.formatResponse(responseData);
      }
      
      // Use streaming mode for large file sets
      const results: string[] = [];
      const errors: Array<{ filepath: string; error: string }> = [];
      let processedCount = 0;
      let currentChunk: string[] = [];
      
      const progressInfo = {
        completed: 0,
        total: args.filepaths.length
      };
      
      const batchOptions: BatchOperationOptions = {
        onProgress: (completed: number, total: number) => {
          progressInfo.completed = completed;
          progressInfo.total = total;
        }
      };
      
      // Process files in streaming mode using the file operations client directly
      const fileOpsClient = (client as any).getFileOperationsClient?.() || client;
      
      // Check if streaming is available
      if ('streamBatchFileContents' in fileOpsClient) {
        for await (const result of fileOpsClient.streamBatchFileContents(args.filepaths, batchOptions)) {
        processedCount++;
        
        if (result.error) {
          errors.push({ filepath: result.filepath, error: result.error });
          currentChunk.push(`# ${result.filepath}\n\nError reading file: ${result.error}\n\n---\n\n`);
        } else if (result.content) {
          currentChunk.push(`# ${result.filepath}\n\n${result.content}\n\n---\n\n`);
        }
        
        // If we've accumulated enough files, add to results
        if (currentChunk.length >= maxFilesPerResponse || processedCount === args.filepaths.length) {
          results.push(currentChunk.join(''));
          currentChunk = [];
        }
      }
      } else {
        // Fallback: process files individually if streaming isn't available
        const { OptimizedBatchProcessor } = await import('../utils/OptimizedBatchProcessor.js');
        const processor = new OptimizedBatchProcessor({
          maxConcurrency: 10,
          retryAttempts: 2,
          onProgress: batchOptions.onProgress
        });
        
        for await (const result of processor.processStream(args.filepaths, async (filepath) => {
          const content = await client.getFileContents(filepath);
          return { filepath, content: content as string };
        })) {
          processedCount++;
          
          if (result.error) {
            errors.push({ filepath: result.item, error: result.error.message });
            currentChunk.push(`# ${result.item}\n\nError reading file: ${result.error.message}\n\n---\n\n`);
          } else if (result.result) {
            currentChunk.push(`# ${result.result.filepath}\n\n${result.result.content}\n\n---\n\n`);
          }
          
          if (currentChunk.length >= maxFilesPerResponse || processedCount === args.filepaths.length) {
            results.push(currentChunk.join(''));
            currentChunk = [];
          }
        }
      }
      
      // Handle any remaining content
      if (currentChunk.length > 0) {
        results.push(currentChunk.join(''));
      }
      
      // Prepare the response
      const response = {
        content: results.join(''),
        summary: {
          totalFiles: args.filepaths.length,
          successfulReads: args.filepaths.length - errors.length,
          failedReads: errors.length,
          errors: errors.length > 0 ? errors : undefined
        },
        progress: {
          completed: progressInfo.completed,
          total: progressInfo.total,
          percentage: progressInfo.total > 0 ? Math.round((progressInfo.completed / progressInfo.total) * 100) : 0
        },
        mode: 'stream',
        chunksProcessed: Math.ceil(processedCount / maxFilesPerResponse)
      };
      
      return this.formatResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}