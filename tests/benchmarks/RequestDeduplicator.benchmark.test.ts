import { describe, it, expect, beforeEach } from 'vitest';
import { RequestDeduplicatorBenchmark } from '../../src/benchmarks/RequestDeduplicator.benchmark.js';
import { RequestDeduplicator } from '../../src/utils/RequestDeduplicator.js';

describe('RequestDeduplicatorBenchmark', () => {
  let benchmark: RequestDeduplicatorBenchmark;

  beforeEach(() => {
    benchmark = new RequestDeduplicatorBenchmark();
  });

  describe('benchmark scenarios', () => {
    it('should run maximum concurrent deduplication benchmark', async () => {
      const result = await benchmark.benchmarkMaxConcurrentDeduplication();
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Maximum Concurrent Deduplication');
      expect(result.totalRequests).toBe(1000);
      expect(result.uniqueRequests).toBeLessThanOrEqual(10); // Only 10 unique keys
      expect(result.deduplicationRate).toBeGreaterThan(0.8); // Should have high dedup rate
      expect(result.deduplicatedRequests).toBeGreaterThan(800); // Most requests should be deduplicated
      expect(result.duration).toBeGreaterThan(0);
      expect(result.opsPerSecond).toBeGreaterThan(0);
      expect(result.avgResponseTime).toBeGreaterThan(0);
    });

    it('should run burst traffic pattern benchmark', async () => {
      const result = await benchmark.benchmarkBurstTraffic();
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Burst Traffic Pattern');
      expect(result.totalRequests).toBe(500);
      expect(result.deduplicationRate).toBeGreaterThan(0); // Should have some deduplication
      expect(result.deduplicatedRequests).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should run real-world API pattern benchmark', async () => {
      const result = await benchmark.benchmarkRealWorldAPI();
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Real-World API Pattern');
      expect(result.totalRequests).toBe(300);
      // May have slightly more than 50 unique requests due to randomization
      expect(result.uniqueRequests).toBeLessThanOrEqual(60);
      expect(result.deduplicationRate).toBeGreaterThan(0); // Should have deduplication due to 80/20 rule
      expect(result.avgResponseTime).toBeGreaterThan(50); // Should reflect simulated API delay
    });

    it('should run file reading pattern benchmark', async () => {
      const result = await benchmark.benchmarkFileReadingPattern();
      
      expect(result).toBeDefined();
      expect(result.name).toBe('File Reading Pattern');
      expect(result.totalRequests).toBe(400);
      expect(result.deduplicationRate).toBeGreaterThan(0); // Hot files should be deduplicated
      expect(result.deduplicatedRequests).toBeGreaterThan(0);
    });

    it('should run varying concurrency levels benchmark', async () => {
      const result = await benchmark.benchmarkVaryingConcurrency();
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Varying Concurrency Levels');
      expect(result.totalRequests).toBe(500);
      expect(result.deduplicationRate).toBeGreaterThan(0);
    });

    it('should run TTL expiration effects benchmark', async () => {
      const result = await benchmark.benchmarkTTLExpiration();
      
      expect(result).toBeDefined();
      expect(result.name).toBe('TTL Expiration Effects');
      expect(result.totalRequests).toBe(200);
      // Lower deduplication rate expected due to short TTL
      expect(result.deduplicationRate).toBeGreaterThanOrEqual(0);
      expect(result.deduplicationRate).toBeLessThan(0.9); // Should not be too high due to TTL
    });

    it('should run worst case benchmark', async () => {
      const result = await benchmark.benchmarkWorstCase();
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Worst Case (No Deduplication)');
      expect(result.totalRequests).toBe(100);
      expect(result.uniqueRequests).toBe(100); // Every request is unique
      expect(result.deduplicationRate).toBe(0); // No deduplication possible
      expect(result.deduplicatedRequests).toBe(0);
    });
  });

  describe('deduplication effectiveness', () => {
    it('should show high deduplication for concurrent identical requests', async () => {
      const deduplicator = new RequestDeduplicator(5000);
      let actualRequests = 0;
      
      // Simulate 100 concurrent requests for the same key
      const promises = Array.from({ length: 100 }, () =>
        deduplicator.dedupe('same-key', async () => {
          actualRequests++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return { data: 'response' };
        })
      );
      
      const results = await Promise.all(promises);
      
      // All should get the same response
      expect(results.every(r => r.data === 'response')).toBe(true);
      // Only one actual request should be made
      expect(actualRequests).toBe(1);
      
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(99);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.99, 2);
    });

    it('should show no deduplication for sequential unique requests', async () => {
      const deduplicator = new RequestDeduplicator(5000);
      let actualRequests = 0;
      
      // Sequential unique requests
      for (let i = 0; i < 10; i++) {
        await deduplicator.dedupe(`unique-${i}`, async () => {
          actualRequests++;
          return { id: i };
        });
      }
      
      expect(actualRequests).toBe(10);
      
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(10);
      expect(stats.hitRate).toBe(0);
    });

    it('should handle TTL expiration correctly', async () => {
      const deduplicator = new RequestDeduplicator(100); // 100ms TTL
      let requestCount = 0;
      
      // Launch two concurrent requests for the same key
      const promise1 = deduplicator.dedupe('ttl-test', async () => {
        requestCount++;
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async work
        return 'first';
      });
      
      const promise2 = deduplicator.dedupe('ttl-test', async () => {
        requestCount++;
        return 'second';
      });
      
      // Both should resolve to 'first' since second was deduplicated
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('first');
      expect(result2).toBe('first');
      expect(requestCount).toBe(1); // Only first request executed
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Third request (should not be deduplicated since TTL expired)
      const result3 = await deduplicator.dedupe('ttl-test', async () => {
        requestCount++;
        return 'third';
      });
      
      expect(result3).toBe('third');
      expect(requestCount).toBe(2); // First and third
      
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(1); // Second request was a hit
      expect(stats.misses).toBe(2); // First and third were misses
    });
  });

  describe('performance metrics', () => {
    it('should track average response time correctly', async () => {
      const deduplicator = new RequestDeduplicator(5000);
      const delays = [10, 20, 30, 40, 50];
      
      for (let i = 0; i < delays.length; i++) {
        await deduplicator.dedupe(`key-${i}`, async () => {
          await new Promise(resolve => setTimeout(resolve, delays[i]));
          return i;
        });
      }
      
      const stats = deduplicator.getStats();
      expect(stats.averageResponseTime).toBeGreaterThan(20); // Should be around 30ms
      expect(stats.averageResponseTime).toBeLessThan(40);
    });

    it('should handle concurrent bursts efficiently', async () => {
      const deduplicator = new RequestDeduplicator(5000);
      const burstSize = 50;
      const numBursts = 5;
      let actualRequests = 0;
      
      for (let burst = 0; burst < numBursts; burst++) {
        const promises = Array.from({ length: burstSize }, (_, i) =>
          deduplicator.dedupe(`burst-${i % 10}`, async () => {
            actualRequests++;
            await new Promise(resolve => setTimeout(resolve, 20));
            return { burst, index: i };
          })
        );
        
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay between bursts
      }
      
      // Should have significantly fewer actual requests than total requests
      expect(actualRequests).toBeLessThan(burstSize * numBursts);
      
      const stats = deduplicator.getStats();
      expect(stats.totalRequests).toBe(burstSize * numBursts);
      expect(stats.hitRate).toBeGreaterThan(0.5); // Should have good deduplication
    });
  });

  describe('real-world scenarios', () => {
    it('should effectively deduplicate file metadata requests', async () => {
      const deduplicator = new RequestDeduplicator(10000); // 10 second TTL for stable files
      const files = Array.from({ length: 20 }, (_, i) => `/vault/file-${i}.md`);
      let fileReads = 0;
      
      // Simulate multiple tools accessing the same files
      const tools = ['search', 'index', 'export'];
      const promises: Promise<any>[] = [];
      
      for (const tool of tools) {
        for (const file of files) {
          // 80% chance each tool accesses each file
          if (Math.random() < 0.8) {
            promises.push(
              deduplicator.dedupe(file, async () => {
                fileReads++;
                return { file, size: Math.random() * 10000, tool };
              })
            );
          }
        }
      }
      
      await Promise.all(promises);
      
      // Should read each file at most once
      expect(fileReads).toBeLessThanOrEqual(files.length);
      expect(fileReads).toBeGreaterThan(0);
      
      const stats = deduplicator.getStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0.5); // Good deduplication expected
    });

    it('should handle API endpoint patterns with hot paths', async () => {
      const deduplicator = new RequestDeduplicator(5000);
      const hotEndpoints = ['/api/user', '/api/config', '/api/status'];
      const coldEndpoints = Array.from({ length: 20 }, (_, i) => `/api/data/${i}`);
      let apiCalls = 0;
      
      const requests: Promise<any>[] = [];
      
      // Simulate 100 requests with 80/20 distribution
      for (let i = 0; i < 100; i++) {
        const useHot = Math.random() < 0.8;
        const endpoint = useHot
          ? hotEndpoints[Math.floor(Math.random() * hotEndpoints.length)]
          : coldEndpoints[Math.floor(Math.random() * coldEndpoints.length)];
        
        requests.push(
          deduplicator.dedupe(endpoint, async () => {
            apiCalls++;
            await new Promise(resolve => setTimeout(resolve, 30));
            return { endpoint, data: `response-${i}` };
          })
        );
        
        // Small random delay between requests
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      
      await Promise.all(requests);
      
      // Hot endpoints should be heavily deduplicated
      expect(apiCalls).toBeLessThan(50); // Significant reduction from 100
      
      const stats = deduplicator.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.4); // Good deduplication for hot paths
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle request failures correctly', async () => {
      const deduplicator = new RequestDeduplicator(5000);
      let attempts = 0;
      
      // First request fails
      const promise1 = deduplicator.dedupe('error-test', async () => {
        attempts++;
        throw new Error('Request failed');
      });
      
      // Concurrent request should get the same error
      const promise2 = deduplicator.dedupe('error-test', async () => {
        attempts++;
        throw new Error('Should not be called');
      });
      
      await expect(promise1).rejects.toThrow('Request failed');
      await expect(promise2).rejects.toThrow('Request failed');
      expect(attempts).toBe(1); // Only one actual attempt
      
      // After failure, new request should be attempted
      attempts = 0;
      const promise3 = deduplicator.dedupe('error-test', async () => {
        attempts++;
        return 'success';
      });
      
      expect(await promise3).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should handle very high concurrency gracefully', async () => {
      const deduplicator = new RequestDeduplicator(5000);
      const concurrency = 1000;
      let actualRequests = 0;
      
      const promises = Array.from({ length: concurrency }, (_, i) =>
        deduplicator.dedupe(`key-${i % 10}`, async () => {
          actualRequests++;
          await new Promise(resolve => setTimeout(resolve, 10));
          return i;
        })
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(concurrency);
      expect(actualRequests).toBeLessThanOrEqual(10); // At most 10 unique keys
      expect(deduplicator.size()).toBe(0); // All requests should be completed
    });
  });

  describe('benchmark execution', () => {
    it('should run all benchmarks successfully', async () => {
      // Mock console.log to capture output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));
      
      try {
        await benchmark.runAll();
        
        // Verify all benchmarks ran
        expect(logs.join('\n')).toContain('Maximum Concurrent Deduplication');
        expect(logs.join('\n')).toContain('Burst Traffic Pattern');
        expect(logs.join('\n')).toContain('Real-World API Pattern');
        expect(logs.join('\n')).toContain('File Reading Pattern');
        expect(logs.join('\n')).toContain('Varying Concurrency Levels');
        expect(logs.join('\n')).toContain('TTL Expiration Effects');
        expect(logs.join('\n')).toContain('Worst Case (No Deduplication)');
        
        // Verify summary sections
        expect(logs.join('\n')).toContain('Deduplication Effectiveness:');
        expect(logs.join('\n')).toContain('Performance Insights:');
        expect(logs.join('\n')).toContain('Deduplication Best Practices:');
      } finally {
        console.log = originalLog;
      }
    });
  });
});