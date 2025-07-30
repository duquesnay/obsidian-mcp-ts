/**
 * Tests for BaseResourceHandler RSM (Response Mode System) integration
 * Testing mode parameter extraction, content processing, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseResourceHandler } from '../../src/resources/BaseResourceHandler.js';
import { ResponseModeSystem, ResponseContent } from '../../src/utils/ResponseModeSystem.js';

// Create concrete test handler implementations
class RSMTestHandler extends BaseResourceHandler {
  public testMode: string = 'full';
  public testContent: ResponseContent = {
    full: 'Full content with all the details you could ever want and more detailed information about the topic',
    preview: 'Preview content with some details',
    summary: 'Brief summary'
  };

  async handleRequest(uri: string, server?: any): Promise<any> {
    const mode = ResponseModeSystem.extractModeFromUri(uri);
    const processedContent = ResponseModeSystem.processContent(this.testContent, mode);
    
    return {
      mode,
      content: processedContent,
      originalUri: uri
    };
  }

  // Expose protected methods for testing
  public testExtractModeFromUri(uri: string) {
    return ResponseModeSystem.extractModeFromUri(uri);
  }
}

class ContentProcessingHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const mode = ResponseModeSystem.extractModeFromUri(uri);
    
    // Simulate complex content processing
    const largeContent = 'Lorem ipsum '.repeat(200); // ~2400 chars
    const content: ResponseContent = {
      full: largeContent,
      // Intentionally omit preview and summary to test auto-generation
    };

    // Use cache keys to enable caching for testing
    const cacheKey = `test-content-${uri}`;
    let processedContent: string;
    
    switch (mode) {
      case 'full':
        processedContent = content.full;
        break;
      case 'preview':
        processedContent = content.preview || ResponseModeSystem.createPreview(content.full, cacheKey);
        break;
      case 'summary':
        processedContent = content.summary || ResponseModeSystem.createSummary(content.full, cacheKey);
        break;
      default:
        processedContent = content.summary || ResponseModeSystem.createSummary(content.full, cacheKey);
    }
    
    return {
      mode,
      content: processedContent,
      contentLength: processedContent.length,
      originalLength: largeContent.length
    };
  }
}

class ErrorHandlingHandler extends BaseResourceHandler {
  public shouldFailMode: boolean = false;
  public shouldFailContent: boolean = false;

  async handleRequest(uri: string, server?: any): Promise<any> {
    let mode = 'summary';
    let content = 'fallback content';

    try {
      if (this.shouldFailMode) {
        throw new Error('Mode extraction failed');
      }
      mode = ResponseModeSystem.extractModeFromUri(uri);
    } catch (error) {
      // Mode extraction failed, use default
      mode = 'summary';
    }

    try {
      if (this.shouldFailContent) {
        throw new Error('Content processing failed');
      }
      const responseContent: ResponseContent = {
        full: 'Successfully processed content with all details',
        preview: 'Preview of processed content',
        summary: 'Summary of content'
      };
      content = ResponseModeSystem.processContent(responseContent, mode as any);
    } catch (error) {
      // Content processing failed, use fallback
      content = 'Error: Content processing unavailable';
    }

    return {
      mode,
      content,
      hadErrors: this.shouldFailMode || this.shouldFailContent
    };
  }
}

describe('BaseResourceHandler RSM Integration', () => {
  beforeEach(() => {
    ResponseModeSystem.clearCache();
  });

  describe('Mode parameter extraction', () => {
    let handler: RSMTestHandler;

    beforeEach(() => {
      handler = new RSMTestHandler();
    });

    it('should extract summary mode from URI', async () => {
      const result = await handler.execute('vault://test?mode=summary');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('summary');
      expect(data.content).toBe('Brief summary');
    });

    it('should extract preview mode from URI', async () => {
      const result = await handler.execute('vault://test?mode=preview');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('preview');
      expect(data.content).toBe('Preview content with some details');
    });

    it('should extract full mode from URI', async () => {
      const result = await handler.execute('vault://test?mode=full');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('full');
      expect(data.content).toBe('Full content with all the details you could ever want and more detailed information about the topic');
    });

    it('should default to summary mode when no mode specified', async () => {
      const result = await handler.execute('vault://test');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('summary');
      expect(data.content).toBe('Brief summary');
    });

    it('should default to summary mode for invalid mode', async () => {
      const result = await handler.execute('vault://test?mode=invalid');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('summary');
      expect(data.content).toBe('Brief summary');
    });

    it('should handle mode parameter with other query parameters', async () => {
      const result = await handler.execute('vault://test?limit=10&mode=preview&offset=5');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('preview');
      expect(data.content).toBe('Preview content with some details');
      expect(data.originalUri).toBe('vault://test?limit=10&mode=preview&offset=5');
    });

    it('should handle URL-encoded mode parameters', async () => {
      const result = await handler.execute('vault://test?mode=summary&query=hello%20world');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('summary');
      expect(data.content).toBe('Brief summary');
    });
  });

  describe('Content processing integration', () => {
    let handler: ContentProcessingHandler;

    beforeEach(() => {
      handler = new ContentProcessingHandler();
    });

    it('should auto-generate summary when not provided', async () => {
      const result = await handler.execute('vault://test?mode=summary');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('summary');
      expect(data.contentLength).toBeLessThanOrEqual(500);
      expect(data.content).toContain('Lorem ipsum');
      expect(data.originalLength).toBeGreaterThan(2000);
    });

    it('should auto-generate preview when not provided', async () => {
      const result = await handler.execute('vault://test?mode=preview');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('preview');
      expect(data.contentLength).toBeLessThanOrEqual(2000);
      expect(data.content).toContain('Lorem ipsum');
      expect(data.originalLength).toBeGreaterThan(2000);
    });

    it('should return full content when requested', async () => {
      const result = await handler.execute('vault://test?mode=full');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('full');
      expect(data.contentLength).toBe(data.originalLength);
      expect(data.content).toContain('Lorem ipsum');
    });

    it('should handle content length boundaries correctly', async () => {
      // Test content exactly at summary boundary (500 chars)
      const exactContent = 'A'.repeat(500);
      // Override the handleRequest method to use exact content
      const originalHandleRequest = handler.handleRequest;
      handler.handleRequest = async function(uri: string, server?: any) {
        const mode = ResponseModeSystem.extractModeFromUri(uri);
        const content: ResponseContent = { full: exactContent };
        const processedContent = ResponseModeSystem.processContent(content, mode);
        
        return {
          mode,
          content: processedContent,
          contentLength: processedContent.length,
          originalLength: exactContent.length
        };
      };
      
      const result = await handler.execute('vault://test?mode=summary');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.content).toBe(exactContent);
      expect(data.contentLength).toBe(500);
    });
  });

  describe('Error handling and recovery', () => {
    let handler: ErrorHandlingHandler;

    beforeEach(() => {
      handler = new ErrorHandlingHandler();
    });

    it('should recover gracefully from mode extraction failures', async () => {
      handler.shouldFailMode = true;
      
      const result = await handler.execute('vault://test?mode=preview');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('summary'); // Should fallback to default
      expect(data.hadErrors).toBe(true);
      expect(data.content).toBe('Summary of content'); // Should still process content
    });

    it('should recover gracefully from content processing failures', async () => {
      handler.shouldFailContent = true;
      
      const result = await handler.execute('vault://test?mode=full');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('full'); // Mode extraction should succeed
      expect(data.content).toBe('Error: Content processing unavailable');
      expect(data.hadErrors).toBe(true);
    });

    it('should handle both mode and content failures', async () => {
      handler.shouldFailMode = true;
      handler.shouldFailContent = true;
      
      const result = await handler.execute('vault://test?mode=full');
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.mode).toBe('summary'); // Fallback mode
      expect(data.content).toBe('Error: Content processing unavailable'); // Fallback content
      expect(data.hadErrors).toBe(true);
    });
  });

  describe('Cache integration', () => {
    let handler: ContentProcessingHandler;

    beforeEach(() => {
      handler = new ContentProcessingHandler();
    });

    it('should utilize RSM cache for repeated requests', async () => {
      const uri = 'vault://test?mode=summary';
      
      // First request - should populate cache
      const result1 = await handler.execute(uri);
      const data1 = JSON.parse(result1.contents[0].text);
      
      // Second request - should use cache
      const result2 = await handler.execute(uri);
      const data2 = JSON.parse(result2.contents[0].text);
      
      expect(data1.content).toBe(data2.content);
      expect(data1.contentLength).toBe(data2.contentLength);
      
      // Cache should show some hits
      const cacheStats = ResponseModeSystem.getCacheStats();
      expect(cacheStats.summary.size).toBeGreaterThan(0);
    });

    it('should handle different modes independently in cache', async () => {
      const baseUri = 'vault://test';
      
      // Request different modes
      const summaryResult = await handler.execute(`${baseUri}?mode=summary`);
      const previewResult = await handler.execute(`${baseUri}?mode=preview`);
      const fullResult = await handler.execute(`${baseUri}?mode=full`);
      
      const summaryData = JSON.parse(summaryResult.contents[0].text);
      const previewData = JSON.parse(previewResult.contents[0].text);
      const fullData = JSON.parse(fullResult.contents[0].text);
      
      // All should be different lengths
      expect(summaryData.contentLength).toBeLessThan(previewData.contentLength);
      expect(previewData.contentLength).toBeLessThanOrEqual(fullData.contentLength);
      
      // Cache should have entries for processed modes
      const cacheStats = ResponseModeSystem.getCacheStats();
      expect(cacheStats.summary.size).toBeGreaterThan(0);
      expect(cacheStats.preview.size).toBeGreaterThan(0);
    });
  });

  describe('Performance characteristics', () => {
    it('should process large content efficiently', async () => {
      const handler = new ContentProcessingHandler();
      
      // Create very large content
      const hugeContent = 'X'.repeat(100000); // 100KB
      (handler as any).testContent = { full: hugeContent };
      
      const start = performance.now();
      const result = await handler.execute('vault://test?mode=summary');
      const end = performance.now();
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.contentLength).toBeLessThanOrEqual(500);
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    it('should handle concurrent requests efficiently', async () => {
      const handler = new ContentProcessingHandler();
      const numRequests = 20;
      
      const promises = Array.from({ length: numRequests }, (_, i) =>
        handler.execute(`vault://test${i}?mode=preview`)
      );
      
      const start = performance.now();
      const results = await Promise.all(promises);
      const end = performance.now();
      
      expect(results).toHaveLength(numRequests);
      results.forEach(result => {
        const data = JSON.parse(result.contents[0].text);
        expect(data.mode).toBe('preview');
        expect(data.contentLength).toBeLessThanOrEqual(2000);
      });
      
      expect(end - start).toBeLessThan(1000); // Should handle concurrency well
    });
  });

  describe('Integration with existing BaseResourceHandler methods', () => {
    class ExtendedRSMHandler extends BaseResourceHandler {
      async handleRequest(uri: string, server?: any): Promise<any> {
        const mode = ResponseModeSystem.extractModeFromUri(uri);
        const path = this.extractPath(uri, 'vault://test/');
        
        // Simulate content based on path
        const content: ResponseContent = {
          full: `Full content for path: ${path} with extensive details and comprehensive information`,
          preview: `Preview for path: ${path} with some details`,
          summary: `Summary for: ${path}`
        };
        
        const processedContent = ResponseModeSystem.processContent(content, mode);
        
        return {
          path,
          mode,
          content: processedContent,
          mimeType: 'text/markdown'
        };
      }
    }

    it('should integrate with path extraction methods', async () => {
      const handler = new ExtendedRSMHandler();
      const result = await handler.execute('vault://test/folder/file.md?mode=preview');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.path).toBe('folder/file.md');
      expect(data.mode).toBe('preview');
      expect(data.content).toContain('folder/file.md');
      expect(data.content).toContain('Preview for path');
    });

    it('should work with formatTextResponse', async () => {
      class TextResponseHandler extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          const mode = ResponseModeSystem.extractModeFromUri(uri);
          const content: ResponseContent = {
            full: 'Full markdown content with **bold** and *italic* text'
          };
          
          const processedContent = ResponseModeSystem.processContent(content, mode);
          return this.formatTextResponse(uri, processedContent, 'text/markdown');
        }
      }
      
      const handler = new TextResponseHandler();
      const result = await handler.handleRequest('vault://test?mode=summary');
      
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('Full markdown content');
    });

    it('should work with error handling methods', async () => {
      class ErrorTestHandler extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          const mode = ResponseModeSystem.extractModeFromUri(uri);
          
          if (uri.includes('404-test')) {
            const error = { response: { status: 404 } };
            this.handleError(error, 'Test Resource', 'test-file.md');
          }
          
          const content: ResponseContent = {
            full: 'Success content'
          };
          
          return {
            mode,
            content: ResponseModeSystem.processContent(content, mode)
          };
        }
      }
      
      const handler = new ErrorTestHandler();
      
      // Normal request should work
      const successResult = await handler.execute('vault://test?mode=full');
      const successData = JSON.parse(successResult.contents[0].text);
      expect(successData.content).toBe('Success content');
      
      // 404 request should throw appropriate error
      await expect(handler.execute('vault://test/404-test?mode=full'))
        .rejects.toThrow('Test Resource not found: test-file.md');
    });
  });
});