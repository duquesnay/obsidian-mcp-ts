import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchEditStrategy } from '../../src/tools/strategies/BatchEditStrategy.js';
import { IEditStrategy, EditOperation, EditContext, BatchOperation } from '../../src/tools/strategies/IEditStrategy.js';
import { OptimizedBatchProcessor } from '../../src/utils/OptimizedBatchProcessor.js';

describe('BatchEditStrategy - OptimizedBatchProcessor Integration', () => {
  let batchStrategy: BatchEditStrategy;
  let mockAppendStrategy: IEditStrategy;
  let mockReplaceStrategy: IEditStrategy;
  let mockHeadingStrategy: IEditStrategy;
  let mockContext: EditContext;

  beforeEach(() => {
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

    batchStrategy = new BatchEditStrategy(
      mockAppendStrategy,
      mockReplaceStrategy,
      mockHeadingStrategy
    );

    mockContext = {
      filepath: 'test.md',
      client: {} as any
    };
  });

  it('should process operations sequentially to avoid race conditions on same file', async () => {
    // IMPORTANT: BatchEditStrategy operations target the same file (same EditContext.filepath)
    // Therefore, they should be processed SEQUENTIALLY to avoid race conditions
    // This test verifies that the current sequential behavior is maintained
    
    vi.mocked(mockAppendStrategy.canHandle).mockImplementation(async (op) => op.type === 'append');
    vi.mocked(mockReplaceStrategy.canHandle).mockImplementation(async (op) => op.type === 'replace');
    vi.mocked(mockHeadingStrategy.canHandle).mockImplementation(async (op) => op.type === 'heading_insert');

    // Track execution times to verify sequential processing
    const executionOrder: number[] = [];
    let executionCounter = 0;
    
    vi.mocked(mockAppendStrategy.execute).mockImplementation(async (op, context) => {
      const startOrder = ++executionCounter;
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing time
      const endOrder = ++executionCounter;
      executionOrder.push(startOrder, endOrder);
      return { success: true, message: 'Operation completed' };
    });

    const batchOperation: BatchOperation = {
      type: 'batch',
      operations: [
        { type: 'append', content: 'Content 1' },
        { type: 'append', content: 'Content 2' },
        { type: 'append', content: 'Content 3' }
      ]
    };

    const result = await batchStrategy.execute(batchOperation, mockContext);

    expect(result.success).toBe(true);
    expect(result.batch_results?.successful).toBe(3);
    
    // Verify operations executed sequentially (each operation completes before next starts)
    // Pattern should be: start1, end1, start2, end2, start3, end3
    expect(executionOrder).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should handle mixed operation types with proper strategy routing', async () => {
    // This test will initially pass with current implementation
    // but should show improved performance once OptimizedBatchProcessor is used
    
    vi.mocked(mockAppendStrategy.canHandle).mockImplementation(async (op) => op.type === 'append');
    vi.mocked(mockReplaceStrategy.canHandle).mockImplementation(async (op) => op.type === 'replace');
    vi.mocked(mockHeadingStrategy.canHandle).mockImplementation(async (op) => op.type === 'heading_insert');

    const mockResult = { success: true, message: 'Operation completed' };
    vi.mocked(mockAppendStrategy.execute).mockResolvedValue(mockResult);
    vi.mocked(mockReplaceStrategy.execute).mockResolvedValue(mockResult);
    vi.mocked(mockHeadingStrategy.execute).mockResolvedValue(mockResult);

    const batchOperation: BatchOperation = {
      type: 'batch',
      operations: [
        { type: 'append', content: 'Append content' },
        { type: 'replace', oldText: 'old', newText: 'new' },
        { type: 'heading_insert', heading: 'Test', content: 'Content' }
      ]
    };

    const result = await batchStrategy.execute(batchOperation, mockContext);

    expect(result.success).toBe(true);
    expect(result.batch_results?.total_operations).toBe(3);
    expect(result.batch_results?.successful).toBe(3);
    expect(result.batch_results?.failed).toBe(0);
  });

  it('should handle errors gracefully when using OptimizedBatchProcessor', async () => {
    vi.mocked(mockAppendStrategy.canHandle).mockImplementation(async (op) => op.type === 'append');
    vi.mocked(mockAppendStrategy.execute).mockImplementation(async (op) => {
      if (op.content === 'fail') {
        throw new Error('Simulated failure');
      }
      return { success: true, message: 'Success' };
    });

    const batchOperation: BatchOperation = {
      type: 'batch',
      operations: [
        { type: 'append', content: 'success' },
        { type: 'append', content: 'fail' },
        { type: 'append', content: 'success' }
      ]
    };

    const result = await batchStrategy.execute(batchOperation, mockContext);

    expect(result.success).toBe(true); // Batch operation itself succeeds
    expect(result.batch_results?.total_operations).toBe(3);
    expect(result.batch_results?.successful).toBe(2);
    expect(result.batch_results?.failed).toBe(1);
    expect(result.batch_results?.errors).toHaveLength(1);
  });

  it('should maintain file safety by keeping sequential processing', async () => {
    // This test documents why BatchEditStrategy should NOT use concurrent processing:
    // All operations target the same file, so concurrent edits would create race conditions
    
    vi.mocked(mockAppendStrategy.canHandle).mockResolvedValue(true);
    vi.mocked(mockAppendStrategy.execute).mockResolvedValue({ success: true, message: 'Success' });

    const batchOperation: BatchOperation = {
      type: 'batch',
      operations: Array.from({ length: 5 }, (_, i) => ({ 
        type: 'append', 
        content: `Content ${i}` 
      }))
    };

    // Verify OptimizedBatchProcessor is NOT used (sequential processing is safer)
    const processSpy = vi.spyOn(OptimizedBatchProcessor.prototype, 'process');
    
    const result = await batchStrategy.execute(batchOperation, mockContext);

    expect(result.success).toBe(true);
    expect(result.batch_results?.successful).toBe(5);
    
    // OptimizedBatchProcessor should NOT be used for same-file operations
    expect(processSpy).not.toHaveBeenCalled();
  });
});