import { describe, it, expect } from 'vitest';
import type { 
  IEditStrategy, 
  EditOperation, 
  EditContext, 
  EditResult,
  AppendOperation,
  ReplaceOperation,
  HeadingInsertOperation,
  NewSectionOperation,
  BatchOperation
} from './IEditStrategy.js';
import { BaseEditStrategy } from './BaseEditStrategy.js';

/**
 * This test file validates the design of the EditStrategy interface and base class
 * to ensure they support all operations needed by UnifiedEditTool
 */
describe('EditStrategy Design Validation', () => {
  describe('EditOperation types', () => {
    it('should support all operations from UnifiedEditTool', () => {
      // Append operation
      const appendOp: AppendOperation = {
        type: 'append',
        content: 'New content to append'
      };
      expect(appendOp.type).toBe('append');

      // Replace operation
      const replaceOp: ReplaceOperation = {
        type: 'replace',
        find: 'old text',
        replace: 'new text'
      };
      expect(replaceOp.type).toBe('replace');

      // Heading insert operation (after)
      const headingAfterOp: HeadingInsertOperation = {
        type: 'heading-insert',
        position: 'after',
        heading: 'Section Title',
        content: 'Content after heading'
      };
      expect(headingAfterOp.position).toBe('after');

      // Heading insert operation (before)
      const headingBeforeOp: HeadingInsertOperation = {
        type: 'heading-insert',
        position: 'before',
        heading: 'Section Title',
        content: 'Content before heading'
      };
      expect(headingBeforeOp.position).toBe('before');

      // New section operation
      const newSectionOp: NewSectionOperation = {
        type: 'new-section',
        title: 'New Section',
        at: 'end',
        content: 'Section content'
      };
      expect(newSectionOp.at).toBe('end');

      // New section at specific heading
      const newSectionAtHeadingOp: NewSectionOperation = {
        type: 'new-section',
        title: 'New Section',
        at: 'Existing Heading',
        content: 'Section content'
      };
      expect(newSectionAtHeadingOp.at).toBe('Existing Heading');

      // Batch operation
      const batchOp: BatchOperation = {
        type: 'batch',
        operations: [
          { type: 'append', content: 'First operation' },
          { type: 'replace', find: 'old', replace: 'new' },
          { 
            type: 'heading-insert', 
            position: 'after', 
            heading: 'Title', 
            content: 'Content' 
          }
        ]
      };
      expect(batchOp.operations).toHaveLength(3);
    });
  });

  describe('EditResult structure', () => {
    it('should support all result types from UnifiedEditTool', () => {
      // Success result
      const successResult: EditResult = {
        success: true,
        message: 'Operation completed successfully',
        operation: 'append',
        filepath: 'test.md'
      };
      expect(successResult.success).toBe(true);

      // Error result with suggestion
      const errorResult: EditResult = {
        success: false,
        error: 'Operation failed',
        suggestion: 'Try this instead'
      };
      expect(errorResult.success).toBe(false);

      // Error with working alternative
      const errorWithAlternative: EditResult = {
        success: false,
        error: 'Heading not found',
        working_alternative: {
          description: 'Append to end instead',
          example: { file: 'test.md', append: 'content' }
        }
      };
      expect(errorWithAlternative.working_alternative).toBeDefined();

      // Batch operation result
      const batchResult: EditResult = {
        success: true,
        message: 'Batch operation completed: 2/3 successful',
        batch_results: {
          total_operations: 3,
          successful: 2,
          failed: 1,
          results: [],
          errors: [{ operation: 2, error: 'Failed', attempted: {} }]
        }
      };
      expect(batchResult.batch_results?.total_operations).toBe(3);
    });
  });

  describe('IEditStrategy interface', () => {
    class MockStrategy extends BaseEditStrategy {
      async canHandle(operation: EditOperation): Promise<boolean> {
        return operation.type === 'append';
      }

      async execute(operation: EditOperation, context: EditContext): Promise<EditResult> {
        if (operation.type !== 'append') {
          return this.formatError('Unsupported operation');
        }
        
        const appendOp = operation as AppendOperation;
        await this.appendToFile(context.filepath, appendOp.content, context.client);
        
        return this.formatResult({
          success: true,
          message: 'Content appended',
          operation: 'append',
          filepath: context.filepath
        });
      }
    }

    it('should implement required methods', () => {
      const strategy: IEditStrategy = new MockStrategy();
      
      expect(typeof strategy.canHandle).toBe('function');
      expect(typeof strategy.execute).toBe('function');
    });

    it('should have proper method signatures', async () => {
      const strategy = new MockStrategy();
      const operation: EditOperation = { type: 'append', content: 'test' };
      const context: EditContext = {
        filepath: 'test.md',
        client: {} as any
      };

      // canHandle returns Promise<boolean>
      const canHandle = await strategy.canHandle(operation);
      expect(typeof canHandle).toBe('boolean');

      // execute returns Promise<EditResult>
      const mockClient = {
        appendContent: async () => {}
      };
      context.client = mockClient as any;
      
      const result = await strategy.execute(operation, context);
      expect(result).toHaveProperty('success');
    });
  });

  describe('BaseEditStrategy helper methods', () => {
    class TestStrategy extends BaseEditStrategy {
      async canHandle(operation: EditOperation): Promise<boolean> {
        return true;
      }

      async execute(operation: EditOperation, context: EditContext): Promise<EditResult> {
        return this.formatResult({ success: true });
      }

      // Expose protected methods for testing
      testFormatResult(result: any) {
        return this.formatResult(result);
      }

      testFormatError(error: string, suggestion?: string) {
        return this.formatError(error, suggestion);
      }

      testFormatErrorWithAlternative(
        error: string, 
        description: string, 
        example: Record<string, any>
      ) {
        return this.formatErrorWithAlternative(error, description, example);
      }
    }

    it('should provide helper methods for common operations', () => {
      const strategy = new TestStrategy();

      // Test formatResult
      const successResult = strategy.testFormatResult({
        success: true,
        message: 'Done',
        operation: 'test'
      });
      expect(successResult.success).toBe(true);
      expect(successResult.message).toBe('Done');

      // Test formatError
      const errorResult = strategy.testFormatError('Failed', 'Try again');
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Failed');
      expect(errorResult.suggestion).toBe('Try again');

      // Test formatErrorWithAlternative
      const errorWithAlt = strategy.testFormatErrorWithAlternative(
        'Not found',
        'Use append instead',
        { file: 'test.md', append: 'content' }
      );
      expect(errorWithAlt.success).toBe(false);
      expect(errorWithAlt.working_alternative?.description).toBe('Use append instead');
    });
  });
});