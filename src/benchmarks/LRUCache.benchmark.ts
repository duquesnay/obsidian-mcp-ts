import { LRUCache } from '../utils/Cache.js';
import { performance } from 'perf_hooks';
import { LRU_CACHE } from '../constants.js';
import { MemoryTracker } from './utils/MemoryTracker.js';
import { CacheBenchmarkResult } from './utils/BenchmarkTypes.js';

interface CacheBenchmarkConfig {
  cacheSize: number;
  ttl: number;
  iterations: number;
  dataSetSize: number;
}

class LRUCacheBenchmark {
  private results: CacheBenchmarkResult[] = [];

  /**
   * Run a benchmark scenario and collect results with memory tracking
   */
  private async runScenario(
    name: string, 
    config: CacheBenchmarkConfig,
    scenario: (cache: LRUCache<string, any>) => void | Promise<void>
  ): Promise<CacheBenchmarkResult> {
    const cache = new LRUCache<string, any>({
      maxSize: config.cacheSize,
      ttl: config.ttl
    });

    // Reset stats before benchmark
    cache.resetStats();

    // Track memory and performance
    const tracker = new MemoryTracker();
    tracker.start();

    const startTime = performance.now();
    await scenario(cache);
    const endTime = performance.now();

    const memoryResult = tracker.stop();
    const stats = cache.getStats();
    const duration = endTime - startTime;

    return {
      name,
      totalOperations: stats.hits + stats.misses,
      duration,
      opsPerSecond: ((stats.hits + stats.misses) / duration) * 1000,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hitRate,
      averageOperationTime: duration / (stats.hits + stats.misses),
      memory: memoryResult
    };
  }

  /**
   * Benchmark sequential access pattern (best case for LRU)
   */
  async benchmarkSequentialAccess(): Promise<CacheBenchmarkResult> {
    const config: CacheBenchmarkConfig = {
      cacheSize: 1000,
      ttl: LRU_CACHE.NO_EXPIRATION,
      iterations: 10000,
      dataSetSize: 500 // Smaller than cache size
    };

    return this.runScenario('Sequential Access (High Hit Rate)', config, (cache) => {
      // Warm up cache
      for (let i = 0; i < config.dataSetSize; i++) {
        cache.set(`key-${i}`, { data: `value-${i}`, timestamp: Date.now() });
      }

      // Sequential access - should have high hit rate
      for (let iter = 0; iter < config.iterations; iter++) {
        const key = `key-${iter % config.dataSetSize}`;
        cache.get(key);
      }
    });
  }

  /**
   * Benchmark random access pattern with working set larger than cache
   */
  async benchmarkRandomAccessLargeDataset(): Promise<CacheBenchmarkResult> {
    const config: CacheBenchmarkConfig = {
      cacheSize: 100,
      ttl: LRU_CACHE.NO_EXPIRATION,
      iterations: 10000,
      dataSetSize: 1000 // 10x larger than cache
    };

    return this.runScenario('Random Access (Large Dataset)', config, (cache) => {
      // Random access pattern - many cache misses expected
      for (let i = 0; i < config.iterations; i++) {
        const key = `key-${Math.floor(Math.random() * config.dataSetSize)}`;
        let value = cache.get(key);
        
        if (!value) {
          // Cache miss - simulate data fetch and cache
          value = { data: `value-for-${key}`, timestamp: Date.now() };
          cache.set(key, value);
        }
      }
    });
  }

  /**
   * Benchmark with TTL expiration affecting hit rate
   */
  async benchmarkWithTTLExpiration(): Promise<CacheBenchmarkResult> {
    const config: CacheBenchmarkConfig = {
      cacheSize: 500,
      ttl: 100, // 100ms TTL
      iterations: 5000,
      dataSetSize: 200
    };

    return this.runScenario('TTL Expiration Impact', config, (cache) => {
      // Access pattern with delays to trigger TTL expiration
      for (let i = 0; i < config.iterations; i++) {
        const key = `key-${i % config.dataSetSize}`;
        let value = cache.get(key);
        
        if (!value) {
          value = { data: `value-${i}`, timestamp: Date.now() };
          cache.set(key, value);
        }

        // Introduce small delay every 100 iterations to allow some TTL expiration
        if (i % 100 === 0) {
          const delay = 20; // 20ms delay
          const until = performance.now() + delay;
          while (performance.now() < until) {
            // Busy wait
          }
        }
      }
    });
  }

