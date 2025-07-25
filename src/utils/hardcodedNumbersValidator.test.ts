/**
 * Test suite to validate that no hardcoded numbers remain in utility files.
 * This enforces the DRY principle by ensuring all magic numbers are extracted to constants.
 */

import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Hardcoded Numbers Validation', () => {
  const utilsDir = join(__dirname);
  const allowedNumbers = new Set([
    // Array indices and loop counters
    '0', '1', '2', '3', '4', '5', 
    // Common technical values
    '-1', // Common error/not found indicator
    '100', // Common percentage base
    // Regex repetition counts  
    '6', // For heading levels 1-6
    // HTTP status codes (these should eventually be constants too)
    '400', '401', '403', '404', '500', '502', '503', '504',
    // Common string operations
    '8', // Common for string/hash length
    '10', // Common for timeouts in tests
    '16', // Common for hex operations
    '42', // Test values
    '84', // Test calculation results
    '123', // Test values
    '1000', // Already in constants as PATH_VALIDATION.MAX_LENGTH
  ]);

  // Numbers that appear in specific contexts that are acceptable
  const allowedInContext = [
    // Test files can contain hardcoded test values
    /\.test\.ts$/, 
    // Type definitions can contain numeric literals for constraints
    /\.type\.ts$/,
  ];

  // Patterns that indicate acceptable usage
  const acceptablePatterns = [
    // Array access: [0], [1], etc.
    /\[\d+\]/,
    // String operations: substring(0), slice(-1), etc.
    /\.(substring|slice|charAt)\(\d+[,)]/, 
    // Loop counters: i < length, i += 1, etc.
    /[<>=]\s*\d+/,
    // Object property access in tests
    /\{\s*id:\s*\d+/,
    // Test assertions
    /expect\([^)]*\)\.toBe\(\d+\)/,
    // Hash patterns for validation
    /\[a-f0-9\]\+/,
    // Timeout values in tests
    /setTimeout\([^,]*,\s*\d+\)/,
    // Console log formatting
    /toFixed\(\d+\)/,
    // Date operations
    /getMonth\(\)\s*===\s*\w+\s*-\s*\d+/,
    // Regex character classes
    /\\x[0-9a-f]{2}/i,
    // String methods with indices
    /\.endsWith\([^)]*\)\s*\?\s*[^:]*\.slice\(\d+,\s*-?\d+\)/,
    // Date/time format strings (ISO 8601 format)
    /'T\d{2}:\d{2}:\d{2}'/,
    // IP address patterns (like 127.0.0.1 in template strings)
    /\$\{[^}]*\}/,
  ];

  test('should not contain hardcoded numeric literals in utility files', () => {
    const utilFiles = readdirSync(utilsDir)
      .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .filter(file => !file.endsWith('.type.ts'));

    const violations: Array<{file: string, line: number, content: string, number: string}> = [];

    for (const file of utilFiles) {
      const filePath = join(utilsDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip comments and import statements
        if (line.trim().startsWith('//') || 
            line.trim().startsWith('*') || 
            line.trim().startsWith('/*') ||
            line.trim().startsWith('import') ||
            line.trim().startsWith('export')) {
          return;
        }

        // Find all numeric literals
        const numberMatches = line.match(/\b\d+\b/g);
        if (!numberMatches) return;

        for (const numberStr of numberMatches) {
          // Skip if it's an allowed number
          if (allowedNumbers.has(numberStr)) continue;

          // Skip if it matches acceptable patterns
          if (acceptablePatterns.some(pattern => pattern.test(line))) continue;

          // Skip if the file is allowed to have this context
          if (allowedInContext.some(pattern => pattern.test(file))) continue;

          violations.push({
            file,
            line: index + 1,
            content: line.trim(),
            number: numberStr
          });
        }
      });
    }

    if (violations.length > 0) {
      const errorMessage = violations
        .map(v => `${v.file}:${v.line} - Found hardcoded number "${v.number}" in: ${v.content}`)
        .join('\n');
      
      expect.fail(`Found ${violations.length} hardcoded numeric literals that should be extracted to constants:\n${errorMessage}`);
    }
  });

  test('should verify that constants file contains expected numeric values', () => {
    const constantsPath = join(__dirname, '../constants.ts');
    const constantsContent = readFileSync(constantsPath, 'utf-8');

    // Check that important constants are defined
    const expectedConstants = [
      'PORT: 27124',
      'TIMEOUT_MS: 6000',
      'BATCH_SIZE: 5',
      'CONTEXT_LENGTH: 100',
      'MAX_LENGTH: 1000',
      'DEFAULT_TTL_MS: 5000',
    ];

    for (const expectedConstant of expectedConstants) {
      expect(constantsContent).toContain(expectedConstant);
    }
  });

  test('should ensure utility files import from constants when using configured values', () => {
    const utilFiles = readdirSync(utilsDir)
      .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .filter(file => !file.endsWith('.type.ts'));

    const filesUsingConstants: Array<{file: string, hasImport: boolean, usesConstants: boolean}> = [];

    for (const file of utilFiles) {
      const filePath = join(utilsDir, file);
      const content = readFileSync(filePath, 'utf-8');
      
      // Check if file imports from constants
      const hasConstantsImport = content.includes('from \'../constants') || 
                                 content.includes('from "../constants');
      
      // Check if file uses constant-like values that should come from constants
      const usesConfigurableValues = content.includes('27124') || 
                                     content.includes('6000') ||
                                     content.includes('127.0.0.1') ||
                                     content.includes('localhost');

      if (usesConfigurableValues) {
        filesUsingConstants.push({
          file,
          hasImport: hasConstantsImport,
          usesConstants: usesConfigurableValues
        });
      }
    }

    const violatingFiles = filesUsingConstants.filter(f => f.usesConstants && !f.hasImport);

    if (violatingFiles.length > 0) {
      const errorMessage = violatingFiles
        .map(f => f.file)
        .join(', ');
      
      expect.fail(`Files using configurable values should import from constants: ${errorMessage}`);
    }
  });
});