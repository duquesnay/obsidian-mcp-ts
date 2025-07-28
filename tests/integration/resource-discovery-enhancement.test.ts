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
 * Integration tests for Resource Discovery Enhancement
 * 
 * These tests verify that all resources mentioned in tool descriptions
 * are properly implemented and functional through the MCP protocol.
 * 
 * Tests cover:
 * - vault://note/{path} (mentioned in GetFileContentsTool)
 * - vault://search/{query} (mentioned in SimpleSearchTool)
 * - vault://structure (mentioned in ListFilesInVaultTool)
 * - vault://folder/{path} (mentioned in ListFilesInDirTool)
 */
describe('Resource Discovery Enhancement Integration Tests', () => {
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
    console.log('🚀 Starting MCP server for resource discovery enhancement testing...');
    
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
          // Ignore non-JSON output
        }
      }
    });

    server.stderr?.on('data', (data: Buffer) => {
      console.error('Server error:', data.toString());
    });

    // Initialize the server
    if (!initialized) {
      const initRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      sendRequest(initRequest);
      
      const initResponse = await waitForResponse(initRequest.id);
      expect(initResponse.result).toBeDefined();
      expect(initResponse.error).toBeUndefined();
      
      initialized = true;
    }
  });

  afterAll(() => {
    if (server) {
      server.kill();
      server = null;
    }
  });

  describe('Tool descriptions mention resources', () => {
    it('should list tools with resource mentions in descriptions', async () => {
      const toolsRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'tools/list',
        params: {}
      };

      sendRequest(toolsRequest);
      const toolsResponse = await waitForResponse(toolsRequest.id);
      
      expect(toolsResponse.result).toBeDefined();
      expect(toolsResponse.result.tools).toBeDefined();
      
      const tools = toolsResponse.result.tools;
      
      // Check GetFileContentsTool mentions vault://note/{path}
      const getFileContentsTool = tools.find((t: any) => t.name === 'obsidian_get_file_contents');
      expect(getFileContentsTool).toBeDefined();
      expect(getFileContentsTool.description).toContain('vault://note/{path}');
      expect(getFileContentsTool.description).toMatch(/2\s*minute\s*cache/i);
      
      // Check SimpleSearchTool mentions vault://search/{query}
      const simpleSearchTool = tools.find((t: any) => t.name === 'obsidian_simple_search');
      expect(simpleSearchTool).toBeDefined();
      expect(simpleSearchTool.description).toContain('vault://search/{query}');
      expect(simpleSearchTool.description).toMatch(/1\s*minute\s*cache/i);
      
      // Check ListFilesInVaultTool mentions vault://structure
      const listFilesInVaultTool = tools.find((t: any) => t.name === 'obsidian_list_files_in_vault');
      expect(listFilesInVaultTool).toBeDefined();
      expect(listFilesInVaultTool.description).toContain('vault://structure');
      expect(listFilesInVaultTool.description).toMatch(/5\s*minute\s*cache/i);
      
      // Check ListFilesInDirTool mentions vault://folder/{path}
      const listFilesInDirTool = tools.find((t: any) => t.name === 'obsidian_list_files_in_dir');
      expect(listFilesInDirTool).toBeDefined();
      expect(listFilesInDirTool.description).toContain('vault://folder/{path}');
      expect(listFilesInDirTool.description).toMatch(/2\s*minute\s*cache/i);
    });
  });

  describe('Resource availability', () => {
    it('should list all resources mentioned in tool descriptions', async () => {
      const resourcesRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/list',
        params: {}
      };

      sendRequest(resourcesRequest);
      const resourcesResponse = await waitForResponse(resourcesRequest.id);
      
      expect(resourcesResponse.result).toBeDefined();
      expect(resourcesResponse.result.resources).toBeDefined();
      
      const resources = resourcesResponse.result.resources;
      const resourceUris = resources.map((r: any) => r.uri);
      
      // Check static resources exist
      expect(resourceUris).toContain('vault://structure');
      expect(resourceUris).toContain('vault://search/{query}');
      
      // Dynamic resources like vault://note/{path} and vault://folder/{path}
      // won't appear in the list but should be in templates
    });
    
    it('should list resource templates for dynamic resources', async () => {
      const templatesRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/templates/list',
        params: {}
      };

      sendRequest(templatesRequest);
      const templatesResponse = await waitForResponse(templatesRequest.id);
      
      expect(templatesResponse.result).toBeDefined();
      expect(templatesResponse.result.resourceTemplates).toBeDefined();
      
      const templates = templatesResponse.result.resourceTemplates;
      const templateUris = templates.map((t: any) => t.uriTemplate);
      
      // Check all mentioned dynamic resources are in templates
      expect(templateUris).toContain('vault://note/{path}');
      expect(templateUris).toContain('vault://folder/{path}');
    });
  });

  describe('Resource functionality', () => {
    it('should read vault://structure resource successfully', async () => {
      const readRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: { uri: 'vault://structure' }
      };

      sendRequest(readRequest);
      const readResponse = await waitForResponse(readRequest.id);
      
      expect(readResponse.result).toBeDefined();
      expect(readResponse.error).toBeUndefined();
      
      const content = readResponse.result.contents[0];
      expect(content.uri).toBe('vault://structure');
      expect(content.mimeType).toBe('application/json');
      
      const data = JSON.parse(content.text);
      expect(data).toHaveProperty('structure');
      expect(typeof data.structure).toBe('object');
      expect(data.structure).toHaveProperty('files');
      expect(data.structure).toHaveProperty('folders');
    });

    it('should read vault://search/{query} resource with sample query', async () => {
      const readRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: { uri: 'vault://search/test' }
      };

      sendRequest(readRequest);
      const readResponse = await waitForResponse(readRequest.id);
      
      expect(readResponse.result).toBeDefined();
      expect(readResponse.error).toBeUndefined();
      
      const content = readResponse.result.contents[0];
      expect(content.uri).toBe('vault://search/test');
      expect(content.mimeType).toBe('application/json');
      
      const data = JSON.parse(content.text);
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should read vault://note/{path} resource for existing note', async () => {
      // First, let's list files to find an existing note
      const listRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'tools/call',
        params: {
          name: 'obsidian_list_files_in_vault',
          arguments: { limit: 10 }
        }
      };

      sendRequest(listRequest);
      const listResponse = await waitForResponse(listRequest.id);
      
      const listResult = JSON.parse(listResponse.result.content[0].text);
      const files = listResult.files || [];
      const noteFile = files.find((f: any) => f.type === 'file' && f.path.endsWith('.md'));
      
      if (noteFile) {
        const readRequest: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: requestId++,
          method: 'resources/read',
          params: { uri: `vault://note/${noteFile.path}` }
        };

        sendRequest(readRequest);
        const readResponse = await waitForResponse(readRequest.id);
        
        expect(readResponse.result).toBeDefined();
        expect(readResponse.error).toBeUndefined();
        
        const content = readResponse.result.contents[0];
        expect(content.uri).toBe(`vault://note/${noteFile.path}`);
        expect(content.mimeType).toBe('text/markdown');
      }
    });

    it('should read vault://folder/{path} resource for existing folder', async () => {
      // First, let's list files to find an existing folder
      const listRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'tools/call',
        params: {
          name: 'obsidian_list_files_in_vault',
          arguments: { limit: 20 }
        }
      };

      sendRequest(listRequest);
      const listResponse = await waitForResponse(listRequest.id);
      
      const listResult = JSON.parse(listResponse.result.content[0].text);
      const files = listResult.files || [];
      const folder = files.find((f: any) => f.type === 'folder');
      
      if (folder) {
        const readRequest: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: requestId++,
          method: 'resources/read',
          params: { uri: `vault://folder/${folder.path}` }
        };

        sendRequest(readRequest);
        const readResponse = await waitForResponse(readRequest.id);
        
        expect(readResponse.result).toBeDefined();
        expect(readResponse.error).toBeUndefined();
        
        const content = readResponse.result.contents[0];
        expect(content.uri).toBe(`vault://folder/${folder.path}`);
        expect(content.mimeType).toBe('application/json');
        
        const data = JSON.parse(content.text);
        expect(data).toHaveProperty('files');
        expect(Array.isArray(data.files)).toBe(true);
      }
    });
  });

  describe('Cache behavior verification', () => {
    it('should demonstrate caching for vault://structure resource', async () => {
      // First read
      const firstReadRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: { uri: 'vault://structure' }
      };

      const startTime1 = Date.now();
      sendRequest(firstReadRequest);
      const firstResponse = await waitForResponse(firstReadRequest.id);
      const duration1 = Date.now() - startTime1;
      
      expect(firstResponse.result).toBeDefined();
      
      // Second read (should be cached)
      const secondReadRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'resources/read',
        params: { uri: 'vault://structure' }
      };

      const startTime2 = Date.now();
      sendRequest(secondReadRequest);
      const secondResponse = await waitForResponse(secondReadRequest.id);
      const duration2 = Date.now() - startTime2;
      
      expect(secondResponse.result).toBeDefined();
      
      // Second read should be faster due to caching
      console.log(`First read: ${duration1}ms, Second read: ${duration2}ms`);
      
      // Verify both responses have the same content
      const content1 = firstResponse.result.contents[0].text;
      const content2 = secondResponse.result.contents[0].text;
      expect(content1).toBe(content2);
    });
  });
});