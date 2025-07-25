import { describe, it, expect } from 'vitest';
import { REGEX_PATTERNS } from '../../src/constants.js';

describe('REGEX_PATTERNS', () => {
  describe('MARKDOWN_HEADING', () => {
    it('should match valid markdown headings', () => {
      // Test various valid markdown heading formats
      const validHeadings = [
        '# Heading 1',
        '## Heading 2',
        '### Heading 3',
        '#### Heading 4',
        '##### Heading 5',
        '###### Heading 6',
        '# Simple',
        '## With multiple words',
        '### With-dashes-and_underscores',
        '#### With numbers 123',
        '##### With special chars: (parentheses) [brackets]',
        '###### With emoji 🚀',
        '# Heading with trailing spaces   ',
        '##   Extra spaces after hashes',
      ];

      validHeadings.forEach(heading => {
        const match = heading.match(REGEX_PATTERNS.MARKDOWN_HEADING);
        expect(match).not.toBeNull();
        expect(match![1]).toMatch(/^#{1,6}$/); // Capture group 1: hash symbols
        expect(match![2]).toBeTruthy(); // Capture group 2: heading text
      });
    });

    it('should extract heading level and text correctly', () => {
      const testCases = [
        { input: '# Level 1', expectedLevel: 1, expectedText: 'Level 1' },
        { input: '## Level 2', expectedLevel: 2, expectedText: 'Level 2' },
        { input: '### Level 3', expectedLevel: 3, expectedText: 'Level 3' },
        { input: '#### Level 4', expectedLevel: 4, expectedText: 'Level 4' },
        { input: '##### Level 5', expectedLevel: 5, expectedText: 'Level 5' },
        { input: '###### Level 6', expectedLevel: 6, expectedText: 'Level 6' },
        { input: '##   Extra spaces', expectedLevel: 2, expectedText: 'Extra spaces' },
        { input: '# Trailing spaces   ', expectedLevel: 1, expectedText: 'Trailing spaces   ' },
      ];

      testCases.forEach(({ input, expectedLevel, expectedText }) => {
        const match = input.match(REGEX_PATTERNS.MARKDOWN_HEADING);
        expect(match).not.toBeNull();
        expect(match![1].length).toBe(expectedLevel);
        expect(match![2]).toBe(expectedText);
      });
    });

    it('should not match invalid markdown headings', () => {
      // Test various invalid formats
      const invalidHeadings = [
        '#No space after hash',
        '####### Too many hashes (7)',
        '######## Too many hashes (8)',
        ' # Leading space',
        '  ## Leading spaces',
        'Not a heading',
        '# ', // Just hash and space, no text
        '#', // Just hash, no space or text
        '#\t', // Tab directly after hash (no space)
        '### \n', // Just newline after hash
        'Text before # hash',
        '123 # Not at start',
      ];

      invalidHeadings.forEach(heading => {
        const match = heading.match(REGEX_PATTERNS.MARKDOWN_HEADING);
        expect(match).toBeNull();
      });
    });

    it('should match headings with complex content', () => {
      const complexHeadings = [
        '# Code: `inline code` in heading',
        '## Link: [text](url) in heading',
        '### **Bold** and *italic* text',
        '#### Mix of `code`, **bold**, and [links](url)',
        '##### Heading with # hash inside text',
        '###### Special chars: @#$%^&*()',
      ];

      complexHeadings.forEach(heading => {
        const match = heading.match(REGEX_PATTERNS.MARKDOWN_HEADING);
        expect(match).not.toBeNull();
      });
    });
  });

  describe('MARKDOWN_HEADING_WITH_LEVEL', () => {
    it('should create regex for specific heading level', () => {
      // Test the factory function that creates level-specific regex
      for (let level = 1; level <= 6; level++) {
        const regex = REGEX_PATTERNS.MARKDOWN_HEADING_WITH_LEVEL(level);
        const hashes = '#'.repeat(level);
        
        // Should match correct level
        expect(`${hashes} Heading`).toMatch(regex);
        expect(`${hashes}   Multiple spaces`).toMatch(regex);
        
        // Should not match other levels
        if (level > 1) {
          const fewerHashes = '#'.repeat(level - 1);
          expect(`${fewerHashes} Wrong level`).not.toMatch(regex);
        }
        if (level < 6) {
          const moreHashes = '#'.repeat(level + 1);
          expect(`${moreHashes} Wrong level`).not.toMatch(regex);
        }
      }
    });

    it('should throw error for invalid heading levels', () => {
      expect(() => REGEX_PATTERNS.MARKDOWN_HEADING_WITH_LEVEL(0)).toThrow();
      expect(() => REGEX_PATTERNS.MARKDOWN_HEADING_WITH_LEVEL(7)).toThrow();
      expect(() => REGEX_PATTERNS.MARKDOWN_HEADING_WITH_LEVEL(-1)).toThrow();
    });
  });
});