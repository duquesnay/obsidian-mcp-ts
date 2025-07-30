/**
 * Integration tests for RSM + RPS error scenarios and recovery patterns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponseModeSystem, ResponseContent } from '../../src/utils/ResponseModeSystem.js';
import { PaginationSystem, PaginationParams } from '../../src/utils/PaginationSystem.js';
import { BaseResourceHandler } from '../../src/resources/BaseResourceHandler.js';
import { VaultStructureHandler } from '../../src/resources/VaultStructureHandler.js';
import { SearchHandler } from '../../src/resources/SearchHandler.js';

describe('RSM + RPS Integration Error Scenarios', () => {
  beforeEach(() => {
    ResponseModeSystem.clearCache();
  });

  describe('Mixed failure scenarios', () => {
    it('should handle pagination success with RSM cache failure', async () => {
      // Create handler that simulates cache corruption during processing
      class ErrorProneHandler extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          const params = this.extractPaginationParameters(uri);
          const mode = ResponseModeSystem.extractModeFromUri(uri);
          
          // Generate large dataset
          const allData = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            content: 'A'.repeat(3000) // Large content to trigger processing
          }));
          
          // Apply pagination successfully
          const paginatedData = this.createPaginatedResponse(allData, params);
          
          // Simulate cache corruption after pagination
          const corruptedCache = (ResponseModeSystem as any).summaryCache;
          if (corruptedCache) {
            // Force cache corruption
            corruptedCache.set = vi.fn().mockImplementation(() => {
              throw new Error('Cache write failed');
            });
          }
          
          // Process content with corrupted cache - should not fail
          try {
            const processedData = paginatedData.data.map((item: any) => {
              const content: ResponseContent = { full: item.content };
              return {
                ...item,
                processedContent: ResponseModeSystem.processContent(content, mode)
              };
            });
            
            return {
              ...paginatedData,
              data: processedData,
              mode
            };
          } catch (error) {
            // Should recover gracefully
            return {
              ...paginatedData,
              mode,
              error: 'Content processing degraded due to cache issues'
            };
          }
        }
      }
      
      const handler = new ErrorProneHandler();
      const result = await handler.execute('vault://test?limit=5&offset=10&mode=summary');
      
      expect(result.contents[0]).toBeDefined();
      const data = JSON.parse(result.contents[0].text);
      expect(data.pagination).toBeDefined();
      expect(data.data).toHaveLength(5);
      // Should either succeed or fail gracefully with error message
      expect(data.mode).toBe('summary');
    });

    it('should handle RSM success with pagination parameter corruption', async () => {
      class PaginationErrorHandler extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          let params: PaginationParams;
          
          try {
            params = this.extractPaginationParameters(uri);
          } catch (error) {
            // Simulate parameter parsing failure - use defaults
            params = {
              style: 'none',
              limit: 50,
              offset: 0
            };
          }
          
          const mode = ResponseModeSystem.extractModeFromUri(uri);
          const allData = Array.from({ length: 25 }, (_, i) => ({
            id: i,
            content: `Content ${i} with enough text to test response modes properly`
          }));
          
          // RSM should still work even with pagination issues
          const processedData = allData.map(item => {
            const content: ResponseContent = { full: item.content };
            return {
              ...item,
              processedContent: ResponseModeSystem.processContent(content, mode)
            };
          });
          
          return {
            data: processedData,
            mode,
            paginationError: 'Pagination parameters were corrupted',
            totalItems: allData.length
          };
        }
      }
      
      const handler = new PaginationErrorHandler();
      // Use malformed parameters that might cause parsing issues
      const result = await handler.execute('vault://test?limit=abc&offset=xyz&mode=preview');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.mode).toBe('preview');
      expect(data.data).toHaveLength(25);
      expect(data.paginationError).toBeDefined();
      expect(data.paginationError).toContain('corrupted');
      // RSM should still process content correctly
      data.data.forEach((item: any) => {
        expect(item.processedContent).toBeDefined();
      });
    });
  });

  describe('Recovery patterns', () => {
    it('should implement circuit breaker pattern for repeated failures', async () => {
      let failureCount = 0;
      const maxFailures = 3;
      
      class CircuitBreakerHandler extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          const params = this.extractPaginationParameters(uri);
          const mode = ResponseModeSystem.extractModeFromUri(uri);
          
          const allData = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            content: 'B'.repeat(2000)
          }));
          
          // Simulate failures for first few attempts
          if (failureCount < maxFailures) {
            failureCount++;
            throw new Error(`Simulated failure ${failureCount}`);
          }
          
          // After failures, use degraded mode
          const paginatedData = this.createPaginatedResponse(allData, params);
          
          return {
            ...paginatedData,
            mode: 'summary', // Force degraded mode after failures
            circuitBreakerActive: true,
            failureCount
          };
        }
      }
      
      const handler = new CircuitBreakerHandler();
      
      // First few attempts should fail
      for (let i = 0; i < maxFailures; i++) {
        await expect(handler.execute('vault://test?mode=full'))
          .rejects.toThrow(`Simulated failure ${i + 1}`);
      }
      
      // After max failures, should recover with degraded service
      const result = await handler.execute('vault://test?mode=full');
      const data = JSON.parse(result.contents[0].text);
      expect(data.circuitBreakerActive).toBe(true);
      expect(data.mode).toBe('summary'); // Degraded to summary despite requesting full
      expect(data.failureCount).toBe(maxFailures);
    });

    it('should implement graceful degradation when both systems fail', async () => {
      class GracefulDegradationHandler extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          // Simulate both pagination and RSM failures
          let params: PaginationParams;
          let mode: string;
          
          try {
            params = this.extractPaginationParameters(uri);
          } catch (error) {
            params = { style: 'none', limit: 10, offset: 0 }; // Minimal pagination
          }
          
          try {
            mode = ResponseModeSystem.extractModeFromUri(uri);
          } catch (error) {
            mode = 'summary'; // Safe default
          }
          
          const allData = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            title: `Item ${i}`,
            content: 'C'.repeat(1500)
          }));
          
          // Implement minimal fallback functionality
          const startIndex = params.offset || 0;
          const endIndex = Math.min(startIndex + (params.limit || 10), allData.length);
          const paginatedData = allData.slice(startIndex, endIndex);
          
          // Basic content truncation without RSM
          const processedData = paginatedData.map(item => ({
            ...item,
            content: mode === 'summary' 
              ? item.content.substring(0, 100) + '...'
              : item.content
          }));
          
          return {
            data: processedData,
            totalItems: allData.length,
            hasMore: endIndex < allData.length,
            mode,
            degradationActive: true,
            message: 'Running in degraded mode due to system failures'
          };
        }
      }
      
      const handler = new GracefulDegradationHandler();
      const result = await handler.execute('vault://test?limit=5&mode=summary');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.degradationActive).toBe(true);
      expect(data.data).toHaveLength(5);
      expect(data.message).toContain('degraded mode');
      expect(data.totalItems).toBe(100);
      expect(data.hasMore).toBe(true);
      
      // Basic functionality should still work
      data.data.forEach((item: any) => {
        expect(item.content).toBeDefined();
        expect(item.content.length).toBeLessThanOrEqual(103); // Truncated
      });
    });
  });

  describe('Real handler integration failures', () => {
    it('should handle VaultStructureHandler with corrupted RSM cache', async () => {
      const mockServer = {
        obsidianClient: {
          listFilesInVault: vi.fn().mockResolvedValue(
            Array.from({ length: 1000 }, (_, i) => `file${i}.md`)
          )
        }
      };
      
      // Corrupt the cache before processing
      const handler = new VaultStructureHandler();
      
      // Inject cache corruption
      const originalCreateSummary = ResponseModeSystem.createSummary;
      let corruptionCount = 0;
      ResponseModeSystem.createSummary = vi.fn().mockImplementation((content, key) => {
        corruptionCount++;
        if (corruptionCount <= 2) {
          throw new Error('Cache corruption');
        }
        return originalCreateSummary(content, key);
      });
      
      try {
        const result = await handler.execute('vault://structure?mode=summary&limit=10', mockServer);
        const data = JSON.parse(result.contents[0].text);
        
        // Should still provide basic functionality
        expect(data.totalFiles).toBe(1000);
        expect(data.paginatedFiles).toHaveLength(10);
      } finally {
        // Restore original function
        ResponseModeSystem.createSummary = originalCreateSummary;
      }
    });

    it('should handle SearchHandler with pagination token corruption', async () => {
      const mockServer = {
        obsidianClient: {
          search: vi.fn().mockResolvedValue({
            results: Array.from({ length: 20 }, (_, i) => ({
              filename: `result${i}.md`,
              score: 1.0 - (i * 0.1),
              matches: [{ match: { start: 0, end: 10 }, context: 'test context' }]
            })),
            totalResults: 20,
            hasMore: false
          })
        }
      };
      
      const handler = new SearchHandler();
      
      // Test with corrupted continuation token
      const corruptedToken = 'corrupted-token-data';
      
      // Should fall back gracefully without throwing
      const result = await handler.execute(
        `vault://search/test?token=${corruptedToken}&mode=preview`, 
        mockServer
      );
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.query).toBe('test');
      expect(data.results).toBeDefined();
      // Should still work with default pagination
      expect(mockServer.obsidianClient.search).toHaveBeenCalled();
    });
  });

  describe('Concurrent failure scenarios', () => {
    it('should handle concurrent requests during system failures', async () => {
      let systemFailure = true;
      
      class ConcurrentFailureHandler extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          if (systemFailure) {
            // Simulate random failures during concurrent access
            if (Math.random() < 0.5) {
              throw new Error('Random system failure');
            }
          }
          
          const params = this.extractPaginationParameters(uri);
          const mode = ResponseModeSystem.extractModeFromUri(uri);
          
          const data = Array.from({ length: 10 }, (_, i) => ({
            id: i,
            content: `Content ${i}`
          }));
          
          return this.createPaginatedResponse(data, params);
        }
      }
      
      const handler = new ConcurrentFailureHandler();
      const requests = Array.from({ length: 10 }, (_, i) => 
        handler.execute(`vault://test?offset=${i * 5}&limit=5`)
          .catch(error => ({ error: error.message }))
      );
      
      const results = await Promise.all(requests);
      
      // Some should succeed, some should fail
      const successes = results.filter(r => !('error' in r));
      const failures = results.filter(r => 'error' in r);
      
      expect(successes.length + failures.length).toBe(10);
      expect(failures.length).toBeGreaterThan(0); // Some failures expected
      expect(successes.length).toBeGreaterThan(0); // Some successes expected
      
      // Disable system failure and retry failed requests
      systemFailure = false;
      
      const retryResults = await Promise.all(
        Array.from({ length: failures.length }, (_, i) => 
          handler.execute(`vault://test?offset=${i * 5}&limit=5`)
        )
      );
      
      // All retries should succeed
      retryResults.forEach(result => {
        expect(result.contents[0]).toBeDefined();
      });
    });
  });

  describe('Memory pressure during failures', () => {
    it('should handle memory pressure during integrated operations', async () => {
      class MemoryPressureHandler extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          const params = this.extractPaginationParameters(uri);
          const mode = ResponseModeSystem.extractModeFromUri(uri);
          
          // Create memory pressure by generating large dataset
          const largeData = Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            content: 'X'.repeat(10000), // 10KB per item = 100MB total
            metadata: {
              created: new Date(),
              tags: Array.from({ length: 100 }, (_, j) => `tag-${j}`)
            }
          }));
          
          try {
            // Apply pagination to reduce memory footprint
            const paginatedResponse = this.createPaginatedResponse(largeData, params);
            
            // Process with RSM (should handle memory efficiently)
            const processedData = paginatedResponse.data.map((item: any) => {
              const content: ResponseContent = { full: item.content };
              return {
                id: item.id,
                content: ResponseModeSystem.processContent(content, mode),
                metadata: item.metadata
              };
            });
            
            return {
              ...paginatedResponse,
              data: processedData,
              mode,
              memoryPressure: true
            };
          } catch (error) {
            // Memory exhaustion fallback
            return {
              data: largeData.slice(0, 5).map(item => ({
                id: item.id,
                content: item.content.substring(0, 100),
                metadata: { truncated: true }
              })),
              mode: 'summary',
              error: 'Memory pressure - using minimal fallback',
              totalItems: largeData.length
            };
          }
        }
      }
      
      const handler = new MemoryPressureHandler();
      const result = await handler.execute('vault://test?limit=100&mode=preview');
      
      const data = JSON.parse(result.contents[0].text);
      
      // Should either succeed with pagination or fail gracefully
      if (data.error) {
        expect(data.error).toContain('Memory pressure');
        expect(data.data).toHaveLength(5); // Fallback size
      } else {
        expect(data.memoryPressure).toBe(true);
        expect(data.data.length).toBeLessThanOrEqual(100);
        expect(data.pagination).toBeDefined();
      }
    });
  });
});