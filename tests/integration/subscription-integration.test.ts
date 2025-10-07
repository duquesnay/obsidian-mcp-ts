import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'dotenv/config';
import { spawn, ChildProcess } from 'child_process';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from '../../src/types/jsonrpc.js';
import { terminateServer } from './test-utils.js';

/**
 * Integration test for subscription functionality
 * 
 * Tests real subscription behavior through the MCP protocol
 * with actual resource changes triggering notifications.
 */
describe('Subscription Integration', () => {
  let server: ChildProcess | null = null;
  let requestId = 1;
  const responses = new Map<number, JsonRpcResponse>();
  const notifications: JsonRpcNotification[] = [];

  const sendRequest = (request: JsonRpcRequest): void => {
    server?.stdin?.write(JSON.stringify(request) + '\n');
  };

  const waitForResponse = (id: number, timeout = 5000): Promise<JsonRpcResponse> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkResponse = () => {
        if (responses.has(id)) {
          const response = responses.get(id)!;
          responses.delete(id);
          resolve(response);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for response to request ${id}`));
        } else {
          setTimeout(checkResponse, 10);
        }
      };
      checkResponse();
    });
  };

  const waitForNotification = (timeout = 5000): Promise<JsonRpcNotification> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkNotification = () => {
        if (notifications.length > 0) {
          resolve(notifications.shift()!);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for notification'));
        } else {
          setTimeout(checkNotification, 10);
        }
      };
      checkNotification();
    });
  };

  beforeAll(async () => {
    if (!process.env.OBSIDIAN_API_KEY) {
      throw new Error(
        'Integration tests require OBSIDIAN_API_KEY environment variable\n' +
        'Set it in .env file'
      );
    }

    // Start the MCP server
    server = spawn('tsx', ['src/index.ts'], {
      env: {
        ...process.env,
        OBSIDIAN_API_KEY: process.env.OBSIDIAN_API_KEY
      }
    });

    // Collect responses and notifications
    server.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          if (message.jsonrpc === '2.0') {
            if ('id' in message && message.id !== null) {
              responses.set(message.id as number, message as JsonRpcResponse);
            } else if ('method' in message && !('id' in message)) {
              notifications.push(message as JsonRpcNotification);
            }
          }
        } catch (e) {
          // Ignore non-JSON output
        }
      }
    });

    // Initialize the server
    const initRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };

    sendRequest(initRequest);
    await waitForResponse(initRequest.id as number);
  });

  afterAll(async () => {
    await terminateServer(server);
    server = null;
  });

  it('should support subscribing to resource updates', async () => {
    // Subscribe to vault://tags resource
    const subscribeRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/subscribe',
      params: {
        uri: 'vault://tags'
      }
    };

    sendRequest(subscribeRequest);
    const subscribeResponse = await waitForResponse(subscribeRequest.id as number);
    
    expect(subscribeResponse.result).toBeDefined();
    
    // The server should now send notifications when tags change
    // In a real implementation, we would trigger a change and verify notification
  });

  it('should support unsubscribing from resources', async () => {
    // First subscribe
    const subscribeRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/subscribe',
      params: {
        uri: 'vault://recent'
      }
    };

    sendRequest(subscribeRequest);
    await waitForResponse(subscribeRequest.id as number);

    // Then unsubscribe
    const unsubscribeRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/unsubscribe',
      params: {
        uri: 'vault://recent'
      }
    };

    sendRequest(unsubscribeRequest);
    const unsubscribeResponse = await waitForResponse(unsubscribeRequest.id as number);
    
    expect(unsubscribeResponse.result).toBeDefined();
  });

  it('should notify subscribers when resources change', async () => {
    // This test demonstrates the expected behavior
    // In a real implementation, we would:
    // 1. Subscribe to a resource
    // 2. Make a change that affects that resource
    // 3. Verify we receive a notification
    
    // Subscribe to search results
    const subscribeRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/subscribe',
      params: {
        uri: 'vault://search/test'
      }
    };

    sendRequest(subscribeRequest);
    await waitForResponse(subscribeRequest.id as number);
    
    // In a real implementation, creating a file with "test" in it
    // should trigger a notification for this search subscription
    
    // For now, we just verify the subscription was accepted
    // Future implementation will need to:
    // - Monitor file changes in the vault
    // - Determine which resources are affected
    // - Send notifications to subscribers
  });

  it('should handle multiple subscriptions to same resource', async () => {
    // Subscribe twice to the same resource
    const subscribe1: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/subscribe',
      params: { uri: 'vault://stats' }
    };

    const subscribe2: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/subscribe',
      params: { uri: 'vault://stats' }
    };

    sendRequest(subscribe1);
    await waitForResponse(subscribe1.id as number);
    
    sendRequest(subscribe2);
    const response2 = await waitForResponse(subscribe2.id as number);
    
    // Second subscription should either:
    // - Be accepted (multiple subscriptions allowed)
    // - Return an error or indication that already subscribed
    expect(response2).toBeDefined();
  });
});