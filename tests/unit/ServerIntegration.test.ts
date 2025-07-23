import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerSubscriptions } from '../../src/subscriptions/registerSubscriptions.js';

// Mock the Server
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    sendNotification: vi.fn()
  }))
}));

describe('Server Integration', () => {
  let server: Server;

  beforeEach(() => {
    server = new Server({} as any, {} as any);
  });

  describe('registerSubscriptions', () => {
    it('should register subscription handlers with the server', async () => {
      await registerSubscriptions(server);

      // Verify that subscription handlers were registered
      expect(server.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    it('should attach subscription manager and handlers to the server', async () => {
      const serverWithSubs = server as any;
      await registerSubscriptions(serverWithSubs);
      
      // Check that manager and handlers were attached
      expect(serverWithSubs.subscriptionManager).toBeDefined();
      expect(serverWithSubs.subscriptionHandlers).toBeDefined();
    });
  });
});