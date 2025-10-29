import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecentChangesHandler } from '../../src/resources/RecentChangesHandler.js';

// Mock ObsidianClient
const mockObsidianClient = {
  getRecentChanges: vi.fn(),
  getFileContents: vi.fn().mockResolvedValue({
    stat: {
      size: 1000,
      ctime: Date.now() - 86400000,
      mtime: Date.now()
    }
  })
};

// Mock server with client
const mockServer = {
  obsidianClient: mockObsidianClient
};

// Sample test data - format expected by RecentChangesHandler
const sampleNotes = Array.from({ length: 100 }, (_, i) => ({
  path: `note-${i}.md`,
  content: `Content for note ${i}`.repeat(10),
  mtime: Date.now() - i * 60000, // Each note 1 minute older (timestamp format)
  size: 100 + i
}));

describe('RecentChangesHandler Migration to Shared Pagination', () => {
  const handler = new RecentChangesHandler();

  beforeEach(() => {
    vi.clearAllMocks();
    mockObsidianClient.getRecentChanges.mockResolvedValue(sampleNotes);
  });

  describe('Pagination Parameters Extraction', () => {
    it('should extract limit and offset parameters', async () => {
      const uri = 'vault://recent?limit=10&offset=20';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.notes).toHaveLength(10);
      expect(response.pagination?.limit).toBe(10);
      expect(response.pagination?.offset).toBe(20);
    });

    it('should use default pagination values', async () => {
      const uri = 'vault://recent';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.pagination?.limit).toBe(20); // Default for RecentChangesHandler
      expect(response.pagination?.offset).toBe(0);
    });

    it('should handle page-based pagination', async () => {
      const uri = 'vault://recent?page=3&limit=10';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.pagination?.limit).toBe(10);
      expect(response.pagination?.offset).toBe(20); // page 3 * limit 10 - limit 10 = 20
      expect(response.pagination?.currentPage).toBe(3);
    });
  });

  describe('Standardized Pagination Metadata', () => {
    it('should include complete pagination metadata', async () => {
      const uri = 'vault://recent?limit=10&offset=20';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.pagination).toMatchObject({
        totalItems: 100,
        hasMore: true,
        limit: 10,
        offset: 20,
        nextOffset: 30,
        previousOffset: 10,
        currentPage: 3,
        totalPages: 10
      });
      // Continuation token should be present
      expect(response.pagination?.continuationToken).toBeDefined();
    });

    it('should handle first page correctly', async () => {
      const uri = 'vault://recent?limit=10&offset=0';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.pagination?.previousOffset).toBeUndefined();
      expect(response.pagination?.currentPage).toBe(1);
    });

    it('should handle last page correctly', async () => {
      const uri = 'vault://recent?limit=10&offset=90';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.pagination?.hasMore).toBe(false);
      expect(response.pagination?.nextOffset).toBeUndefined();
    });
  });

  describe('Response Mode Compatibility', () => {
    it('should maintain preview mode behavior', async () => {
      const uri = 'vault://recent?mode=preview&limit=5';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.mode).toBe('preview');
      expect(response.notes).toHaveLength(5);
      // Check that preview is available and content is not
      expect(response.notes[0]).toHaveProperty('preview');
      expect(response.notes[0]).not.toHaveProperty('content');
      expect(response.notes[0].preview!.length <= 103).toBe(true); // 100 + "..."
    });

    it('should maintain full mode behavior', async () => {
      const uri = 'vault://recent?mode=full&limit=5';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.mode).toBe('full');
      expect(response.notes).toHaveLength(5);
      // Check that content is available and preview is not
      expect(response.notes[0]).toHaveProperty('content');
      expect(response.notes[0]).not.toHaveProperty('preview');
      expect(response.notes[0].content!.length > 100).toBe(true);
    });
  });

  describe('Continuation Token Support', () => {
    it('should generate continuation tokens', async () => {
      // Request with pagination that has more results
      const uri = 'vault://recent?limit=10&offset=0';
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.pagination?.continuationToken).toBeDefined();
      expect(response.pagination?.hasMore).toBe(true);
      
      // Token should be based on the last item's modification time
      const lastItem = response.notes[response.notes.length - 1];
      const expectedToken = new Date(lastItem.modifiedAt).getTime().toString();
      expect(response.pagination?.continuationToken).toBe(expectedToken);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing API structure', async () => {
      const uri = 'vault://recent?limit=5';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      // Check that all expected fields are present
      expect(response).toHaveProperty('notes');
      expect(response).toHaveProperty('mode');
      expect(response).toHaveProperty('pagination');
      
      // Check note structure
      expect(response.notes[0]).toHaveProperty('path');
      expect(response.notes[0]).toHaveProperty('title'); // RecentChangesHandler uses 'title' not 'name'
      expect(response.notes[0]).toHaveProperty('preview'); // Default mode is preview
      expect(response.notes[0]).toHaveProperty('modifiedAt');
    });

    it('should work without pagination parameters', async () => {
      const uri = 'vault://recent';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.notes).toHaveLength(20); // Default limit
      expect(response.pagination).toBeDefined();
    });
  });

  describe('Performance Comparison', () => {
    it('should perform pagination efficiently', async () => {
      const uri = 'vault://recent?limit=10&offset=50';
      
      const start = performance.now();
      const response = await handler.handleRequest(uri, mockServer);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should be very fast
      expect(response.notes).toHaveLength(10);
      expect(response.notes[0].path).toBe('note-50.md');
    });

    it('should handle large offsets efficiently', async () => {
      // Generate larger dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        path: `note-${i}.md`,
        content: `Content ${i}`,
        mtime: Date.now() - i * 60000,
        size: 100 + i
      }));
      
      mockObsidianClient.getRecentChanges.mockResolvedValue(largeDataset);
      
      const uri = 'vault://recent?limit=10&offset=5000';
      
      const start = performance.now();
      const response = await handler.handleRequest(uri, mockServer);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(200);
      expect(response.notes).toHaveLength(10);
      expect(response.pagination?.offset).toBe(5000);
    });
  });
});