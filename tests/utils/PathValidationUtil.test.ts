import { describe, it, expect } from 'vitest';
import { PathValidationUtil, PathValidationError, PathValidationType } from '../../src/utils/PathValidationUtil.js';

describe('PathValidationUtil', () => {
  describe('validate', () => {
    describe('empty path validation', () => {
      it('should throw PathValidationError for empty string', () => {
        expect(() => PathValidationUtil.validate('')).toThrow(PathValidationError);
        expect(() => PathValidationUtil.validate('')).toThrow('Path cannot be empty');
      });

      it('should throw PathValidationError for null/undefined', () => {
        expect(() => PathValidationUtil.validate(null as any)).toThrow(PathValidationError);
        expect(() => PathValidationUtil.validate(undefined as any)).toThrow(PathValidationError);
      });

      it('should throw PathValidationError for whitespace-only strings', () => {
        expect(() => PathValidationUtil.validate('   ')).toThrow(PathValidationError);
        expect(() => PathValidationUtil.validate('\t\n')).toThrow(PathValidationError);
      });

      it('should include field name in error message when provided', () => {
        expect(() => PathValidationUtil.validate('', 'filepath')).toThrow('filepath cannot be empty');
      });
    });

    describe('path traversal security', () => {
      it('should throw for parent directory traversal', () => {
        expect(() => PathValidationUtil.validate('../secrets')).toThrow(PathValidationError);
        expect(() => PathValidationUtil.validate('folder/../../../etc')).toThrow('contains parent directory traversal');
      });

      it('should throw for absolute paths', () => {
        expect(() => PathValidationUtil.validate('/etc/passwd')).toThrow('cannot be an absolute path');
        expect(() => PathValidationUtil.validate('\\Windows\\System32')).toThrow('cannot be an absolute path');
      });

      it('should throw for Windows absolute paths', () => {
        expect(() => PathValidationUtil.validate('C:\\Users\\file.txt')).toThrow('cannot be an absolute path');
        expect(() => PathValidationUtil.validate('D:\\data')).toThrow('cannot be an absolute path');
      });

      it('should throw for home directory expansion', () => {
        expect(() => PathValidationUtil.validate('~/Documents')).toThrow('cannot start with home directory');
      });
    });

    describe('dangerous characters', () => {
      it('should throw for null bytes', () => {
        expect(() => PathValidationUtil.validate('file\0name')).toThrow('contains dangerous character');
      });

      it('should throw for control characters', () => {
        expect(() => PathValidationUtil.validate('file\x01name')).toThrow('contains control character');
        expect(() => PathValidationUtil.validate('file\x1fname')).toThrow('contains control character');
      });

      it('should throw for potential injection characters', () => {
        expect(() => PathValidationUtil.validate('file<script>')).toThrow('contains dangerous character');
        expect(() => PathValidationUtil.validate('file>output')).toThrow('contains dangerous character');
        expect(() => PathValidationUtil.validate('file|command')).toThrow('contains dangerous character');
      });

      it('should throw for newlines and carriage returns', () => {
        expect(() => PathValidationUtil.validate('file\nname')).toThrow('contains dangerous character');
        expect(() => PathValidationUtil.validate('file\rname')).toThrow('contains dangerous character');
      });
    });

    describe('path length validation', () => {
      it('should throw for paths exceeding maximum length', () => {
        const longPath = 'a'.repeat(1001);
        expect(() => PathValidationUtil.validate(longPath)).toThrow('exceeds maximum length');
      });

      it('should accept paths at maximum length', () => {
        const maxPath = 'a'.repeat(1000);
        expect(() => PathValidationUtil.validate(maxPath)).not.toThrow();
      });

      it('should use custom max length when provided', () => {
        const path = 'a'.repeat(51);
        expect(() => PathValidationUtil.validate(path, 'path', { maxLength: 50 })).toThrow('exceeds maximum length of 50');
        expect(() => PathValidationUtil.validate(path, 'path', { maxLength: 100 })).not.toThrow();
      });
    });

    describe('validation types', () => {
      it('should validate as file by default', () => {
        expect(() => PathValidationUtil.validate('folder/')).toThrow('cannot end with a slash');
      });

      it('should allow trailing slash for directories', () => {
        expect(() => PathValidationUtil.validate('folder/', 'path', { type: PathValidationType.DIRECTORY })).not.toThrow();
      });

      it('should normalize directory paths by removing trailing slash', () => {
        const result = PathValidationUtil.normalize('folder/', PathValidationType.DIRECTORY);
        expect(result).toBe('folder');
      });

      it('should handle ANY type validation', () => {
        expect(() => PathValidationUtil.validate('file.txt', 'path', { type: PathValidationType.ANY })).not.toThrow();
        expect(() => PathValidationUtil.validate('folder/', 'path', { type: PathValidationType.ANY })).not.toThrow();
      });
    });

    describe('valid paths', () => {
      it('should accept simple file names', () => {
        expect(() => PathValidationUtil.validate('file.txt')).not.toThrow();
        expect(() => PathValidationUtil.validate('document.md')).not.toThrow();
      });

      it('should accept nested paths', () => {
        expect(() => PathValidationUtil.validate('folder/subfolder/file.txt')).not.toThrow();
        expect(() => PathValidationUtil.validate('a/b/c/d/e.md')).not.toThrow();
      });

      it('should accept paths with spaces', () => {
        expect(() => PathValidationUtil.validate('My Documents/Important File.txt')).not.toThrow();
      });

      it('should accept paths with allowed special characters', () => {
        expect(() => PathValidationUtil.validate('file-name_123.txt')).not.toThrow();
        expect(() => PathValidationUtil.validate('report (2023).pdf')).not.toThrow();
      });
    });

    describe('custom error messages', () => {
      it('should use custom empty message when provided', () => {
        expect(() => PathValidationUtil.validate('', 'filepath', { 
          messages: { empty: 'Please provide a file path' }
        })).toThrow('Please provide a file path');
      });

      it('should use custom security message when provided', () => {
        expect(() => PathValidationUtil.validate('../etc', 'filepath', {
          messages: { security: 'Unsafe path detected' }
        })).toThrow('Unsafe path detected');
      });
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple paths', () => {
      const paths = ['file1.txt', 'folder/file2.md', 'data.json'];
      expect(() => PathValidationUtil.validateBatch(paths)).not.toThrow();
    });

    it('should throw with details about which path failed', () => {
      const paths = ['valid.txt', '../invalid', 'also-valid.md'];
      expect(() => PathValidationUtil.validateBatch(paths)).toThrow('Path at index 1 contains parent directory traversal');
    });

    it('should validate with custom options', () => {
      const paths = ['file1.txt', 'file2.txt'];
      expect(() => PathValidationUtil.validateBatch(paths, { maxLength: 5 })).toThrow('Path at index 0 exceeds maximum length');
    });
  });

  describe('normalize', () => {
    it('should trim whitespace', () => {
      expect(PathValidationUtil.normalize('  file.txt  ')).toBe('file.txt');
    });

    it('should normalize multiple slashes', () => {
      expect(PathValidationUtil.normalize('folder//subfolder///file.txt')).toBe('folder/subfolder/file.txt');
    });

    it('should convert backslashes to forward slashes', () => {
      expect(PathValidationUtil.normalize('folder\\subfolder\\file.txt')).toBe('folder/subfolder/file.txt');
    });

    it('should remove trailing slashes for files', () => {
      expect(PathValidationUtil.normalize('folder/file.txt/')).toBe('folder/file.txt');
    });

    it('should handle directory normalization', () => {
      expect(PathValidationUtil.normalize('folder/subfolder/', PathValidationType.DIRECTORY)).toBe('folder/subfolder');
    });

    it('should remove leading slashes', () => {
      expect(PathValidationUtil.normalize('/folder/file.txt')).toBe('folder/file.txt');
    });
  });

  describe('isValid', () => {
    it('should return true for valid paths', () => {
      expect(PathValidationUtil.isValid('file.txt')).toBe(true);
      expect(PathValidationUtil.isValid('folder/file.md')).toBe(true);
    });

    it('should return false for invalid paths', () => {
      expect(PathValidationUtil.isValid('')).toBe(false);
      expect(PathValidationUtil.isValid('../etc')).toBe(false);
      expect(PathValidationUtil.isValid('/absolute')).toBe(false);
    });

    it('should respect custom options', () => {
      expect(PathValidationUtil.isValid('file.txt', { maxLength: 5 })).toBe(false);
      expect(PathValidationUtil.isValid('f.txt', { maxLength: 5 })).toBe(true);
    });
  });

  describe('PathValidationError', () => {
    it('should have correct name and code', () => {
      const error = new PathValidationError('Test error');
      expect(error.name).toBe('PathValidationError');
      expect(error.code).toBe(400);
    });

    it('should include field name when provided', () => {
      const error = new PathValidationError('Path is invalid', 'filepath');
      expect(error.message).toBe('Path is invalid');
      expect(error.fieldName).toBe('filepath');
    });
  });
});