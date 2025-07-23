import { describe, it, expect, vi } from 'vitest';
import { ListResourcesRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerResources } from '../../src/resources/index.js';

describe('MCP Resources', () => {
  describe('registerResources', () => {
    it('should register ListResources handler that returns empty array', async () => {
      // Create a mock server
      const mockServer = {
        setRequestHandler: vi.fn()
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Verify handler was registered with ListResourcesRequestSchema
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        ListResourcesRequestSchema,
        expect.any(Function)
      );
      
      // Get the handler and test it
      const handler = mockServer.setRequestHandler.mock.calls[0][1];
      const result = await handler({ method: 'resources/list' });
      
      expect(result).toEqual({ resources: [] });
    });
  });
});