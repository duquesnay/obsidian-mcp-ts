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
      
      // Should return all resources including dynamic note, folder, daily note and tag notes templates
      expect(result.resources).toHaveLength(7);
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
      expect(result.resources[2]).toEqual({
        uri: 'vault://recent',
        name: 'Recent Changes',
        description: 'Recently modified notes in the vault',
        mimeType: 'application/json'
      });
      expect(result.resources[3]).toEqual({
        uri: 'vault://note/{path}',
        name: 'Note',
        description: 'Individual note by path (e.g., vault://note/Daily/2024-01-01.md)',
        mimeType: 'text/markdown'
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

    it('should register ReadResource handler for vault://recent', async () => {
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
      
      // Test reading the recent resource
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://recent' }
      });
      
      // Should return recent notes data
      expect(result.contents).toBeDefined();
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://recent',
        mimeType: 'application/json',
        text: expect.stringContaining('notes')
      });
      
      // Verify the content structure
      const content = JSON.parse(result.contents[0].text);
      expect(content).toHaveProperty('notes');
      expect(Array.isArray(content.notes)).toBe(true);
      expect(content.notes.length).toBe(10);
      
      // Check each note has required fields
      content.notes.forEach((note: any) => {
        expect(note).toHaveProperty('path');
        expect(note).toHaveProperty('modifiedAt');
        expect(typeof note.path).toBe('string');
        expect(typeof note.modifiedAt).toBe('string');
      });
    });

    it('should throw error for unknown resource URI', async () => {
      // Create a mock server
      const mockServer = {
        setRequestHandler: vi.fn()
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      // Test reading an unknown resource
      await expect(readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://unknown' }
      })).rejects.toThrow('Resource not found: vault://unknown');
    });
  });

  describe('Dynamic folder resources', () => {
    it('should list folder contents by path', async () => {
      // Create a mock server with ObsidianClient
      const mockListFilesInDir = vi.fn().mockResolvedValue([
        'Note1.md',
        'Note2.md',
        'Subfolder',
        'Document.pdf'
      ]);
      const mockServer = {
        setRequestHandler: vi.fn(),
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      // Test reading a folder
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://folder/Projects/Work' }
      });
      
      // Should call obsidianClient with the correct path
      expect(mockListFilesInDir).toHaveBeenCalledWith('Projects/Work');
      
      // Should return the folder contents
      expect(result.contents).toBeDefined();
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://folder/Projects/Work',
        mimeType: 'application/json',
        text: expect.any(String)
      });
      
      // Verify the content structure
      const content = JSON.parse(result.contents[0].text);
      expect(content).toHaveProperty('path', 'Projects/Work');
      expect(content).toHaveProperty('items');
      expect(Array.isArray(content.items)).toBe(true);
      expect(content.items).toHaveLength(4);
      expect(content.items).toContain('Note1.md');
      expect(content.items).toContain('Subfolder');
    });

    it('should handle root folder (vault://folder/)', async () => {
      // Create a mock server with ObsidianClient
      const mockListFilesInDir = vi.fn().mockResolvedValue([
        'Projects',
        'Archive',
        'README.md'
      ]);
      const mockServer = {
        setRequestHandler: vi.fn(),
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      // Test reading root folder
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://folder/' }
      });
      
      // Should call obsidianClient with empty string for root
      expect(mockListFilesInDir).toHaveBeenCalledWith('');
      
      // Should return the folder contents
      const content = JSON.parse(result.contents[0].text);
      expect(content.path).toBe('');
      expect(content.items).toHaveLength(3);
    });

    it('should handle root folder without trailing slash', async () => {
      // Create a mock server with ObsidianClient
      const mockListFilesInDir = vi.fn().mockResolvedValue([
        'Projects',
        'Archive',
        'README.md'
      ]);
      const mockServer = {
        setRequestHandler: vi.fn(),
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      // Test reading root folder without trailing slash
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://folder' }
      });
      
      // Should call obsidianClient with empty string for root
      expect(mockListFilesInDir).toHaveBeenCalledWith('');
      
      // Should return the folder contents
      const content = JSON.parse(result.contents[0].text);
      expect(content.path).toBe('');
      expect(content.items).toHaveLength(3);
    });

    it('should handle missing folders gracefully', async () => {
      // Create a mock server with ObsidianClient that throws 404
      const mockListFilesInDir = vi.fn().mockRejectedValue({
        response: { status: 404 },
        message: 'Folder not found'
      });
      const mockServer = {
        setRequestHandler: vi.fn(),
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      // Test reading a missing folder
      await expect(readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://folder/NonExistent/Folder' }
      })).rejects.toThrow('Folder not found: NonExistent/Folder');
      
      // Should have tried to list the folder
      expect(mockListFilesInDir).toHaveBeenCalledWith('NonExistent/Folder');
    });

    it('should include dynamic folder resources in list with placeholder', async () => {
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
      
      // Should include a placeholder for folders
      expect(result.resources).toContainEqual({
        uri: 'vault://folder/{path}',
        name: 'Folder',
        description: 'Browse folder contents (e.g., vault://folder/Projects)',
        mimeType: 'application/json'
      });
    });
  });

  describe('Dynamic note resources', () => {
    it('should read individual note by path', async () => {
      // Create a mock server with ObsidianClient
      const mockGetFileContents = vi.fn().mockResolvedValue('# Test Note\n\nThis is the content.');
      const mockServer = {
        setRequestHandler: vi.fn(),
        obsidianClient: {
          getFileContents: mockGetFileContents
        }
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      // Test reading a note
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://note/Daily/2024-01-01.md' }
      });
      
      // Should call obsidianClient with the correct path
      expect(mockGetFileContents).toHaveBeenCalledWith('Daily/2024-01-01.md');
      
      // Should return the note content
      expect(result.contents).toBeDefined();
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://note/Daily/2024-01-01.md',
        mimeType: 'text/markdown',
        text: '# Test Note\n\nThis is the content.'
      });
    });

    it('should handle missing notes gracefully', async () => {
      // Create a mock server with ObsidianClient that throws 404
      const mockGetFileContents = vi.fn().mockRejectedValue({
        response: { status: 404 },
        message: 'File not found'
      });
      const mockServer = {
        setRequestHandler: vi.fn(),
        obsidianClient: {
          getFileContents: mockGetFileContents
        }
      };
      
      // Register resources
      await registerResources(mockServer as any);
      
      // Get the ReadResource handler
      const readHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === ReadResourceRequestSchema)?.[1];
      
      // Test reading a missing note
      await expect(readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://note/Missing/Note.md' }
      })).rejects.toThrow('Note not found: Missing/Note.md');
      
      // Should have tried to get the file
      expect(mockGetFileContents).toHaveBeenCalledWith('Missing/Note.md');
    });

    it('should include dynamic note resources in list with placeholder', async () => {
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
      
      // Should include a placeholder for individual notes
      expect(result.resources).toContainEqual({
        uri: 'vault://note/{path}',
        name: 'Note',
        description: 'Individual note by path (e.g., vault://note/Daily/2024-01-01.md)',
        mimeType: 'text/markdown'
      });
    });
  });
});