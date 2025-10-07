import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'dotenv/config';
import { spawn, ChildProcess } from 'child_process';
import { JsonRpcRequest, JsonRpcResponse } from '../../src/types/jsonrpc.js';
import { terminateServer } from './test-utils.js';

/**
 * Integration test for vault structure resource
 * 
 * Tests the actual vault://structure resource through the MCP protocol
 * with a real Obsidian vault connection.
 */
describe('Vault Structure Resource Integration', () => {
  let server: ChildProcess | null = null;
  let requestId = 1;
  const responses = new Map<number, JsonRpcResponse>();

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

    // Collect responses
    server.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const response = JSON.parse(line) as JsonRpcResponse;
          if ('id' in response && response.id !== null) {
            responses.set(response.id as number, response);
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

  it('should read vault structure with real folder hierarchy', async () => {
    // List resources to verify vault://structure exists
    const listRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/list',
      params: {}
    };

    sendRequest(listRequest);
    const listResponse = await waitForResponse(listRequest.id as number);
    
    expect(listResponse.result).toBeDefined();
    const resources = (listResponse.result as any).resources;
    const structureResource = resources.find((r: any) => r.uri === 'vault://structure');
    expect(structureResource).toBeDefined();
    expect(structureResource.name).toBe('Vault Structure');

    // Read the vault structure
    const readRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/read',
      params: { uri: 'vault://structure' }
    };

    sendRequest(readRequest);
    const readResponse = await waitForResponse(readRequest.id as number);

    expect(readResponse.result).toBeDefined();
    const result = readResponse.result as any;
    expect(result.contents).toBeDefined();
    expect(result.contents.length).toBeGreaterThan(0);

    // Parse the structure
    const content = result.contents[0];
    expect(content.mimeType).toBe('application/json');
    
    const data = JSON.parse(content.text);
    
    // VaultStructureHandler returns an object with structure, totalFiles, totalFolders
    expect(data).toHaveProperty('structure');
    expect(data).toHaveProperty('totalFiles');
    expect(data).toHaveProperty('totalFolders');
    expect(typeof data.totalFiles).toBe('number');
    expect(typeof data.totalFolders).toBe('number');
    expect(data.totalFiles).toBeGreaterThan(0);
    
    const structure = data.structure;
    
    // The structure is a FolderStructure: { files: string[], folders: {...} }
    expect(structure).toHaveProperty('files');
    expect(structure).toHaveProperty('folders');
    expect(Array.isArray(structure.files)).toBe(true);
    expect(typeof structure.folders).toBe('object');
    
    // Should have at least some folders or files
    const hasFolders = Object.keys(structure.folders).length > 0;
    const hasFiles = structure.files.length > 0;
    expect(hasFolders || hasFiles).toBe(true);
    
    // Check that folders have correct properties
    Object.entries(structure.folders).forEach(([folderName, folder]: [string, any]) => {
      expect(typeof folderName).toBe('string');
      expect(folder).toHaveProperty('files');
      expect(folder).toHaveProperty('folders');
      expect(Array.isArray(folder.files)).toBe(true);
      expect(typeof folder.folders).toBe('object');
    });
  });

  it('should handle summary mode for large vaults', async () => {
    const readRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'resources/read',
      params: { uri: 'vault://structure?mode=summary' }
    };

    sendRequest(readRequest);
    const readResponse = await waitForResponse(readRequest.id as number);

    // Debug the response if it fails
    if (!readResponse.result) {
      console.error('Summary mode response error:', readResponse);
    }
    
    expect(readResponse.result).toBeDefined();
    const result = readResponse.result as any;
    const data = JSON.parse(result.contents[0].text);
    
    // Verify summary mode response
    expect(data.mode).toBe('summary');
    expect(data.message).toContain('Use ?mode=full for complete structure');
    
    // In summary mode, the structure should be simplified
    const structure = data.structure;
    expect(structure.folders['...']).toBeDefined();
    expect(structure.folders['...'].files[0]).toMatch(/\d+ files in vault/);
  });
});