  /**
   * Benchmark working set that fits perfectly in cache (best case)
   */
  async benchmarkOptimalWorkingSet(): Promise<CacheBenchmarkResult> {
    const config: CacheBenchmarkConfig = {
      cacheSize: 500,
      ttl: LRU_CACHE.NO_EXPIRATION,
      iterations: 50000,
      dataSetSize: 500 // Exactly cache size
    };

    return this.runScenario('Optimal Working Set', config, (cache) => {
      // Pre-populate cache
      for (let i = 0; i < config.dataSetSize; i++) {
        cache.set(`key-${i}`, { value: i, cached: true });
      }

      // Access with high locality - should achieve near 100% hit rate
      for (let i = 0; i < config.iterations; i++) {
        // 80% of accesses to 20% of keys (Pareto principle)
        const useHotSet = Math.random() < 0.8;
        const keyIndex = useHotSet 
          ? Math.floor(Math.random() * config.dataSetSize * 0.2)
          : Math.floor(Math.random() * config.dataSetSize);
        
        cache.get(`key-${keyIndex}`);
      }
    });
  }

  /**
   * Benchmark cache thrashing scenario (worst case)
   */
  async benchmarkCacheThrashing(): Promise<CacheBenchmarkResult> {
    const config: CacheBenchmarkConfig = {
      cacheSize: 50,
      ttl: LRU_CACHE.NO_EXPIRATION,
      iterations: 5000,
      dataSetSize: 5000 // 100x larger than cache
    };

    return this.runScenario('Cache Thrashing (Worst Case)', config, (cache) => {
      // Sequential access through large dataset - constant eviction
      for (let i = 0; i < config.iterations; i++) {
        const key = `key-${i % config.dataSetSize}`;
        let value = cache.get(key);
        
        if (!value) {
          value = { index: i, data: new Array(100).fill(i) }; // Larger objects
          cache.set(key, value);
        }
      }
    });
  }

  /**
   * Benchmark real-world file metadata caching scenario
   */
  async benchmarkFileMetadataCaching(): Promise<CacheBenchmarkResult> {
    const config: CacheBenchmarkConfig = {
      cacheSize: 200,
      ttl: 60000, // 1 minute TTL
      iterations: 10000,
      dataSetSize: 500 // Simulating 500 files in vault
    };

    return this.runScenario('File Metadata Caching', config, (cache) => {
      // Simulate realistic file access patterns
      const hotFiles = 50; // Frequently accessed files
      
      for (let i = 0; i < config.iterations; i++) {
        // 70% chance to access hot files, 30% chance for cold files
        const isHotAccess = Math.random() < 0.7;
        const fileIndex = isHotAccess 
          ? Math.floor(Math.random() * hotFiles)
          : hotFiles + Math.floor(Math.random() * (config.dataSetSize - hotFiles));
        
        const path = `/vault/notes/file-${fileIndex}.md`;
        let metadata = cache.get(path);
        
        if (!metadata) {
          // Simulate fetching file metadata
          metadata = {
            path,
            size: Math.floor(Math.random() * 10000),
            modified: Date.now(),
            created: Date.now() - Math.floor(Math.random() * 86400000),
            frontmatter: { tags: ['note', 'cached'], title: `File ${fileIndex}` }
          };
          cache.set(path, metadata);
        }
      }
    });
  }

  /**
   * Run all benchmarks and display results
   */
  async runAll(): Promise<void> {
    console.log('🚀 LRU Cache Hit/Miss Rate Benchmarks\n');
    console.log('=' . repeat(80));

    // Run benchmarks
    this.results.push(await this.benchmarkSequentialAccess());
    this.results.push(await this.benchmarkOptimalWorkingSet());
    this.results.push(await this.benchmarkFileMetadataCaching());
    this.results.push(await this.benchmarkRandomAccessLargeDataset());
    this.results.push(await this.benchmarkWithTTLExpiration());
    this.results.push(await this.benchmarkCacheThrashing());

    // Display results
    this.displayResults();
    this.displaySummary();
  }

