import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Startup message format', () => {
  it('should not contain box-drawing characters in index.ts', () => {
    const indexContent = readFileSync(join(process.cwd(), 'src/index.ts'), 'utf-8');
    
    // Check for problematic box-drawing characters
    const boxDrawingChars = ['╔', '═', '║', '╚', '╝', '╗'];
    
    for (const char of boxDrawingChars) {
      expect(indexContent).not.toContain(char);
    }
  });

  it('should not contain any extended ASCII or Unicode box characters', () => {
    const indexContent = readFileSync(join(process.cwd(), 'src/index.ts'), 'utf-8');
    
    // Check for any box-drawing characters in Unicode range
    const boxDrawingPattern = /[\u2500-\u257F]/;
    expect(boxDrawingPattern.test(indexContent)).toBe(false);
  });
});