import { describe, it, expect } from 'vitest';
import { migrateToSimplifiedError } from '../../src/utils/errorMigration.js';

describe('Error Migration', () => {
  it('should migrate RecoveryOptions to simplified error', () => {
    const error = new Error('Something went wrong');
    const recovery = {
      suggestion: 'Try this instead',
      workingAlternative: 'Or use this approach',
      example: { param: 'value' }
    };
    
    const result = migrateToSimplifiedError(error, 'TestTool', recovery);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
    expect(result.tool).toBe('TestTool');
    expect(result.suggestion).toBe('Try this instead. Or use this approach');
    expect(result.example).toEqual({ param: 'value' });
  });

  it('should handle missing workingAlternative', () => {
    const error = new Error('File not found');
    const recovery = {
      suggestion: 'Check the file path',
      example: { filepath: 'notes/example.md' }
    };
    
    const result = migrateToSimplifiedError(error, 'GetFileTool', recovery);
    
    expect(result.suggestion).toBe('Check the file path');
  });

  it('should migrate AlternativeAction array to simplified error', () => {
    const error = new Error('Invalid operation');
    const alternatives = [
      {
        description: 'Use this tool instead',
        tool: 'alternative_tool',
        example: { arg: 'value' }
      },
      {
        description: 'Or try this approach',
        tool: 'another_tool'
      }
    ];
    
    const result = migrateToSimplifiedError(error, 'FailedTool', { alternatives });
    
    expect(result.suggestion).toBe('Alternative options: Use this tool instead (tool: alternative_tool), Or try this approach (tool: another_tool)');
    expect(result.example).toEqual({ arg: 'value' });
  });

  it('should handle empty alternatives array', () => {
    const error = new Error('Generic error');
    const alternatives: any[] = [];
    
    const result = migrateToSimplifiedError(error, 'SomeTool', { alternatives });
    
    expect(result.suggestion).toBeUndefined();
    expect(result.example).toBeUndefined();
  });
});