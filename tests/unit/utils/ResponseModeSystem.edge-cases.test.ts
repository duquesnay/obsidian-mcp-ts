/**
 * Edge case tests for ResponseModeSystem - critical scenarios for production stability
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponseModeSystem, ResponseMode, ResponseContent } from '../../../src/utils/ResponseModeSystem.js';

describe('ResponseModeSystem Edge Cases', () => {
  beforeEach(() => {
    ResponseModeSystem.clearCache();
  });

  describe('Memory management and cache behavior', () => {
    it('should handle cache overflow gracefully', () => {
      // Fill cache beyond typical capacity
      for (let i = 0; i < 200; i++) {
        ResponseModeSystem.createSummary(`Content ${i}`.repeat(100), `key-${i}`);
      }

      // Verify cache still functions correctly
      const content = 'A'.repeat(1000);
      const result = ResponseModeSystem.createSummary(content, 'test-key');
      expect(result.length).toBeLessThanOrEqual(500);
      expect(result).toBe('A'.repeat(497) + '...');
      
      // Verify cache statistics are available
      const stats = ResponseModeSystem.getCacheStats();
      expect(stats.summary.size).toBeGreaterThan(0);
      expect(stats.summary.hitRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent cache access safely', async () => {
      const content = 'B'.repeat(2000);
      const promises = [];

      // Create multiple concurrent requests for same cache key
      for (let i = 0; i < 50; i++) {
        promises.push(
          Promise.resolve(ResponseModeSystem.createPreview(content, 'concurrent-key'))
        );
      }

      const results = await Promise.all(promises);
      
      // All results should be identical
      const firstResult = results[0];
      expect(firstResult.length).toBeLessThanOrEqual(2000);
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });

    it('should handle cache key collisions gracefully', () => {
      const content1 = 'Content type 1';
      const content2 = 'Content type 2';
      const sameKey = 'collision-key';

      // First content cached
      const result1 = ResponseModeSystem.createSummary(content1, sameKey);
      expect(result1).toBe(content1);

      // Second call with same key should return cached value (content1)
      const result2 = ResponseModeSystem.createSummary(content2, sameKey);
      expect(result2).toBe(content1); // Should return cached result
    });
  });

  describe('Extreme content scenarios', () => {
    it('should handle extremely large content efficiently', () => {
      const hugeContent = 'X'.repeat(1000000); // 1MB content
      
      const start = performance.now();
      const summary = ResponseModeSystem.createSummary(hugeContent);
      const end = performance.now();

      expect(summary.length).toBe(500);
      expect(summary).toBe('X'.repeat(497) + '...');
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    it('should handle empty content', () => {
      const content: ResponseContent = { full: '' };
      
      expect(ResponseModeSystem.processContent(content, 'full')).toBe('');
      expect(ResponseModeSystem.processContent(content, 'preview')).toBe('');
      expect(ResponseModeSystem.processContent(content, 'summary')).toBe('');
    });

    it('should handle content with only whitespace', () => {
      const whitespaceContent = '   \n\t   \n   ';
      const content: ResponseContent = { full: whitespaceContent };
      
      expect(ResponseModeSystem.processContent(content, 'full')).toBe(whitespaceContent);
      expect(ResponseModeSystem.processContent(content, 'preview')).toBe(whitespaceContent);
      expect(ResponseModeSystem.processContent(content, 'summary')).toBe(whitespaceContent);
    });

    it('should handle content with special Unicode characters', () => {
      const unicodeContent = '🎉 Hello 世界 💻 Emoji test with special chars àáâãäå çñü';
      const longUnicode = unicodeContent.repeat(20); // Make it long enough to truncate
      
      const summary = ResponseModeSystem.createSummary(longUnicode);
      expect(summary.length).toBeLessThanOrEqual(500);
      expect(summary).toContain('🎉');
      expect(summary).toContain('世界');
    });

    it('should handle content exactly at boundaries', () => {
      // Exactly 500 chars for summary
      const exactSummaryLength = 'A'.repeat(500);
      const summary = ResponseModeSystem.createSummary(exactSummaryLength);
      expect(summary).toBe(exactSummaryLength);
      expect(summary.length).toBe(500);

      // Exactly 2000 chars for preview  
      const exactPreviewLength = 'B'.repeat(2000);
      const preview = ResponseModeSystem.createPreview(exactPreviewLength);
      expect(preview).toBe(exactPreviewLength);
      expect(preview.length).toBe(2000);

      // One char over boundaries
      const oneTooLongSummary = 'C'.repeat(501);
      const truncatedSummary = ResponseModeSystem.createSummary(oneTooLongSummary);
      expect(truncatedSummary.length).toBe(500);
      expect(truncatedSummary).toBe('C'.repeat(497) + '...');
    });
  });

  describe('Invalid input handling', () => {
    it('should handle malformed URIs gracefully', () => {
      // Test various malformed URI scenarios
      expect(ResponseModeSystem.extractModeFromUri('not-a-uri')).toBe('summary');
      expect(ResponseModeSystem.extractModeFromUri('')).toBe('summary');
      expect(ResponseModeSystem.extractModeFromUri('vault://')).toBe('summary');
      expect(ResponseModeSystem.extractModeFromUri('vault://test?')).toBe('summary');
      expect(ResponseModeSystem.extractModeFromUri('vault://test?mode=')).toBe('summary');
    });

    it('should handle null/undefined content objects', () => {
      const nullContent = null as unknown as ResponseContent;
      const undefinedContent = undefined as unknown as ResponseContent;
      
      // Should not throw, though results may be undefined behavior
      expect(() => ResponseModeSystem.processContent(nullContent, 'summary')).not.toThrow();
      expect(() => ResponseModeSystem.processContent(undefinedContent, 'preview')).not.toThrow();
    });

    it('should handle content with missing full property', () => {
      const incompleteContent = {
        summary: 'Has summary',
        preview: 'Has preview'
        // missing 'full' property
      } as ResponseContent;
      
      // Should gracefully handle missing full content
      expect(() => ResponseModeSystem.processContent(incompleteContent, 'full')).not.toThrow();
      expect(() => ResponseModeSystem.processContent(incompleteContent, 'summary')).not.toThrow();
    });

    it('should handle extremely long cache keys', () => {
      const longKey = 'key-'.repeat(1000); // Very long cache key
      const content = 'test content';
      
      // Should handle without errors
      expect(() => ResponseModeSystem.createSummary(content, longKey)).not.toThrow();
      expect(() => ResponseModeSystem.createPreview(content, longKey)).not.toThrow();
    });
  });

  describe('Concurrent operations', () => {
    it('should handle rapid sequential calls without race conditions', () => {
      const results = [];
      const content = 'Test content for sequential calls';
      
      // Rapid sequential calls
      for (let i = 0; i < 100; i++) {
        results.push(ResponseModeSystem.createSummary(content, `key-${i}`));
      }
      
      // All results should be consistent
      results.forEach(result => {
        expect(result).toBe(content);
      });
    });

    it('should maintain cache consistency under load', async () => {
      const content = 'Cache consistency test content';
      const cacheKey = 'consistency-key';
      
      // Multiple operations on same cache key
      const operations = [
        () => ResponseModeSystem.createSummary(content, cacheKey),
        () => ResponseModeSystem.createPreview(content, cacheKey),
        () => ResponseModeSystem.getCacheStats(),
        () => ResponseModeSystem.createSummary(content, cacheKey + '2'),
        () => ResponseModeSystem.clearCache(),
        () => ResponseModeSystem.createSummary(content, cacheKey)
      ];
      
      // Execute all operations - should not throw
      operations.forEach(op => {
        expect(() => op()).not.toThrow();
      });
    });
  });

  describe('Error recovery', () => {
    it('should recover from cache corruption gracefully', () => {
      // Simulate cache corruption by accessing private cache directly
      const cache = (ResponseModeSystem as any).summaryCache;
      
      // Create normal cached entry
      ResponseModeSystem.createSummary('test content', 'normal-key');
      
      // Simulate corruption by setting invalid cache entry
      if (cache && cache.set) {
        cache.set('corrupted-key', null);
        cache.set('corrupted-key-2', undefined);
      }
      
      // Should still work for new entries
      const result = ResponseModeSystem.createSummary('new content', 'new-key');
      expect(result).toBe('new content');
      
      // Should handle corrupted entries gracefully
      const corruptedResult = ResponseModeSystem.createSummary('fallback content', 'corrupted-key');
      expect(corruptedResult).toBe('fallback content');
    });

    it('should handle memory pressure scenarios', () => {
      // Fill up cache with large entries
      for (let i = 0; i < 1000; i++) {
        const largeContent = `Large content ${i} `.repeat(100);
        ResponseModeSystem.createSummary(largeContent, `large-${i}`);
        ResponseModeSystem.createPreview(largeContent, `large-preview-${i}`);
      }
      
      // Should still function correctly
      const testContent = 'Test content after memory pressure';
      const result = ResponseModeSystem.createSummary(testContent);
      expect(result).toBe(testContent);
      
      // Cache should still provide statistics
      const stats = ResponseModeSystem.getCacheStats();
      expect(typeof stats.summary.size).toBe('number');
      expect(typeof stats.preview.size).toBe('number');
    });
  });

  describe('Mode parameter edge cases', () => {
    it('should handle case-sensitive mode parameters', () => {
      expect(ResponseModeSystem.parseMode('SUMMARY')).toBe('summary');
      expect(ResponseModeSystem.parseMode('Summary')).toBe('summary');
      expect(ResponseModeSystem.parseMode('PREVIEW')).toBe('summary'); // Should default for invalid
      expect(ResponseModeSystem.parseMode('Preview')).toBe('summary'); // Should default for invalid
    });

    it('should handle mode parameters with extra whitespace', () => {
      expect(ResponseModeSystem.parseMode(' summary ')).toBe('summary'); // Should default for invalid
      expect(ResponseModeSystem.parseMode('\tsummary\n')).toBe('summary'); // Should default for invalid
      expect(ResponseModeSystem.parseMode('summary\0')).toBe('summary'); // Should default for invalid
    });

    it('should handle numerical and special character mode parameters', () => {
      expect(ResponseModeSystem.parseMode('123')).toBe('summary');
      expect(ResponseModeSystem.parseMode('mode-1')).toBe('summary');
      expect(ResponseModeSystem.parseMode('summary!')).toBe('summary');
      expect(ResponseModeSystem.parseMode('sümmary')).toBe('summary');
    });
  });
});