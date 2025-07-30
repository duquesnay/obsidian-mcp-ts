import { describe, it, expect } from 'vitest';
import { PaginationSystem, PaginationParams, PaginationMetadata } from '../../../src/utils/PaginationSystem.js';

describe('PaginationSystem', () => {
  describe('parseParameters', () => {
    it('should parse offset/limit parameters from URI', () => {
      const uri = 'vault://test?limit=10&offset=20';
      const params = PaginationSystem.parseParameters(uri);
      
      expect(params).toEqual({
        style: 'offset',
        limit: 10,
        offset: 20,
        page: undefined
      });
    });

    it('should parse page/limit parameters from URI', () => {
      const uri = 'vault://test?limit=10&page=2';
      const params = PaginationSystem.parseParameters(uri);
      
      expect(params).toEqual({
        style: 'page',
        limit: 10,
        offset: 10, // Calculated from page 2 * limit 10
        page: 2
      });
    });

    it('should use default values when no parameters provided', () => {
      const uri = 'vault://test';
      const params = PaginationSystem.parseParameters(uri, { defaultLimit: 25 });
      
      expect(params).toEqual({
        style: 'none',
        limit: 25,
        offset: 0,
        page: undefined
      });
    });

    it('should handle continuation tokens', () => {
      const token = btoa(JSON.stringify({ type: 'test', offset: 30 }));
      const uri = `vault://test?token=${token}`;
      const params = PaginationSystem.parseParameters(uri, { tokenType: 'test' });
      
      expect(params).toEqual({
        style: 'token',
        limit: 50, // default
        offset: 30,
        page: undefined,
        token
      });
    });
  });

  describe('generateMetadata', () => {
    it('should generate complete pagination metadata', () => {
      const params: PaginationParams = {
        style: 'offset',
        limit: 10,
        offset: 20
      };
      
      const metadata = PaginationSystem.generateMetadata(params, 100);
      
      expect(metadata).toEqual({
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

    it('should handle first page', () => {
      const params: PaginationParams = {
        style: 'offset',
        limit: 10,
        offset: 0
      };
      
      const metadata = PaginationSystem.generateMetadata(params, 100);
      
      expect(metadata.previousOffset).toBeUndefined();
      expect(metadata.currentPage).toBe(1);
    });

    it('should handle last page', () => {
      const params: PaginationParams = {
        style: 'offset',
        limit: 10,
        offset: 90
      };
      
      const metadata = PaginationSystem.generateMetadata(params, 100);
      
      expect(metadata.hasMore).toBe(false);
      expect(metadata.nextOffset).toBeUndefined();
    });
  });

  describe('applyPagination', () => {
    it('should slice data correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => `item-${i}`);
      const params: PaginationParams = {
        style: 'offset',
        limit: 10,
        offset: 20
      };
      
      const result = PaginationSystem.applyPagination(data, params);
      
      expect(result.slice(0, 3)).toEqual(['item-20', 'item-21', 'item-22']);
      expect(result.length).toBe(10);
    });
  });

  describe('generateContinuationToken', () => {
    it('should generate base64 encoded token', () => {
      const token = PaginationSystem.generateContinuationToken('search', 'test query', 30);
      const decoded = JSON.parse(atob(token));
      
      expect(decoded).toEqual({
        type: 'search',
        query: 'test query',
        offset: 30
      });
    });
  });
});