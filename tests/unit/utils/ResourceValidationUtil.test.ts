import { describe, it, expect } from 'vitest';
import { ResourceValidationUtil } from '../../../src/utils/ResourceValidationUtil.js';

describe('ResourceValidationUtil', () => {
  describe('extractUriParameter', () => {
    it('should extract parameter from URI', () => {
      const result = ResourceValidationUtil.extractUriParameter(
        'vault://note/path/to/file.md',
        'vault://note/',
        'path'
      );
      expect(result).toBe('path/to/file.md');
    });

    it('should handle trailing slash in prefix', () => {
      const result = ResourceValidationUtil.extractUriParameter(
        'vault://tag/project',
        'vault://tag/',
        'tag'
      );
      expect(result).toBe('project');
    });

    it('should handle empty parameter', () => {
      const result = ResourceValidationUtil.extractUriParameter(
        'vault://folder/',
        'vault://folder/',
        'folder'
      );
      expect(result).toBe('');
    });

    it('should handle URI without trailing slash', () => {
      const result = ResourceValidationUtil.extractUriParameter(
        'vault://folder',
        'vault://folder/',
        'folder'
      );
      expect(result).toBe('');
    });

    it('should decode URL-encoded parameters', () => {
      const result = ResourceValidationUtil.extractUriParameter(
        'vault://search/hello%20world',
        'vault://search/',
        'query'
      );
      expect(result).toBe('hello world');
    });

    it('should remove trailing slash from parameter', () => {
      const result = ResourceValidationUtil.extractUriParameter(
        'vault://daily/2024-01-15/',
        'vault://daily/',
        'date'
      );
      expect(result).toBe('2024-01-15');
    });
  });

  describe('validateRequiredParameter', () => {
    it('should not throw for valid parameter', () => {
      expect(() => 
        ResourceValidationUtil.validateRequiredParameter('value', 'paramName')
      ).not.toThrow();
    });

    it('should throw for null parameter', () => {
      expect(() => 
        ResourceValidationUtil.validateRequiredParameter(null, 'paramName')
      ).toThrow('paramName is required');
    });

    it('should throw for undefined parameter', () => {
      expect(() => 
        ResourceValidationUtil.validateRequiredParameter(undefined, 'paramName')
      ).toThrow('paramName is required');
    });

    it('should throw for empty string', () => {
      expect(() => 
        ResourceValidationUtil.validateRequiredParameter('', 'query')
      ).toThrow('query is required');
    });

    it('should throw for whitespace-only string', () => {
      expect(() => 
        ResourceValidationUtil.validateRequiredParameter('   ', 'search term')
      ).toThrow('search term is required');
    });

    it('should not throw for zero', () => {
      expect(() => 
        ResourceValidationUtil.validateRequiredParameter(0, 'count')
      ).not.toThrow();
    });

    it('should not throw for false', () => {
      expect(() => 
        ResourceValidationUtil.validateRequiredParameter(false, 'flag')
      ).not.toThrow();
    });
  });

  describe('normalizeUri', () => {
    it('should add trailing slash if missing', () => {
      const result = ResourceValidationUtil.normalizeUri('vault://folder', true);
      expect(result).toBe('vault://folder/');
    });

    it('should not add trailing slash if already present', () => {
      const result = ResourceValidationUtil.normalizeUri('vault://folder/', true);
      expect(result).toBe('vault://folder/');
    });

    it('should remove trailing slash if requested', () => {
      const result = ResourceValidationUtil.normalizeUri('vault://daily/', false);
      expect(result).toBe('vault://daily');
    });

    it('should not remove slash if not present', () => {
      const result = ResourceValidationUtil.normalizeUri('vault://daily', false);
      expect(result).toBe('vault://daily');
    });

    it('should handle multiple trailing slashes', () => {
      const result = ResourceValidationUtil.normalizeUri('vault://folder///', true);
      expect(result).toBe('vault://folder/');
    });
  });

  describe('validateDateFormat', () => {
    it('should return true for valid date format', () => {
      expect(ResourceValidationUtil.validateDateFormat('2024-01-15')).toBe(true);
    });

    it('should return true for "today"', () => {
      expect(ResourceValidationUtil.validateDateFormat('today')).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(ResourceValidationUtil.validateDateFormat('01-15-2024')).toBe(false);
    });

    it('should return false for invalid date', () => {
      expect(ResourceValidationUtil.validateDateFormat('2024-13-45')).toBe(false);
    });

    it('should return false for partial date', () => {
      expect(ResourceValidationUtil.validateDateFormat('2024-01')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(ResourceValidationUtil.validateDateFormat('')).toBe(false);
    });

    it('should handle leap years correctly', () => {
      expect(ResourceValidationUtil.validateDateFormat('2024-02-29')).toBe(true);
      expect(ResourceValidationUtil.validateDateFormat('2023-02-29')).toBe(false);
    });
  });

  describe('normalizeTagName', () => {
    it('should remove # prefix if present', () => {
      expect(ResourceValidationUtil.normalizeTagName('#project')).toBe('project');
    });

    it('should not modify tag without # prefix', () => {
      expect(ResourceValidationUtil.normalizeTagName('project')).toBe('project');
    });

    it('should handle multiple # prefixes', () => {
      expect(ResourceValidationUtil.normalizeTagName('##project')).toBe('#project');
    });

    it('should trim whitespace', () => {
      expect(ResourceValidationUtil.normalizeTagName('  #project  ')).toBe('project');
    });

    it('should handle empty string', () => {
      expect(ResourceValidationUtil.normalizeTagName('')).toBe('');
    });

    it('should handle just #', () => {
      expect(ResourceValidationUtil.normalizeTagName('#')).toBe('');
    });
  });
});