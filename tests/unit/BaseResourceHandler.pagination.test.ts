import { describe, it, expect } from 'vitest';
import { BaseResourceHandler } from '../../src/resources/BaseResourceHandler.js';
import { PaginationParams } from '../../src/utils/PaginationSystem.js';

// Create a concrete test handler to test the pagination integration
class TestPaginationHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    // Extract pagination parameters using the inherited method
    const params = this.extractPaginationParameters(uri);
    
    // Generate test data
    const allData = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `item-${i}` }));
    
    // Create paginated response using the inherited method
    return this.createPaginatedResponse(allData, params);
  }
}

describe('BaseResourceHandler Pagination Integration', () => {
  const handler = new TestPaginationHandler();

  describe('extractPaginationParameters', () => {
    it('should extract pagination parameters from URI', () => {
      const uri = 'vault://test?limit=10&offset=20';
      const params = handler.extractPaginationParameters(uri);
      
      expect(params.limit).toBe(10);
      expect(params.offset).toBe(20);
      expect(params.style).toBe('offset');
    });

    it('should use custom default limit', () => {
      const uri = 'vault://test';
      const params = handler.extractPaginationParameters(uri, { defaultLimit: 25 });
      
      expect(params.limit).toBe(25);
      expect(params.offset).toBe(0);
      expect(params.style).toBe('none');
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with metadata', async () => {
      const uri = 'vault://test?limit=10&offset=20';
      const response = await handler.handleRequest(uri);
      
      expect(response.data).toHaveLength(10);
      expect(response.data[0]).toEqual({ id: 20, name: 'item-20' });
      expect(response.pagination).toEqual({
        totalItems: 100,
        hasMore: true,
        limit: 10,
        offset: 20,
        nextOffset: 30,
        previousOffset: 10,
        currentPage: 3,
        totalPages: 10
      });
    });

    it('should handle last page correctly', async () => {
      const uri = 'vault://test?limit=10&offset=90';
      const response = await handler.handleRequest(uri);
      
      expect(response.data).toHaveLength(10);
      expect(response.pagination.hasMore).toBe(false);
      expect(response.pagination.nextOffset).toBeUndefined();
    });
  });

  describe('isPaginationRequested', () => {
    it('should detect when pagination is requested', () => {
      const params: PaginationParams = { style: 'offset', limit: 10, offset: 0 };
      expect(handler.isPaginationRequested(params)).toBe(true);
    });

    it('should detect when pagination is not requested', () => {
      const params: PaginationParams = { style: 'none', limit: 50, offset: 0 };
      expect(handler.isPaginationRequested(params)).toBe(false);
    });
  });
});