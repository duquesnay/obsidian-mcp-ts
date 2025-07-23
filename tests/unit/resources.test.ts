import { describe, it, expect, vi } from 'vitest';
import { ListResourcesRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerResources } from '../../src/resources/index.js';

describe('MCP Resources', () => {
  describe('registerResources', () => {
    it('should register ListResources handler that returns hardcoded tags resource', async () => {
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
      
      // Should return the hardcoded tags resource
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0]).toEqual({
        uri: 'vault://tags',
        name: 'Vault Tags',
        description: 'All tags in the vault with usage counts',
        mimeType: 'application/json'
      });
    });
  });
});