  private displayResults(): void {
    console.log('\n📊 Detailed Results:\n');
    
    for (const result of this.results) {
      console.log(`Scenario: ${result.name}`);
      console.log(`${'─' . repeat(result.name.length + 10)}`);
      console.log(`Total Operations: ${result.totalOperations.toLocaleString()}`);
      console.log(`Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`Ops/Second: ${result.opsPerSecond.toFixed(0).toLocaleString()}`);
      console.log(`Cache Hits: ${result.hits.toLocaleString()}`);
      console.log(`Cache Misses: ${result.misses.toLocaleString()}`);
      console.log(`Hit Rate: ${(result.hitRate * 100).toFixed(2)}%`);
      console.log(`Avg Op Time: ${(result.averageOperationTime * 1000).toFixed(3)}µs`);
      
      // Display memory metrics if available
      if (result.memory) {
        console.log('\n' + MemoryTracker.formatResult(result.memory));
      }
      console.log();
    }
  }

  private displaySummary(): void {
    console.log('=' . repeat(80));
    console.log('\n📈 Summary:\n');

    // Sort by hit rate
    const sortedByHitRate = [...this.results].sort((a, b) => b.hitRate - a.hitRate);
    
    console.log('Hit Rate Rankings:');
    sortedByHitRate.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}: ${(result.hitRate * 100).toFixed(2)}%`);
    });

    // Performance insights
    console.log('\n💡 Performance Insights:');
    
    const bestHitRate = sortedByHitRate[0];
    const worstHitRate = sortedByHitRate[sortedByHitRate.length - 1];
    
    console.log(`- Best hit rate: ${bestHitRate.name} (${(bestHitRate.hitRate * 100).toFixed(2)}%)`);
    console.log(`- Worst hit rate: ${worstHitRate.name} (${(worstHitRate.hitRate * 100).toFixed(2)}%)`);
    console.log(`- Hit rate variance: ${((bestHitRate.hitRate - worstHitRate.hitRate) * 100).toFixed(2)}%`);
    
    // Average performance
    const avgOpsPerSec = this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / this.results.length;
    console.log(`- Average throughput: ${avgOpsPerSec.toFixed(0).toLocaleString()} ops/sec`);
    
    // Memory efficiency analysis
    console.log('\n💾 Memory Efficiency:');
    const memoryEfficiencyResults = this.results
      .filter(r => r.memory)
      .map(r => ({
        name: r.name,
        bytesPerOp: r.memory!.delta.heapUsed / r.totalOperations,
        peakUsage: r.memory!.peak.heapUsed
      }))
      .sort((a, b) => a.bytesPerOp - b.bytesPerOp);
    
    if (memoryEfficiencyResults.length > 0) {
      const mostEfficient = memoryEfficiencyResults[0];
      const leastEfficient = memoryEfficiencyResults[memoryEfficiencyResults.length - 1];
      
      console.log(`- Most memory efficient: ${mostEfficient.name} (${mostEfficient.bytesPerOp.toFixed(2)} bytes/op)`);
      console.log(`- Least memory efficient: ${leastEfficient.name} (${leastEfficient.bytesPerOp.toFixed(2)} bytes/op)`);
      console.log(`- Peak memory usage: ${MemoryTracker.formatBytes(Math.max(...memoryEfficiencyResults.map(r => r.peakUsage)))}`);
    }
    
    // Cache efficiency recommendations
    console.log('\n🎯 Cache Tuning Recommendations:');
    console.log('- For sequential access patterns: Large cache with no TTL works best');
    console.log('- For random access: Cache size should match working set size');
    console.log('- For time-sensitive data: Balance TTL with access frequency');
    console.log('- For large datasets: Focus on caching hot data (80/20 rule)');
    console.log('- Monitor memory usage: Peak usage should stay within acceptable limits');
  }
}

// Run benchmarks if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new LRUCacheBenchmark();
  benchmark.runAll().catch(console.error);
}

export { LRUCacheBenchmark };