import { describe, it, expect } from 'vitest';
import { PaginationSystem } from '../../src/utils/PaginationSystem.js';

describe('Pagination Performance Benchmarks', () => {
  const generateTestData = (size: number) => 
    Array.from({ length: size }, (_, i) => ({ id: i, name: `item-${i}`, data: `data-${i}` }));

  const smallDataset = generateTestData(1000);
  const mediumDataset = generateTestData(10000);
  const largeDataset = generateTestData(100000);

  describe('Parameter Parsing Performance', () => {
    const testUris = [
      'vault://test?limit=10&offset=0',
      'vault://test?limit=50&offset=1000',
      'vault://test?page=5&limit=20',
      'vault://test?token=' + btoa(JSON.stringify({ type: 'test', offset: 500 }))
    ];

    it('should parse URI parameters efficiently', () => {
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        testUris.forEach(uri => PaginationSystem.parseParameters(uri));
      }
      
      const end = performance.now();
      const timePerParse = (end - start) / (iterations * testUris.length);
      
      expect(timePerParse).toBeLessThan(0.1); // Should parse in under 0.1ms
    });
  });

  describe('Data Slicing Performance', () => {
    const paginationParams = {
      style: 'offset' as const,
      limit: 50,
      offset: 100
    };

    it('should slice datasets efficiently', () => {
      // Test small dataset
      const start1 = performance.now();
      const result1 = PaginationSystem.applyPagination(smallDataset, paginationParams);
      const end1 = performance.now();
      expect(end1 - start1).toBeLessThan(5);
      expect(result1).toHaveLength(50);

      // Test medium dataset
      const start2 = performance.now();
      const result2 = PaginationSystem.applyPagination(mediumDataset, paginationParams);
      const end2 = performance.now();
      expect(end2 - start2).toBeLessThan(10);
      expect(result2).toHaveLength(50);

      // Test large dataset
      const start3 = performance.now();
      const result3 = PaginationSystem.applyPagination(largeDataset, paginationParams);
      const end3 = performance.now();
      expect(end3 - start3).toBeLessThan(20);
      expect(result3).toHaveLength(50);
    });
  });

  describe('Metadata Generation Performance', () => {
    const paginationParams = {
      style: 'offset' as const,
      limit: 50,
      offset: 100
    };

    it('should generate metadata efficiently for all dataset sizes', () => {
      // Test small dataset
      const start1 = performance.now();
      const meta1 = PaginationSystem.generateMetadata(paginationParams, smallDataset.length);
      const end1 = performance.now();
      expect(end1 - start1).toBeLessThan(1);
      expect(meta1.totalItems).toBe(1000);

      // Test medium dataset
      const start2 = performance.now();
      const meta2 = PaginationSystem.generateMetadata(paginationParams, mediumDataset.length);
      const end2 = performance.now();
      expect(end2 - start2).toBeLessThan(1);
      expect(meta2.totalItems).toBe(10000);

      // Test large dataset
      const start3 = performance.now();
      const meta3 = PaginationSystem.generateMetadata(paginationParams, largeDataset.length);
      const end3 = performance.now();
      expect(end3 - start3).toBeLessThan(1);
      expect(meta3.totalItems).toBe(100000);
    });
  });

  describe('Full Pagination Pipeline Performance', () => {
    const uri = 'vault://test?limit=50&offset=100';

    it('should execute full pipeline efficiently', () => {
      // Test small dataset pipeline
      const start1 = performance.now();
      const params1 = PaginationSystem.parseParameters(uri);
      const data1 = PaginationSystem.applyPagination(smallDataset, params1);
      const metadata1 = PaginationSystem.generateMetadata(params1, smallDataset.length);
      const end1 = performance.now();
      
      expect(end1 - start1).toBeLessThan(10);
      expect(data1).toHaveLength(50);
      expect(metadata1.totalItems).toBe(1000);

      // Test large dataset pipeline
      const start2 = performance.now();
      const params2 = PaginationSystem.parseParameters(uri);
      const data2 = PaginationSystem.applyPagination(largeDataset, params2);
      const metadata2 = PaginationSystem.generateMetadata(params2, largeDataset.length);
      const end2 = performance.now();
      
      expect(end2 - start2).toBeLessThan(25);
      expect(data2).toHaveLength(50);
      expect(metadata2.totalItems).toBe(100000);
    });
  });

  describe('Paginated vs Non-Paginated Response Performance', () => {
    const paginatedUri = 'vault://test?limit=50&offset=100';
    const nonPaginatedUri = 'vault://test';

    it('should create responses efficiently', () => {
      // Test paginated response
      const start1 = performance.now();
      const params1 = PaginationSystem.parseParameters(paginatedUri);
      const response1 = PaginationSystem.createPaginatedResponse(smallDataset, params1, smallDataset.length);
      const end1 = performance.now();
      
      expect(end1 - start1).toBeLessThan(10);
      expect(response1.data).toHaveLength(50);
      expect(response1.pagination.hasMore).toBe(true);

      // Test non-paginated response
      const start2 = performance.now();
      const params2 = PaginationSystem.parseParameters(nonPaginatedUri);
      const response2 = PaginationSystem.createPaginatedResponse(smallDataset, params2, smallDataset.length);
      const end2 = performance.now();
      
      expect(end2 - start2).toBeLessThan(15);
      expect(response2.data).toHaveLength(50); // Still uses default limit
    });
  });

  describe('Performance Expectations', () => {
    it('should parse parameters in under 1ms', () => {
      const start = performance.now();
      const params = PaginationSystem.parseParameters('vault://test?limit=50&offset=100');
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1);
      expect(params.limit).toBe(50);
    });

    it('should slice large datasets efficiently', () => {
      const params = { style: 'offset' as const, limit: 50, offset: 1000 };
      const start = performance.now();
      const result = PaginationSystem.applyPagination(largeDataset, params);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(10); // Should be very fast
      expect(result).toHaveLength(50);
      expect(result[0].id).toBe(1000);
    });

    it('should generate metadata efficiently', () => {
      const params = { style: 'offset' as const, limit: 50, offset: 1000 };
      const start = performance.now();
      const metadata = PaginationSystem.generateMetadata(params, largeDataset.length);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1);
      expect(metadata.totalItems).toBe(100000);
      expect(metadata.currentPage).toBe(21);
    });
  });
});