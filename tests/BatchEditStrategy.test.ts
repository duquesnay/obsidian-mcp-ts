import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchEditStrategy } from '../src/tools/strategies/BatchEditStrategy';
import { 
  BatchOperation, 
  EditContext, 
  AppendOperation,
  ReplaceOperation,
  HeadingInsertOperation
} from '../src/tools/strategies/IEditStrategy';
import { IObsidianClient } from '../src/obsidian/interfaces/IObsidianClient';
import { IEditStrategy } from '../src/tools/strategies/IEditStrategy';

describe('BatchEditStrategy', () => {
  let strategy: BatchEditStrategy;
  let mockClient: IObsidianClient;
  let mockAppendStrategy: IEditStrategy;
  let mockReplaceStrategy: IEditStrategy;
  let mockHeadingStrategy: IEditStrategy;
  let context: EditContext;

  beforeEach(() => {
    mockClient = {
      getFileContents: vi.fn(),
      updateFile: vi.fn(),
      appendContent: vi.fn(),
      patchContent: vi.fn(),
    } as any;

    mockAppendStrategy = {
      canHandle: vi.fn(),
      execute: vi.fn()
    };

    mockReplaceStrategy = {
      canHandle: vi.fn(),
      execute: vi.fn()
    };

    mockHeadingStrategy = {
      canHandle: vi.fn(),
      execute: vi.fn()
    };

    strategy = new BatchEditStrategy(
      mockAppendStrategy,
      mockReplaceStrategy,
      mockHeadingStrategy
    );

    context = {
      filepath: 'test.md',
      client: mockClient
    };
  });

  describe('canHandle', () => {
    it('should handle batch operations', async () => {
      const operation: BatchOperation = {
        type: 'batch',
        operations: []
      };

      const result = await strategy.canHandle(operation);
      expect(result).toBe(true);
    });

    it('should not handle non-batch operations', async () => {
      const operation: AppendOperation = {
        type: 'append',
        content: 'test'
      };

      const result = await strategy.canHandle(operation);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute multiple operations in sequence', async () => {
      const operations: BatchOperation = {
        type: 'batch',
        operations: [
          { type: 'append', content: 'First append' },
          { type: 'replace', find: 'old', replace: 'new' },
          { type: 'heading-insert', position: 'after', heading: 'Test', content: 'Content' }
        ]
      };

      // Mock canHandle to return true only for the correct operation type
      vi.mocked(mockAppendStrategy.canHandle).mockImplementation(async (op) => op.type === 'append');
      vi.mocked(mockAppendStrategy.execute).mockResolvedValue({
        success: true,
        message: 'Appended successfully'
      });

      vi.mocked(mockReplaceStrategy.canHandle).mockImplementation(async (op) => op.type === 'replace');
      vi.mocked(mockReplaceStrategy.execute).mockResolvedValue({
        success: true,
        message: 'Replaced successfully'
      });

      vi.mocked(mockHeadingStrategy.canHandle).mockImplementation(async (op) => op.type === 'heading-insert');
      vi.mocked(mockHeadingStrategy.execute).mockResolvedValue({
        success: true,
        message: 'Inserted successfully'
      });

      const result = await strategy.execute(operations, context);

      expect(result.success).toBe(true);
      expect(result.batch_results).toBeDefined();
      expect(result.batch_results?.total_operations).toBe(3);
      expect(result.batch_results?.successful).toBe(3);
      expect(result.batch_results?.failed).toBe(0);
      expect(result.batch_results?.results).toHaveLength(3);

      expect(mockAppendStrategy.execute).toHaveBeenCalledWith(
        operations.operations[0],
        context
      );
      expect(mockReplaceStrategy.execute).toHaveBeenCalledWith(
        operations.operations[1],
        context
      );
      expect(mockHeadingStrategy.execute).toHaveBeenCalledWith(
        operations.operations[2],
        context
      );
    });

    it('should handle failures in individual operations', async () => {
      const operations: BatchOperation = {
        type: 'batch',
        operations: [
          { type: 'append', content: 'Will succeed' },
          { type: 'replace', find: 'old', replace: 'new' }
        ]
      };

      vi.mocked(mockAppendStrategy.canHandle).mockImplementation(async (op) => op.type === 'append');
      vi.mocked(mockAppendStrategy.execute).mockResolvedValue({
        success: true,
        message: 'Appended successfully'
      });

      vi.mocked(mockReplaceStrategy.canHandle).mockImplementation(async (op) => op.type === 'replace');
      vi.mocked(mockReplaceStrategy.execute).mockResolvedValue({
        success: false,
        error: 'Text not found'
      });

      const result = await strategy.execute(operations, context);

      expect(result.success).toBe(true); // Batch completes even with failures
      expect(result.batch_results?.total_operations).toBe(2);
      expect(result.batch_results?.successful).toBe(1);
      expect(result.batch_results?.failed).toBe(1);
      expect(result.batch_results?.errors).toHaveLength(1);
      expect(result.batch_results?.errors?.[0]).toMatchObject({
        operation: 1,
        error: 'Text not found'
      });
    });

    it('should handle unknown operation types', async () => {
      const operations: BatchOperation = {
        type: 'batch',
        operations: [
          { type: 'unknown-type' as any, data: 'test' }
        ]
      };

      vi.mocked(mockAppendStrategy.canHandle).mockResolvedValue(false);
      vi.mocked(mockReplaceStrategy.canHandle).mockResolvedValue(false);
      vi.mocked(mockHeadingStrategy.canHandle).mockResolvedValue(false);

      const result = await strategy.execute(operations, context);

      expect(result.success).toBe(true);
      expect(result.batch_results?.failed).toBe(1);
      expect(result.batch_results?.errors?.[0].error).toContain('No strategy available');
    });

    it('should handle empty batch', async () => {
      const operations: BatchOperation = {
        type: 'batch',
        operations: []
      };

      const result = await strategy.execute(operations, context);

      expect(result.success).toBe(true);
      expect(result.batch_results?.total_operations).toBe(0);
      expect(result.batch_results?.successful).toBe(0);
      expect(result.batch_results?.failed).toBe(0);
    });

    it('should throw error for non-batch operations', async () => {
      const operation: AppendOperation = {
        type: 'append',
        content: 'test'
      };

      await expect(strategy.execute(operation, context)).rejects.toThrow(
        'BatchEditStrategy can only handle batch operations'
      );
    });
  });
});