/**
 * Tests for ResponseModeSystem - shared response mode handling and content processing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseModeSystem, ResponseMode, ResponseContent } from './ResponseModeSystem.js';
import { LRUCache } from './Cache.js';

describe('ResponseModeSystem', () => {
  beforeEach(() => {
    // Clear any cached instances between tests
    ResponseModeSystem.clearCache();
  });

  describe('parseMode', () => {
    it('should parse valid modes correctly', () => {
      expect(ResponseModeSystem.parseMode('summary')).toBe('summary');
      expect(ResponseModeSystem.parseMode('preview')).toBe('preview');
      expect(ResponseModeSystem.parseMode('full')).toBe('full');
    });

    it('should default to summary for invalid modes', () => {
      expect(ResponseModeSystem.parseMode('invalid')).toBe('summary');
      expect(ResponseModeSystem.parseMode('')).toBe('summary');
      expect(ResponseModeSystem.parseMode(null)).toBe('summary');
      expect(ResponseModeSystem.parseMode(undefined)).toBe('summary');
    });
  });

  describe('extractModeFromUri', () => {
    it('should extract mode from URI query parameters', () => {
      expect(ResponseModeSystem.extractModeFromUri('vault://test?mode=full')).toBe('full');
      expect(ResponseModeSystem.extractModeFromUri('vault://test?mode=preview')).toBe('preview');
      expect(ResponseModeSystem.extractModeFromUri('vault://test?mode=summary')).toBe('summary');
    });

    it('should default to summary when no mode parameter', () => {
      expect(ResponseModeSystem.extractModeFromUri('vault://test')).toBe('summary');
      expect(ResponseModeSystem.extractModeFromUri('vault://test?other=param')).toBe('summary');
    });
  });

  describe('createSummary', () => {
    const longContent = 'A'.repeat(1000);
    
    it('should create summary under 500 characters', () => {
      const summary = ResponseModeSystem.createSummary(longContent);
      expect(summary.length).toBeLessThanOrEqual(500);
    });

    it('should preserve short content', () => {
      const shortContent = 'Short content';
      const summary = ResponseModeSystem.createSummary(shortContent);
      expect(summary).toBe(shortContent);
    });

    it('should add truncation indicator for long content', () => {
      const summary = ResponseModeSystem.createSummary(longContent);
      expect(summary).toBe('A'.repeat(497) + '...');
    });
  });

  describe('createPreview', () => {
    const longContent = 'B'.repeat(3000);
    
    it('should create preview under 2000 characters', () => {
      const preview = ResponseModeSystem.createPreview(longContent);
      expect(preview.length).toBeLessThanOrEqual(2000);
    });

    it('should preserve short content', () => {
      const shortContent = 'Short content for preview';
      const preview = ResponseModeSystem.createPreview(shortContent);
      expect(preview).toBe(shortContent);
    });

    it('should add truncation indicator for long content', () => {
      const preview = ResponseModeSystem.createPreview(longContent);
      expect(preview).toBe('B'.repeat(1997) + '...');
    });
  });

  describe('processContent', () => {
    const testContent: ResponseContent = {
      full: 'Full content with all details and comprehensive information',
      summary: 'Brief summary',
      preview: 'Preview content with more details than summary'
    };

    it('should return full content for full mode', () => {
      const result = ResponseModeSystem.processContent(testContent, 'full');
      expect(result).toBe(testContent.full);
    });

    it('should return preview content for preview mode', () => {
      const result = ResponseModeSystem.processContent(testContent, 'preview');
      expect(result).toBe(testContent.preview);
    });

    it('should return summary content for summary mode', () => {
      const result = ResponseModeSystem.processContent(testContent, 'summary');
      expect(result).toBe(testContent.summary);
    });

    it('should auto-generate summary when not provided', () => {
      const contentWithoutSummary: ResponseContent = {
        full: 'A'.repeat(1000),
        preview: 'Preview content'
      };
      
      const result = ResponseModeSystem.processContent(contentWithoutSummary, 'summary');
      expect(result.length).toBeLessThanOrEqual(500);
      expect(result).toBe('A'.repeat(497) + '...');
    });

    it('should auto-generate preview when not provided', () => {
      const contentWithoutPreview: ResponseContent = {
        full: 'B'.repeat(3000),
        summary: 'Brief summary'
      };
      
      const result = ResponseModeSystem.processContent(contentWithoutPreview, 'preview');
      expect(result.length).toBeLessThanOrEqual(2000);
      expect(result).toBe('B'.repeat(1997) + '...');
    });
  });

  describe('caching', () => {
    it('should cache computed previews', () => {
      const longContent = 'C'.repeat(3000);
      const cacheKey = 'test-key';

      // First call should compute and cache
      const result1 = ResponseModeSystem.createPreview(longContent, cacheKey);
      
      // Second call should use cache
      const result2 = ResponseModeSystem.createPreview(longContent, cacheKey);
      
      expect(result1).toBe(result2);
      expect(result1.length).toBeLessThanOrEqual(2000);
    });

    it('should cache computed summaries', () => {
      const longContent = 'D'.repeat(1000);
      const cacheKey = 'test-summary-key';

      // First call should compute and cache
      const result1 = ResponseModeSystem.createSummary(longContent, cacheKey);
      
      // Second call should use cache
      const result2 = ResponseModeSystem.createSummary(longContent, cacheKey);
      
      expect(result1).toBe(result2);
      expect(result1.length).toBeLessThanOrEqual(500);
    });

    it('should handle cache without key', () => {
      const content = 'E'.repeat(1000);
      
      // Should work without caching
      const result = ResponseModeSystem.createSummary(content);
      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe('createModeResponse', () => {
    it('should create proper response structure', () => {
      const content: ResponseContent = {
        full: 'Full content',
        summary: 'Summary',
        preview: 'Preview'
      };

      const summaryResponse = ResponseModeSystem.createModeResponse(content, 'summary');
      expect(summaryResponse).toEqual({
        mode: 'summary',
        content: 'Summary'
      });

      const previewResponse = ResponseModeSystem.createModeResponse(content, 'preview');
      expect(previewResponse).toEqual({
        mode: 'preview',
        content: 'Preview'
      });

      const fullResponse = ResponseModeSystem.createModeResponse(content, 'full');
      expect(fullResponse).toEqual({
        mode: 'full',
        content: 'Full content'
      });
    });
  });
});