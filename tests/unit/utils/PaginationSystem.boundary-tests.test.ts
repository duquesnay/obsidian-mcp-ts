/**
 * Boundary condition tests for PaginationSystem - edge cases and error scenarios
 */

import { describe, it, expect } from 'vitest';
import { PaginationSystem, PaginationParams } from '../../../src/utils/PaginationSystem.js';

describe('PaginationSystem Boundary Conditions', () => {
  describe('Large dataset handling', () => {
    it('should handle extremely large datasets efficiently', () => {
      const hugeDataset = Array.from({ length: 1000000 }, (_, i) => `item-${i}`);
      const params: PaginationParams = {
        style: 'offset',
        limit: 100,
        offset: 500000
      };

      const start = performance.now();
      const result = PaginationSystem.applyPagination(hugeDataset, params);
      const end = performance.now();

      expect(result).toHaveLength(100);
      expect(result[0]).toBe('item-500000');
      expect(result[99]).toBe('item-500099');
      expect(end - start).toBeLessThan(50); // Should be performant
    });

    it('should handle pagination metadata for large totals', () => {
      const params: PaginationParams = {
        style: 'offset',
        limit: 1000,
        offset: 500000
      };

      const metadata = PaginationSystem.generateMetadata(params, 10000000);

      expect(metadata.totalItems).toBe(10000000);
      expect(metadata.totalPages).toBe(10000);
      expect(metadata.currentPage).toBe(501); // (500000 / 1000) + 1
      expect(metadata.hasMore).toBe(true);
      expect(metadata.nextOffset).toBe(501000);
      expect(metadata.previousOffset).toBe(499000);
    });

    it('should handle maximum safe integer boundaries', () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      const params: PaginationParams = {
        style: 'offset',
        limit: 100,
        offset: maxSafeInt - 200
      };

      const metadata = PaginationSystem.generateMetadata(params, maxSafeInt);

      expect(metadata.totalItems).toBe(maxSafeInt);
      expect(metadata.offset).toBe(maxSafeInt - 200);
      expect(metadata.hasMore).toBe(true);
      expect(metadata.nextOffset).toBe(maxSafeInt - 100);
    });
  });

  describe('Edge offset and limit values', () => {
    it('should handle zero limit gracefully', () => {
      const data = ['item1', 'item2', 'item3'];
      const params: PaginationParams = {
        style: 'offset',
        limit: 0,
        offset: 0
      };

      const result = PaginationSystem.applyPagination(data, params);
      expect(result).toHaveLength(0);

      const metadata = PaginationSystem.generateMetadata(params, data.length);
      expect(metadata.limit).toBe(0);
      expect(metadata.totalPages).toBe(Infinity); // Division by zero case
    });

    it('should handle negative offset', () => {
      const data = ['item1', 'item2', 'item3'];
      const params: PaginationParams = {
        style: 'offset',
        limit: 10,
        offset: -5
      };

      const result = PaginationSystem.applyPagination(data, params);
      expect(result).toEqual(['item1', 'item2', 'item3']); // Should start from beginning

      const metadata = PaginationSystem.generateMetadata(params, data.length);
      expect(metadata.offset).toBe(-5);
      expect(metadata.currentPage).toBe(0); // Negative page calculation
    });

    it('should handle negative limit', () => {
      const data = ['item1', 'item2', 'item3'];
      const params: PaginationParams = {
        style: 'offset',
        limit: -10,
        offset: 0
      };

      const result = PaginationSystem.applyPagination(data, params);
      expect(result).toHaveLength(0); // Negative slice

      const metadata = PaginationSystem.generateMetadata(params, data.length);
      expect(metadata.limit).toBe(-10);
      expect(metadata.hasMore).toBe(false);
    });

    it('should handle offset beyond dataset size', () => {
      const data = ['item1', 'item2', 'item3'];
      const params: PaginationParams = {
        style: 'offset',
        limit: 10,
        offset: 100
      };

      const result = PaginationSystem.applyPagination(data, params);
      expect(result).toHaveLength(0);

      const metadata = PaginationSystem.generateMetadata(params, data.length);
      expect(metadata.hasMore).toBe(false);
      expect(metadata.nextOffset).toBeUndefined();
      expect(metadata.currentPage).toBe(11); // (100 / 10) + 1
    });

    it('should handle limit larger than dataset', () => {
      const data = ['item1', 'item2', 'item3'];
      const params: PaginationParams = {
        style: 'offset',
        limit: 1000,
        offset: 0
      };

      const result = PaginationSystem.applyPagination(data, params);
      expect(result).toEqual(data); // Should return all items

      const metadata = PaginationSystem.generateMetadata(params, data.length);
      expect(metadata.hasMore).toBe(false);
      expect(metadata.nextOffset).toBeUndefined();
    });
  });

  describe('Continuation token edge cases', () => {
    it('should handle malformed continuation tokens', () => {
      const malformedToken = 'not-base64!@#$';
      const uri = `vault://test?token=${malformedToken}`;

      // Should fall back to default parameters without throwing
      const params = PaginationSystem.parseParameters(uri, { tokenType: 'test' });
      expect(params.style).toBe('none'); // Falls back to default
      expect(params.offset).toBe(0);
      expect(params.limit).toBe(50);
    });

    it('should handle base64 tokens with invalid JSON', () => {
      const invalidJsonToken = btoa('invalid json {{{');
      const uri = `vault://test?token=${invalidJsonToken}`;

      const params = PaginationSystem.parseParameters(uri, { tokenType: 'test' });
      expect(params.style).toBe('none'); // Falls back to default
      expect(params.offset).toBe(0);
    });

    it('should handle tokens with wrong type', () => {
      const wrongTypeToken = btoa(JSON.stringify({ type: 'wrong', offset: 50 }));
      const uri = `vault://test?token=${wrongTypeToken}`;

      const params = PaginationSystem.parseParameters(uri, { tokenType: 'test' });
      expect(params.style).toBe('none'); // Falls back due to type mismatch
      expect(params.offset).toBe(0);
    });

    it('should handle tokens with missing required fields', () => {
      const incompleteToken = btoa(JSON.stringify({ type: 'test' })); // missing offset
      const uri = `vault://test?token=${incompleteToken}`;

      const params = PaginationSystem.parseParameters(uri, { tokenType: 'test' });
      expect(params.style).toBe('none'); // Falls back due to missing data
    });

    it('should handle tokens with invalid offset values', () => {
      const invalidOffsetToken = btoa(JSON.stringify({ 
        type: 'test', 
        offset: 'not-a-number' 
      }));
      const uri = `vault://test?token=${invalidOffsetToken}`;

      const params = PaginationSystem.parseParameters(uri, { tokenType: 'test' });
      expect(params.style).toBe('none'); // Falls back due to invalid offset
    });

    it('should generate tokens for extreme offset values', () => {
      const extremeOffset = Number.MAX_SAFE_INTEGER - 1;
      const token = PaginationSystem.generateContinuationToken('test', 'query', extremeOffset);
      
      const decoded = JSON.parse(atob(token));
      expect(decoded.offset).toBe(extremeOffset);
      expect(decoded.type).toBe('test');
      expect(decoded.query).toBe('query');
    });
  });

  describe('Parameter parsing edge cases', () => {
    it('should handle URIs with no query parameters', () => {
      const params = PaginationSystem.parseParameters('vault://test');
      expect(params.style).toBe('none');
      expect(params.limit).toBe(50); // default
      expect(params.offset).toBe(0);
    });

    it('should handle URIs with empty query string', () => {
      const params = PaginationSystem.parseParameters('vault://test?');
      expect(params.style).toBe('none');
      expect(params.limit).toBe(50);
      expect(params.offset).toBe(0);
    });

    it('should handle malformed URIs', () => {
      expect(() => PaginationSystem.parseParameters('not-a-uri')).not.toThrow();
      expect(() => PaginationSystem.parseParameters('')).not.toThrow();
      expect(() => PaginationSystem.parseParameters('vault://')).not.toThrow();
    });

    it('should handle parameters with invalid numeric values', () => {
      const params = PaginationSystem.parseParameters('vault://test?limit=abc&offset=xyz');
      expect(params.style).toBe('none'); // Invalid numbers fall back to none
      expect(params.limit).toBe(50); // default
      expect(params.offset).toBe(0);
    });

    it('should handle parameters with floating point values', () => {
      const params = PaginationSystem.parseParameters('vault://test?limit=10.5&offset=5.7');
      expect(params.style).toBe('offset');
      expect(params.limit).toBe(10); // Should truncate
      expect(params.offset).toBe(5); // Should truncate
    });

    it('should handle parameters with scientific notation', () => {
      const params = PaginationSystem.parseParameters('vault://test?limit=1e2&offset=5e1');
      expect(params.style).toBe('offset');
      expect(params.limit).toBe(100);
      expect(params.offset).toBe(50);
    });

    it('should handle extremely large parameter values', () => {
      const hugeNumber = Number.MAX_SAFE_INTEGER.toString();
      const params = PaginationSystem.parseParameters(`vault://test?limit=${hugeNumber}&offset=${hugeNumber}`);
      expect(params.style).toBe('offset');
      expect(params.limit).toBe(Number.MAX_SAFE_INTEGER);
      expect(params.offset).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle mixed valid and invalid parameters', () => {
      const params = PaginationSystem.parseParameters('vault://test?limit=10&offset=abc&page=2');
      // limit is valid, offset is invalid, page is valid
      // Should prioritize page over offset
      expect(params.style).toBe('page');
      expect(params.limit).toBe(10);
      expect(params.page).toBe(2);
      expect(params.offset).toBe(10); // calculated from page
    });

    it('should handle duplicate parameters', () => {
      const params = PaginationSystem.parseParameters('vault://test?limit=10&limit=20&offset=5&offset=15');
      // URLSearchParams typically uses the last value
      expect(params.style).toBe('offset');
      expect(params.limit).toBe(20);
      expect(params.offset).toBe(15);
    });
  });

  describe('Page calculation edge cases', () => {
    it('should handle page calculation with zero limit', () => {
      const params: PaginationParams = {
        style: 'page',
        limit: 0,
        offset: 0,
        page: 1
      };

      const metadata = PaginationSystem.generateMetadata(params, 100);
      expect(metadata.currentPage).toBe(1);
      expect(metadata.totalPages).toBe(Infinity);
    });

    it('should handle page calculation with zero total items', () => {
      const params: PaginationParams = {
        style: 'page',
        limit: 10,
        offset: 0,
        page: 1
      };

      const metadata = PaginationSystem.generateMetadata(params, 0);
      expect(metadata.totalPages).toBe(0);
      expect(metadata.hasMore).toBe(false);
      expect(metadata.currentPage).toBe(1);
    });

    it('should handle page conversion with large page numbers', () => {
      const largePageNumber = 1000000;
      const params = PaginationSystem.parseParameters(`vault://test?page=${largePageNumber}&limit=10`);
      
      expect(params.style).toBe('page');
      expect(params.page).toBe(largePageNumber);
      expect(params.offset).toBe((largePageNumber - 1) * 10); // Should handle large offset calculation
    });
  });

  describe('Memory and performance edge cases', () => {
    it('should handle empty datasets efficiently', () => {
      const emptyData: string[] = [];
      const params: PaginationParams = {
        style: 'offset',
        limit: 100,
        offset: 0
      };

      const start = performance.now();
      const result = PaginationSystem.applyPagination(emptyData, params);
      const end = performance.now();

      expect(result).toHaveLength(0);
      expect(end - start).toBeLessThan(10); // Should be very fast
    });

    it('should handle sparse arrays correctly', () => {
      const sparseArray: string[] = [];
      sparseArray[100] = 'item-100';
      sparseArray[1000] = 'item-1000';
      sparseArray[5000] = 'item-5000';

      const params: PaginationParams = {
        style: 'offset',
        limit: 10,
        offset: 99
      };

      const result = PaginationSystem.applyPagination(sparseArray, params);
      // Result behavior depends on JavaScript's handling of sparse arrays
      expect(result).toHaveLength(10);
    });
  });
});