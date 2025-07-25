import { describe, it, expect } from 'vitest';
import { validatePath } from '../../src/utils/pathValidator.js';
import { ObsidianError } from '../../src/types/errors.js';

describe('pathValidator', () => {
  describe('path length validation', () => {
    it('should reject paths longer than 1000 characters', () => {
      const longPath = 'a'.repeat(1001);
      expect(() => validatePath(longPath)).toThrow(ObsidianError);
      expect(() => validatePath(longPath)).toThrow('path too long');
    });

    it('should accept paths exactly 1000 characters long', () => {
      const maxPath = 'a'.repeat(1000);
      expect(() => validatePath(maxPath)).not.toThrow();
    });

    it('should accept paths shorter than 1000 characters', () => {
      const shortPath = 'a'.repeat(999);
      expect(() => validatePath(shortPath)).not.toThrow();
    });

    it('should include field name in error message when provided', () => {
      const longPath = 'a'.repeat(1001);
      expect(() => validatePath(longPath, 'filepath')).toThrow('Invalid filepath: path too long');
    });
  });
});