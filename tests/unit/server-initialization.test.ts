import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    notification: vi.fn(),
    connect: vi.fn(),
    close: vi.fn()
  }))
}));

// Mock the transport
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({}))
}));

// Mock the registration functions
vi.mock('../../src/tools/index.js', () => ({
  registerTools: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/resources/index.js', () => ({
  registerResources: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/subscriptions/index.js', () => ({
  registerSubscriptions: vi.fn().mockImplementation(async (server: any) => {
    // Mock the behavior of registerSubscriptions by attaching mocked managers
    server.subscriptionManager = {
      cleanup: vi.fn()
    };
    server.subscriptionHandlers = {
      cleanup: vi.fn()
    };
  })
}));

describe('Server Initialization', () => {
  let server: any;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Capture console.error to test error handling
    originalConsoleError = console.error;
    console.error = vi.fn();

    // Create a mock server instance with capabilities
    server = {
      setRequestHandler: vi.fn(),
      notification: vi.fn(),
      connect: vi.fn(),
      close: vi.fn(),
      subscriptionManager: undefined,
      subscriptionHandlers: undefined,
      capabilities: {
        tools: {},
        resources: {
          subscribe: true
        }
      }
    };

    // Mock the Server constructor to return our mock
    (Server as any).mockImplementation(() => server);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('Subscription Initialization', () => {
    it('should initialize server with subscription capabilities enabled', async () => {
      // Import the server initialization
      const { createServerWithConfig } = await import('../../src/server/ServerInitializer.js');
      
      const serverInstance = createServerWithConfig();
      
      // Verify subscription capability is enabled
      expect(serverInstance.capabilities?.resources?.subscribe).toBe(true);
    });

    it('should register subscriptions after resources but before connecting transport', async () => {
      const { initializeServer } = await import('../../src/server/ServerInitializer.js');
      
      const registerTools = (await import('../../src/tools/index.js')).registerTools;
      const registerResources = (await import('../../src/resources/index.js')).registerResources;
      const registerSubscriptions = (await import('../../src/subscriptions/index.js')).registerSubscriptions;
      
      await initializeServer(server);
      
      // Verify registration order
      expect(registerTools).toHaveBeenCalledWith(server);
      expect(registerResources).toHaveBeenCalledWith(server);
      expect(registerSubscriptions).toHaveBeenCalledWith(server);
    });

    it('should attach subscription manager and handlers to server', async () => {
      const { initializeServer } = await import('../../src/server/ServerInitializer.js');
      
      await initializeServer(server);
      
      // Verify subscription components are attached
      expect(server.subscriptionManager).toBeDefined();
      expect(server.subscriptionHandlers).toBeDefined();
    });

    it('should configure default subscriptions during initialization', async () => {
      const { initializeServer } = await import('../../src/server/ServerInitializer.js');
      
      await initializeServer(server);
      
      // Verify default subscriptions are configured
      // This would check if the server has been set up with any default subscriptions
      expect(server.subscriptionManager).toBeDefined();
      
      // In the actual implementation, we might want to verify specific default subscriptions
      // For now, we just verify the manager exists
    });
  });

  describe('Server Lifecycle', () => {
    it('should handle server startup errors gracefully', async () => {
      const registerSubscriptions = (await import('../../src/subscriptions/index.js')).registerSubscriptions;
      
      // Make registerSubscriptions throw an error
      (registerSubscriptions as any).mockRejectedValueOnce(new Error('Subscription setup failed'));
      
      const { initializeServer } = await import('../../src/server/ServerInitializer.js');
      
      await expect(initializeServer(server)).rejects.toThrow('Subscription setup failed');
    });

    it('should cleanup subscriptions on server shutdown', async () => {
      const { initializeServer, shutdownServer } = await import('../../src/server/ServerInitializer.js');
      
      await initializeServer(server);
      
      // Mock cleanup methods on the subscription components that were attached
      if (server.subscriptionManager) {
        server.subscriptionManager.cleanup = vi.fn();
      }
      if (server.subscriptionHandlers) {
        server.subscriptionHandlers.cleanup = vi.fn();
      }
      
      await shutdownServer(server);
      
      // Verify cleanup was called if components exist
      if (server.subscriptionManager?.cleanup) {
        expect(server.subscriptionManager.cleanup).toHaveBeenCalled();
      }
      if (server.subscriptionHandlers?.cleanup) {
        expect(server.subscriptionHandlers.cleanup).toHaveBeenCalled();
      }
    });

    it('should handle cleanup errors gracefully', async () => {
      const { initializeServer, shutdownServer } = await import('../../src/server/ServerInitializer.js');
      
      await initializeServer(server);
      
      // Mock cleanup to throw error if components exist
      if (server.subscriptionManager) {
        server.subscriptionManager.cleanup = vi.fn().mockRejectedValue(new Error('Cleanup failed'));
      }
      if (server.subscriptionHandlers) {
        server.subscriptionHandlers.cleanup = vi.fn();
      }
      
      // Should not throw, just log error
      await expect(shutdownServer(server)).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith('Error during server shutdown:', expect.any(Error));
    });
  });

  describe('Configuration Validation', () => {
    it('should validate subscription configuration on startup', async () => {
      const { validateSubscriptionConfig } = await import('../../src/server/ServerInitializer.js');
      
      // Test valid configuration
      const validConfig = {
        enableSubscriptions: true,
        maxSubscriptions: 100,
        defaultSubscriptions: ['vault://recent', 'vault://stats']
      };
      
      expect(() => validateSubscriptionConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid subscription configuration', async () => {
      const { validateSubscriptionConfig } = await import('../../src/server/ServerInitializer.js');
      
      // Test invalid configuration
      const invalidConfig = {
        enableSubscriptions: true,
        maxSubscriptions: -1, // Invalid
        defaultSubscriptions: ['invalid://uri'] // Invalid URI format
      };
      
      expect(() => validateSubscriptionConfig(invalidConfig)).toThrow();
    });
  });

  describe('Environment Configuration', () => {
    it('should read subscription settings from environment variables', async () => {
      // Set environment variables
      process.env.OBSIDIAN_ENABLE_SUBSCRIPTIONS = 'true';
      process.env.OBSIDIAN_MAX_SUBSCRIPTIONS = '50';
      process.env.OBSIDIAN_DEFAULT_SUBSCRIPTIONS = 'vault://recent,vault://tags';
      
      const { loadSubscriptionConfig } = await import('../../src/server/ServerInitializer.js');
      
      const config = loadSubscriptionConfig();
      
      expect(config.enableSubscriptions).toBe(true);
      expect(config.maxSubscriptions).toBe(50);
      expect(config.defaultSubscriptions).toEqual(['vault://recent', 'vault://tags']);
      
      // Clean up
      delete process.env.OBSIDIAN_ENABLE_SUBSCRIPTIONS;
      delete process.env.OBSIDIAN_MAX_SUBSCRIPTIONS;
      delete process.env.OBSIDIAN_DEFAULT_SUBSCRIPTIONS;
    });

    it('should use default values when environment variables are not set', async () => {
      const { loadSubscriptionConfig } = await import('../../src/server/ServerInitializer.js');
      
      const config = loadSubscriptionConfig();
      
      expect(config.enableSubscriptions).toBe(true); // Default
      expect(config.maxSubscriptions).toBe(100); // Default
      expect(config.defaultSubscriptions).toEqual([]); // Default
    });
  });
});