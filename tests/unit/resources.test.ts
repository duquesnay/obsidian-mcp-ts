import { describe, it, expect, vi } from 'vitest';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerResources } from '../../src/resources/index.js';

describe('MCP Resources', () => {
  describe('registerResources', () => {
    it('should register ListResources handler that returns hardcoded tags and stats resources', async () => {
      // Create a mock server
      const mockServer = {
        setRequestHandler: vi.fn()
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ListResources handler
      const listHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ListResourcesRequestSchema)?.[1];
      
      const result = await listHandler({ method: 'resources/list' });
      
      // Should return both hardcoded resources
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({
        uri: 'vault://tags',
        name: 'Vault Tags',
        description: 'All tags in the vault with usage counts',
        mimeType: 'application/json'
      });
      expect(result.resources[1]).toEqual({
        uri: 'vault://stats',
        name: 'Vault Statistics',
        description: 'File and note counts for the vault',
        mimeType: 'application/json'
      });
    });

    it('should register ReadResource handler for vault://tags', async () => {
      // Create a mock server
      const mockServer = {
        setRequestHandler: vi.fn()
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Verify ReadResourceRequestSchema handler was registered
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        ReadResourceRequestSchema,
        expect.any(Function)
      );
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      expect(readHandler).toBeDefined();
      
      // Test reading the tags resource
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://tags' }
      });
      
      // Should return hardcoded tags data
      expect(result.contents).toBeDefined();
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://tags',
        mimeType: 'application/json',
        text: expect.stringContaining('tags')
      });
    });

    it('should register ReadResource handler for vault://stats', async () => {
      // Create a mock server
      const mockServer = {
        setRequestHandler: vi.fn()
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      expect(readHandler).toBeDefined();
      
      // Test reading the stats resource
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://stats' }
      });
      
      // Should return hardcoded stats data
      expect(result.contents).toBeDefined();
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://stats',
        mimeType: 'application/json',
        text: expect.stringContaining('fileCount')
      });
      
      // Verify the content structure
      const content = JSON.parse(result.contents[0].text);
      expect(content).toHaveProperty('fileCount');
      expect(content).toHaveProperty('noteCount');
      expect(content.fileCount).toBe(42);
      expect(content.noteCount).toBe(35);
    });
  });
});