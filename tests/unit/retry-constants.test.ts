import { describe, it, expect } from 'vitest';
import { BATCH_PROCESSOR } from '../../src/constants.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Retry Constants Centralization', () => {
  it('should have all retry-related constants defined in constants.ts', () => {
    // Verify that BATCH_PROCESSOR constants exist
    expect(BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS).toBeDefined();
    expect(BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS).toBe(2);
    
    expect(BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS).toBeDefined();
    expect(BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS).toBe(1000);
  });

  it('should not have hardcoded retry values in source files', () => {
    // List of files that might contain retry logic
    const filesToCheck = [
      '../../src/utils/OptimizedBatchProcessor.ts',
    ];

    filesToCheck.forEach(file => {
      const filePath = join(__dirname, file);
      const content = readFileSync(filePath, 'utf-8');
      
      // Split into lines and check each line
      const lines = content.split('\n');
      lines.forEach((line, lineNum) => {
        // Skip comment lines and JSDoc lines
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//') || 
            trimmedLine.startsWith('*') || 
            trimmedLine.includes('* ')) {
          return;
        }

        // Check for hardcoded retry values outside of examples and variable declarations
        // The only valid place for numbers is in the for loop condition
        if (line.includes('for (let attempt = 1; attempt <=')) {
          // This is the retry loop - it should use the options, not hardcoded values
          expect(line).toContain('this.options.retryAttempts');
        }
        
        // Check for any property assignments of retry-related values to numbers
        // Exclude loop initializations (attempt = 1) and default fallbacks (??)
        const propertyAssignmentPattern = /(?:retry|attempts?|tries)[A-Za-z]*\s*:\s*\d+/i;
        if (propertyAssignmentPattern.test(line) && 
            !line.includes('??') && 
            !line.includes('default') &&
            !line.includes('DEFAULT_RETRY')) {
          // This should fail the test - we don't want hardcoded values
          expect(line).not.toMatch(propertyAssignmentPattern);
        }
      });
    });
  });

  it('should use constants from BATCH_PROCESSOR in OptimizedBatchProcessor', () => {
    const filePath = join(__dirname, '../../src/utils/OptimizedBatchProcessor.ts');
    const content = readFileSync(filePath, 'utf-8');
    
    // Check that the file imports BATCH_PROCESSOR
    expect(content).toContain('BATCH_PROCESSOR');
    expect(content).toContain("from '../constants.js'");
    
    // Check that it uses the constants
    expect(content).toContain('BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS');
    expect(content).toContain('BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS');
  });
});