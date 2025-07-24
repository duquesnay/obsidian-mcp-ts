import { IEditStrategy, EditOperation, EditContext, EditResult, BatchOperation } from './IEditStrategy.js';

export class BatchEditStrategy implements IEditStrategy {
  constructor(
    private appendStrategy: IEditStrategy,
    private replaceStrategy: IEditStrategy,
    private headingStrategy: IEditStrategy
  ) {}

  async canHandle(operation: EditOperation): Promise<boolean> {
    return operation.type === 'batch';
  }

  async execute(operation: EditOperation, context: EditContext): Promise<EditResult> {
    if (operation.type !== 'batch') {
      throw new Error('BatchEditStrategy can only handle batch operations');
    }

    const batchOp = operation as BatchOperation;
    const results: Array<{ operation: number; result: EditResult }> = [];
    const errors: Array<{ operation: number; error: string; attempted: EditOperation }> = [];

    // Process each operation in sequence
    for (let i = 0; i < batchOp.operations.length; i++) {
      const op = batchOp.operations[i];
      
      try {
        // Find the appropriate strategy for this operation
        let strategy: IEditStrategy | null = null;
        
        if (await this.appendStrategy.canHandle(op)) {
          strategy = this.appendStrategy;
        } else if (await this.replaceStrategy.canHandle(op)) {
          strategy = this.replaceStrategy;
        } else if (await this.headingStrategy.canHandle(op)) {
          strategy = this.headingStrategy;
        }

        if (!strategy) {
          errors.push({
            operation: i,
            error: `No strategy available for operation type: ${op.type}`,
            attempted: op
          });
          continue;
        }

        // Execute the operation
        const result = await strategy.execute(op, context);
        
        if (result.success) {
          results.push({ operation: i, result });
        } else {
          errors.push({
            operation: i,
            error: result.error || 'Operation failed',
            attempted: op
          });
        }
      } catch (error) {
        errors.push({
          operation: i,
          error: error instanceof Error ? error.message : String(error),
          attempted: op
        });
      }
    }

    const successCount = results.length;
    const failureCount = errors.length;
    const totalOperations = batchOp.operations.length;

    return {
      success: true, // Batch always completes, even if some operations fail
      message: `Batch operation completed: ${successCount}/${totalOperations} successful`,
      batch_results: {
        total_operations: totalOperations,
        successful: successCount,
        failed: failureCount,
        results: results,
        errors: errors.length > 0 ? errors : undefined
      }
    };
  }
}