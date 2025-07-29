/**
 * Tests for BaseResourceHandler with response mode system integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResponseMode, ResponseContent } from '../utils/ResponseModeSystem.js';

// Test implementation of BaseResourceHandler
class TestResourceHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    // Simple path extraction for testing
    let path: string;
    try {
      path = this.extractPath(uri, 'vault://test/');
    } catch (error) {
      // Fallback parsing for test URIs
      const url = new URL(uri, 'vault://');
      path = url.pathname.replace('/test/', '');
    }
    
    // Strip query parameters from path for routing
    path = path.split('?')[0];
    
    // Mock data based on path
    if (path === 'simple') {
      return 'Simple text response';
    }
    
    if (path === 'complex') {
      // Return data that should be processed based on mode
      return {
        title: 'Test Note',
        content: 'A'.repeat(3000), // Long content for testing
        metadata: { created: '2023-01-01', modified: '2023-01-02' }
      };
    }
    
    if (path === 'mode-aware') {
      // Return ResponseContent for mode-aware processing
      const responseContent: ResponseContent = {
        full: 'Full detailed content with all information and comprehensive details about the topic',
        summary: 'Brief summary',
        preview: 'Preview content with moderate detail level'
      };
      
      const mode = this.extractModeFromUri(uri);
      return this.processResponseContent(responseContent, mode);
    }
    
    throw new Error(`Test path not found: ${path} from ${uri}`);
  }
}

describe('BaseResourceHandler with Response Mode System', () => {
  let handler: TestResourceHandler;
  
  beforeEach(() => {
    handler = new TestResourceHandler();
  });

  describe('extractModeFromUri', () => {
    it('should extract mode from URI query parameters', () => {
      expect(handler.extractModeFromUri('vault://test?mode=full')).toBe('full');
      expect(handler.extractModeFromUri('vault://test?mode=preview')).toBe('preview');
      expect(handler.extractModeFromUri('vault://test?mode=summary')).toBe('summary');
    });

    it('should default to summary when no mode parameter', () => {
      expect(handler.extractModeFromUri('vault://test')).toBe('summary');
      expect(handler.extractModeFromUri('vault://test?other=value')).toBe('summary');
    });
  });

  describe('processResponseContent', () => {
    const testContent: ResponseContent = {
      full: 'Full content with all details',
      summary: 'Brief summary',
      preview: 'Preview content'
    };

    it('should process content for different modes', () => {
      const fullResponse = handler.processResponseContent(testContent, 'full');
      expect(fullResponse.mode).toBe('full');
      expect(fullResponse.content).toBe('Full content with all details');
      
      const previewResponse = handler.processResponseContent(testContent, 'preview');
      expect(previewResponse.mode).toBe('preview');
      expect(previewResponse.content).toBe('Preview content');
      
      const summaryResponse = handler.processResponseContent(testContent, 'summary');
      expect(summaryResponse.mode).toBe('summary');
      expect(summaryResponse.content).toBe('Brief summary');
    });

    it('should auto-generate missing content variants', () => {
      const contentWithoutSummary: ResponseContent = {
        full: 'A'.repeat(1000)
      };
      
      const summaryResponse = handler.processResponseContent(contentWithoutSummary, 'summary');
      expect(summaryResponse.mode).toBe('summary');
      expect(summaryResponse.content.length).toBeLessThanOrEqual(500);
      expect(summaryResponse.content.endsWith('...')).toBe(true);
    });
  });

  describe('createSummaryResponse and createPreviewResponse', () => {
    it('should create proper summary responses', () => {
      const longContent = 'B'.repeat(1000);
      const summary = handler.createSummaryResponse(longContent);
      
      expect(summary.length).toBeLessThanOrEqual(500);
      expect(summary.endsWith('...')).toBe(true);
    });

    it('should create proper preview responses', () => {
      const longContent = 'C'.repeat(3000);
      const preview = handler.createPreviewResponse(longContent);
      
      expect(preview.length).toBeLessThanOrEqual(2000);
      expect(preview.endsWith('...')).toBe(true);
    });

    it('should handle caching with cache keys', () => {
      const content = 'D'.repeat(1000);
      const key = 'test-cache-key';
      
      const result1 = handler.createSummaryResponse(content, key);
      const result2 = handler.createSummaryResponse(content, key);
      
      expect(result1).toBe(result2);
    });
  });

  describe('formatModeResponse', () => {
    it('should format responses with mode information', () => {
      const content: ResponseContent = {
        full: 'Full content',
        summary: 'Summary'
      };
      
      const response = handler.formatModeResponse('vault://test', content, 'summary');
      
      expect(response.contents[0].mimeType).toBe('application/json');
      const parsedContent = JSON.parse(response.contents[0].text);
      expect(parsedContent.mode).toBe('summary');
      expect(parsedContent.content).toBe('Summary');
    });
  });

  describe('Integration with existing methods', () => {
    it('should handle simple text responses (backward compatibility)', async () => {
      const result = await handler.execute('vault://test/simple');
      
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toBe('Simple text response');
    });

    it('should handle complex JSON responses (backward compatibility)', async () => {
      const result = await handler.execute('vault://test/complex');
      
      expect(result.contents[0].mimeType).toBe('application/json');
      const parsedContent = JSON.parse(result.contents[0].text);
      expect(parsedContent.title).toBe('Test Note');
      expect(parsedContent.content).toBeDefined();
    });

    it('should handle mode-aware responses', async () => {
      const result = await handler.execute('vault://test/mode-aware?mode=summary');
      
      expect(result.contents[0].mimeType).toBe('application/json');
      const parsedContent = JSON.parse(result.contents[0].text);
      expect(parsedContent.mode).toBe('summary');
      expect(parsedContent.content).toBe('Brief summary');
    });

    it('should handle mode-aware responses with auto-generation', async () => {  
      const result = await handler.execute('vault://test/mode-aware?mode=preview');
      
      expect(result.contents[0].mimeType).toBe('application/json');
      const parsedContent = JSON.parse(result.contents[0].text);
      expect(parsedContent.mode).toBe('preview');
      expect(parsedContent.content).toBe('Preview content with moderate detail level');
    });
  });
});