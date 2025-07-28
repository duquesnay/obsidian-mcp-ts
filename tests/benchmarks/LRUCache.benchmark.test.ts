import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LRUCacheBenchmark } from '../../src/benchmarks/LRUCache.benchmark.js';
import { performance } from 'perf_hooks';

describe('LRUCacheBenchmark', () => {
  let benchmark: LRUCacheBenchmark;
  let consoleLogSpy: any;
  let performanceNowSpy: any;

  beforeEach(() => {
    benchmark = new LRUCacheBenchmark();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock performance.now to control timing
    let mockTime = 0;
    performanceNowSpy = vi.spyOn(performance, 'now').mockImplementation(() => {
      mockTime += 10; // Each operation takes 10ms
      return mockTime;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Benchmark Scenarios', () => {
    it('should run sequential access benchmark with high hit rate', async () => {
      const result = await (benchmark as any).benchmarkSequentialAccess();
      
      expect(result.name).toBe('Sequential Access (High Hit Rate)');
      expect(result.totalOperations).toBeGreaterThan(0);
      expect(result.hits).toBeGreaterThan(0);
      expect(result.hitRate).toBeGreaterThan(0.9); // Should have > 90% hit rate
    });

    it('should run random access benchmark with lower hit rate', async () => {
      const result = await (benchmark as any).benchmarkRandomAccessLargeDataset();
      
      expect(result.name).toBe('Random Access (Large Dataset)');
      expect(result.totalOperations).toBeGreaterThan(0);
      expect(result.misses).toBeGreaterThan(0);
      expect(result.hitRate).toBeLessThan(0.5); // Should have < 50% hit rate due to large dataset
    });

    it('should run TTL expiration benchmark', async () => {
      // Use real timing for TTL test
      performanceNowSpy.mockRestore();
      
      const result = await (benchmark as any).benchmarkWithTTLExpiration();
      
      expect(result.name).toBe('TTL Expiration Impact');
      expect(result.totalOperations).toBeGreaterThan(0);
      expect(result.misses).toBeGreaterThan(0); // Should have misses due to TTL expiration
    });

    it('should run optimal working set benchmark', async () => {
      const result = await (benchmark as any).benchmarkOptimalWorkingSet();
      
      expect(result.name).toBe('Optimal Working Set');
      expect(result.totalOperations).toBeGreaterThan(0);
      expect(result.hitRate).toBeGreaterThan(0.8); // Should have > 80% hit rate with Pareto access
    });

    it('should run cache thrashing benchmark', async () => {
      const result = await (benchmark as any).benchmarkCacheThrashing();
      
      expect(result.name).toBe('Cache Thrashing (Worst Case)');
      expect(result.totalOperations).toBeGreaterThan(0);
      expect(result.hitRate).toBeLessThan(0.1); // Should have very low hit rate
    });

    it('should run file metadata caching benchmark', async () => {
      const result = await (benchmark as any).benchmarkFileMetadataCaching();
      
      expect(result.name).toBe('File Metadata Caching');
      expect(result.totalOperations).toBeGreaterThan(0);
      expect(result.hits).toBeGreaterThan(0);
      expect(result.misses).toBeGreaterThan(0);
      // Should have moderate hit rate due to hot/cold file access pattern
      expect(result.hitRate).toBeGreaterThan(0.3);
      expect(result.hitRate).toBeLessThan(0.9);
    });
  });

  describe('Result Calculation', () => {
    it('should calculate correct operations per second', async () => {
      const result = await (benchmark as any).benchmarkSequentialAccess();
      
      expect(result.opsPerSecond).toBe(result.totalOperations / result.duration * 1000);
    });

    it('should calculate correct average operation time', async () => {
      const result = await (benchmark as any).benchmarkSequentialAccess();
      
      expect(result.averageOperationTime).toBe(result.duration / result.totalOperations);
    });

    it('should calculate correct hit rate', async () => {
      const result = await (benchmark as any).benchmarkSequentialAccess();
      
      const expectedHitRate = result.hits / (result.hits + result.misses);
      expect(result.hitRate).toBeCloseTo(expectedHitRate, 5);
    });
  });

  describe('Full Benchmark Run', () => {
    it('should run all benchmarks and display results', async () => {
      await benchmark.runAll();
      
      // Check that results were displayed
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('LRU Cache Hit/Miss Rate Benchmarks'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Detailed Results'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Summary'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Hit Rate Rankings'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Insights'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cache Tuning Recommendations'));
    });

    it('should collect results from all benchmark scenarios', async () => {
      await benchmark.runAll();
      
      const results = (benchmark as any).results;
      expect(results).toHaveLength(6); // 6 different benchmark scenarios
      
      const scenarioNames = results.map((r: any) => r.name);
      expect(scenarioNames).toContain('Sequential Access (High Hit Rate)');
      expect(scenarioNames).toContain('Optimal Working Set');
      expect(scenarioNames).toContain('File Metadata Caching');
      expect(scenarioNames).toContain('Random Access (Large Dataset)');
      expect(scenarioNames).toContain('TTL Expiration Impact');
      expect(scenarioNames).toContain('Cache Thrashing (Worst Case)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache operations', async () => {
      // Test with a cache that has no operations
      const mockRunScenario = vi.spyOn(benchmark as any, 'runScenario').mockResolvedValue({
        name: 'Empty Test',
        totalOperations: 0,
        duration: 0,
        opsPerSecond: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageOperationTime: 0
      });

      const result = await (benchmark as any).benchmarkSequentialAccess();
      
      expect(result.totalOperations).toBe(0);
      expect(result.hitRate).toBe(0);
      
      mockRunScenario.mockRestore();
    });
  });
});