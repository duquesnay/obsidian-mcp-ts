import { describe, it, expect, vi } from 'vitest';
import { BaseResourceHandler } from '../../src/resources/BaseResourceHandler.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

// Create a concrete implementation for testing
class TestHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    return { test: 'data' };
  }
}

describe('BaseResourceHandler', () => {
  describe('formatJsonResponse', () => {
    it('should format JSON data with proper structure', () => {
      const handler = new TestHandler();
      const result = handler.formatJsonResponse('vault://test', { foo: 'bar' });
      
      expect(result).toEqual({
        contents: [{
          uri: 'vault://test',
          mimeType: 'application/json',
          text: JSON.stringify({ foo: 'bar' }, null, 2)
        }]
      });
    });
  });
  
  describe('formatTextResponse', () => {
    it('should format text with default markdown mime type', () => {
      const handler = new TestHandler();
      const result = handler.formatTextResponse('vault://test', 'Hello world');
      
      expect(result).toEqual({
        contents: [{
          uri: 'vault://test',
          mimeType: 'text/markdown',
          text: 'Hello world'
        }]
      });
    });
    
    it('should allow custom mime type', () => {
      const handler = new TestHandler();
      const result = handler.formatTextResponse('vault://test', 'Hello', 'text/plain');
      
      expect(result).toEqual({
        contents: [{
          uri: 'vault://test',
          mimeType: 'text/plain',
          text: 'Hello'
        }]
      });
    });
  });
  
  describe('extractPath', () => {
    it('should extract path from URI with prefix', () => {
      const handler = new TestHandler();
      const path = handler.extractPath('vault://note/Daily/2024.md', 'vault://note/');
      expect(path).toBe('Daily/2024.md');
    });
    
    it('should handle root paths for folders', () => {
      const handler = new TestHandler();
      expect(handler.extractPath('vault://folder', 'vault://folder/')).toBe('');
      expect(handler.extractPath('vault://folder/', 'vault://folder/')).toBe('');
    });
  });
  
  describe('getObsidianClient', () => {
    it('should use provided client from server', () => {
      const handler = new TestHandler();
      const mockClient = { test: 'client' };
      const server = { obsidianClient: mockClient };
      
      const client = handler.getObsidianClient(server);
      expect(client).toBe(mockClient);
    });
    
    it('should create new client if not provided', () => {
      const handler = new TestHandler();
      const server = {};
      
      const client = handler.getObsidianClient(server);
      expect(client).toBeDefined();
      expect(client).toHaveProperty('getFileContents');
    });
  });
  
  describe('handleError', () => {
    it('should convert 404 errors to not found messages', () => {
      const handler = new TestHandler();
      const error = { response: { status: 404 } };
      
      expect(() => handler.handleError(error, 'Note', 'test.md'))
        .toThrow('Note not found: test.md');
    });
    
    it('should rethrow non-404 errors', () => {
      const handler = new TestHandler();
      const error = new Error('Something went wrong');
      
      expect(() => handler.handleError(error, 'Note', 'test.md'))
        .toThrow('Something went wrong');
    });
  });
  
  describe('execute', () => {
    it('should call handleRequest and return result', async () => {
      const handler = new TestHandler();
      const result = await handler.execute('vault://test');
      
      expect(result).toEqual({
        contents: [{
          uri: 'vault://test',
          mimeType: 'application/json',
          text: JSON.stringify({ test: 'data' }, null, 2)
        }]
      });
    });
  });
});