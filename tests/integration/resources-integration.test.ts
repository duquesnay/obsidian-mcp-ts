import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '../../dist/index.js');

// Load environment variables
config({ path: join(__dirname, '../../.env') });

interface JsonRpcRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: any;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Integration tests for MCP Resources functionality
 * 
 * These tests verify the full MCP protocol flow:
 * 1. Initialize the server
 * 2. List available resources
 * 3. Read resource contents
 * 
 * Tests use the actual MCP server, not mocks.
 */
describe('MCP Resources Integration Tests', () => {
  let server: ChildProcess | null = null;
  let requestId = 1;
  const responses = new Map<number, JsonRpcResponse>();
  let initialized = false;

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
          setTimeout(checkResponse, 50);
        }
      };
      
      checkResponse();
    });
  };

  beforeAll(async () => {
    console.log('🚀 Starting MCP server for resources integration testing...');
    
    server = spawn('node', [serverPath], {
      stdio: 'pipe',
      env: {
        ...process.env,
        OBSIDIAN_API_KEY: process.env.OBSIDIAN_API_KEY || 'test-key',
        OBSIDIAN_HOST: process.env.OBSIDIAN_HOST || '127.0.0.1'
      }
    });

    let buffer = '';
    
    server.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const response: JsonRpcResponse = JSON.parse(line);
          if (response.id) {
            responses.set(response.id, response);
          }
        } catch (e) {
          // Log non-JSON output for debugging if needed
          if (process.env.DEBUG) {
            console.log('Non-JSON output:', line);
          }
        }
      }
    });

    server.stderr?.on('data', (data: Buffer) => {
      console.error('Server error:', data.toString());
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
          name: 'resources-integration-test',
          version: '1.0.0'
        }
      }
    };

    sendRequest(initRequest);
    
    const initResponse = await waitForResponse(initRequest.id);
    if (initResponse.error) {
      throw new Error(`Initialization failed: ${initResponse.error.message}`);
    }
    
    initialized = true;
    console.log('✅ Server initialized successfully');
  });

  afterAll(async () => {
    console.log('🛑 Shutting down test server...');
    if (server) {
      server.kill();
      server = null;
    }
  });

  describe('resources/list', () => {
    it('should list available resources including vault://tags and vault://stats', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/list',
        params: {}
      };

      sendRequest(request);
      const response = await waitForResponse(request.id);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.resources).toBeDefined();
      expect(Array.isArray(response.result.resources)).toBe(true);

      // Find the tags resource
      const tagsResource = response.result.resources.find(
        (r: any) => r.uri === 'vault://tags'
      );

      expect(tagsResource).toBeDefined();
      expect(tagsResource).toEqual({
        uri: 'vault://tags',
        name: 'Vault Tags',
        description: 'All tags in the vault with usage counts',
        mimeType: 'application/json'
      });

      // Find the stats resource
      const statsResource = response.result.resources.find(
        (r: any) => r.uri === 'vault://stats'
      );

      expect(statsResource).toBeDefined();
      expect(statsResource).toEqual({
        uri: 'vault://stats',
        name: 'Vault Statistics',
        description: 'File and note counts for the vault',
        mimeType: 'application/json'
      });

      // Find the recent resource
      const recentResource = response.result.resources.find(
        (r: any) => r.uri === 'vault://recent'
      );

      expect(recentResource).toBeDefined();
      expect(recentResource).toEqual({
        uri: 'vault://recent',
        name: 'Recent Changes',
        description: 'Recently modified notes in the vault',
        mimeType: 'application/json'
      });
    });

    it('should handle resources/list with empty params object', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/list',
        params: {} // Testing with empty params object
      };

      sendRequest(request);
      const response = await waitForResponse(request.id);

      // Should still work with empty params
      expect(response.error).toBeUndefined();
      expect(response.result?.resources).toBeDefined();
      expect(response.result.resources).toHaveLength(3);
    });
  });

  describe('resources/read', () => {
    it('should read vault://tags resource and return JSON content', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: {
          uri: 'vault://tags'
        }
      };

      sendRequest(request);
      const response = await waitForResponse(request.id);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.contents).toBeDefined();
      expect(Array.isArray(response.result.contents)).toBe(true);
      expect(response.result.contents).toHaveLength(1);

      const content = response.result.contents[0];
      expect(content.uri).toBe('vault://tags');
      expect(content.mimeType).toBe('application/json');
      expect(content.text).toBeDefined();

      // Parse and verify the JSON content
      const parsedContent = JSON.parse(content.text);
      expect(parsedContent.tags).toBeDefined();
      expect(Array.isArray(parsedContent.tags)).toBe(true);
      expect(parsedContent.tags).toHaveLength(3);

      // Verify the hardcoded tags
      expect(parsedContent.tags).toContainEqual({ name: '#project', count: 10 });
      expect(parsedContent.tags).toContainEqual({ name: '#meeting', count: 5 });
      expect(parsedContent.tags).toContainEqual({ name: '#idea', count: 15 });
    });

    it('should read vault://stats resource and return file/note counts', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: {
          uri: 'vault://stats'
        }
      };

      sendRequest(request);
      const response = await waitForResponse(request.id);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.contents).toBeDefined();
      expect(Array.isArray(response.result.contents)).toBe(true);
      expect(response.result.contents).toHaveLength(1);

      const content = response.result.contents[0];
      expect(content.uri).toBe('vault://stats');
      expect(content.mimeType).toBe('application/json');
      expect(content.text).toBeDefined();

      // Parse and verify the JSON content
      const parsedContent = JSON.parse(content.text);
      expect(parsedContent.fileCount).toBeDefined();
      expect(parsedContent.noteCount).toBeDefined();
      expect(typeof parsedContent.fileCount).toBe('number');
      expect(typeof parsedContent.noteCount).toBe('number');
      expect(parsedContent.fileCount).toBeGreaterThanOrEqual(0);
      expect(parsedContent.noteCount).toBeGreaterThanOrEqual(0);
    });

    it('should read vault://recent resource and return recently modified notes', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: {
          uri: 'vault://recent'
        }
      };

      sendRequest(request);
      const response = await waitForResponse(request.id);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.contents).toBeDefined();
      expect(Array.isArray(response.result.contents)).toBe(true);
      expect(response.result.contents).toHaveLength(1);

      const content = response.result.contents[0];
      expect(content.uri).toBe('vault://recent');
      expect(content.mimeType).toBe('application/json');
      expect(content.text).toBeDefined();

      // Parse and verify the JSON content
      const parsedContent = JSON.parse(content.text);
      expect(parsedContent.notes).toBeDefined();
      expect(Array.isArray(parsedContent.notes)).toBe(true);
      
      // Should return up to 10 recent notes
      expect(parsedContent.notes.length).toBeLessThanOrEqual(10);
      
      // Each note should have path and modifiedAt
      parsedContent.notes.forEach((note: any) => {
        expect(note.path).toBeDefined();
        expect(typeof note.path).toBe('string');
        expect(note.modifiedAt).toBeDefined();
        expect(typeof note.modifiedAt).toBe('string');
        // Verify it's a valid ISO date string
        expect(new Date(note.modifiedAt).toISOString()).toBe(note.modifiedAt);
      });
    });

    it('should return error for non-existent resource', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: {
          uri: 'vault://non-existent'
        }
      };

      sendRequest(request);
      const response = await waitForResponse(request.id);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Resource not found');
      expect(response.error?.message).toContain('vault://non-existent');
    });

    it('should handle missing uri parameter', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: {} // Missing uri
      };

      sendRequest(request);
      const response = await waitForResponse(request.id);

      // Should return an error for missing required parameter
      expect(response.error).toBeDefined();
    });
  });

  describe('Full protocol flow', () => {
    it('should complete the full MCP resources flow: initialize → list → read', async () => {
      // We already initialized in beforeAll, so let's verify the full flow

      // Step 1: List resources
      const listRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/list',
        params: {}
      };

      sendRequest(listRequest);
      const listResponse = await waitForResponse(listRequest.id);

      expect(listResponse.error).toBeUndefined();
      const resources = listResponse.result?.resources || [];
      expect(resources.length).toBeGreaterThan(0);

      // Step 2: Read the first available resource
      const firstResource = resources[0];
      expect(firstResource.uri).toBe('vault://tags');

      const readRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: {
          uri: firstResource.uri
        }
      };

      sendRequest(readRequest);
      const readResponse = await waitForResponse(readRequest.id);

      expect(readResponse.error).toBeUndefined();
      expect(readResponse.result?.contents).toBeDefined();
      expect(readResponse.result.contents[0].uri).toBe(firstResource.uri);
      expect(readResponse.result.contents[0].mimeType).toBe(firstResource.mimeType);

      // Verify we can parse the content
      const content = JSON.parse(readResponse.result.contents[0].text);
      expect(content).toBeDefined();
      expect(content.tags).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON-RPC requests gracefully', async () => {
      // Send a request with invalid method name format
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'invalid/method/name', // Invalid method
        params: {}
      };

      sendRequest(request);
      const response = await waitForResponse(request.id);

      // Should return an error
      expect(response.error).toBeDefined();
    });

    it('should handle requests with wrong JSON-RPC version', async () => {
      const request = {
        jsonrpc: '1.0', // Wrong version
        id: requestId++,
        method: 'resources/list',
        params: {}
      };

      sendRequest(request as any);
      
      // Server might reject or handle differently
      // This test ensures the server doesn't crash
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Server should still be responsive
      const validRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/list',
        params: {}
      };

      sendRequest(validRequest);
      const response = await waitForResponse(validRequest.id);
      expect(response.result).toBeDefined();
    });
  });
});