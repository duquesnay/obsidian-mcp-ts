import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../../src/utils/Cache.js';
import { CachedResourceHandler } from '../../src/resources/CachedResourceHandler.js';
import { BaseResourceHandler } from '../../src/resources/BaseResourceHandler.js';
import { MemoryTracker } from '../../src/benchmarks/utils/MemoryTracker.js';
import { performance } from 'perf_hooks';
import { CACHE_DEFAULTS } from '../../src/constants.js';

/**
 * Comprehensive benchmark comparing cached vs non-cached operations
 * 
 * Tests realistic scenarios to show:
 * 1. Performance differences with/without caching
 * 2. Memory usage tradeoffs
 * 3. Hit rate impact on overall performance
 * 4. When caching is beneficial vs wasteful
 */

interface BenchmarkResult {
  name: string;
  scenario: string;
  totalOperations: number;
  duration: number;
  opsPerSecond: number;
  averageLatency: number;
  memoryUsage?: {
    peak: number;
    delta: number;
    averagePerOp: number;
  };
  cacheStats?: {
    hits: number;
    misses: number;
    hitRate: number;
    finalSize: number;
  };
}

interface ComparisonResult {
  cached: BenchmarkResult;
  nonCached: BenchmarkResult;
  improvement: {
    speedup: number;  // How many times faster (cached/non-cached)
    latencyReduction: number;  // Percentage reduction in latency
    memoryOverheadRatio: number;  // Ratio of memory overhead
    worthwhile: boolean;  // Whether caching is beneficial
  };
}

// Mock resource handler that simulates API calls with realistic delays
class MockResourceHandler extends BaseResourceHandler {
  private callCount = 0;
  private simulatedLatency: number;
  private dataSize: number;

  constructor(simulatedLatencyMs = 50, dataSizeBytes = 1024) {
    super();
    this.simulatedLatency = simulatedLatencyMs;
    this.dataSize = dataSizeBytes;
  }

  async handleRequest(uri: string): Promise<any> {
    this.callCount++;
    
    // Simulate network/disk latency
    await this.delay(this.simulatedLatency);
    
    // Simulate different data sizes for different resource types
    const data = this.generateMockData(uri);
    
    return data;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateMockData(uri: string): any {
    // Generate data based on URI to simulate different resource types
    if (uri.includes('vault://tags')) {
      return Array.from({ length: 50 }, (_, i) => ({
        name: `tag-${i}`,
        count: Math.floor(Math.random() * 100)
      }));
    }
    
    if (uri.includes('vault://note/')) {
      const content = 'x'.repeat(this.dataSize);
      return {
        path: uri.replace('vault://note/', ''),
        content,
        metadata: {
          created: Date.now(),
          modified: Date.now(),
          size: content.length
        }
      };
    }
    
    if (uri.includes('vault://recent')) {
      return Array.from({ length: 20 }, (_, i) => ({
        path: `notes/recent-${i}.md`,
        modified: Date.now() - (i * 3600000), // Hours ago
        size: Math.floor(Math.random() * 5000)
      }));
    }
    
    // Default response
    return { data: 'x'.repeat(this.dataSize), timestamp: Date.now() };
  }

  getCallCount(): number {
    return this.callCount;
  }

  resetCallCount(): void {
    this.callCount = 0;
  }
}

class CacheBenchmarkSuite {
  private mockHandler: MockResourceHandler;
  private cachedHandler: CachedResourceHandler;

  constructor(latencyMs = 50, dataSizeBytes = 1024) {
    this.mockHandler = new MockResourceHandler(latencyMs, dataSizeBytes);
    this.cachedHandler = new CachedResourceHandler(this.mockHandler);
  }

  /**
   * Run a benchmark scenario and collect detailed results
   */
  private async runScenario(
    name: string,
    scenario: string,
    handler: BaseResourceHandler,
    operations: () => Promise<void>,
    trackMemory = true
  ): Promise<BenchmarkResult> {
    // Reset handler state
    this.mockHandler.resetCallCount();
    if (handler instanceof CachedResourceHandler) {
      handler.clearCache();
      handler.resetCacheStats();
    }

    let memoryResult;
    const startTime = performance.now();
    
    if (trackMemory) {
      const tracker = new MemoryTracker();
      tracker.start(50); // Sample every 50ms
      
      await operations();
      
      memoryResult = tracker.stop();
    } else {
      await operations();
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const operationCount = this.mockHandler.getCallCount();

    const result: BenchmarkResult = {
      name,
      scenario,
      totalOperations: operationCount,
      duration,
      opsPerSecond: (operationCount / duration) * 1000,
      averageLatency: duration / operationCount
    };

    if (memoryResult) {
      result.memoryUsage = {
        peak: memoryResult.peak.heapUsed,
        delta: memoryResult.delta.heapUsed,
        averagePerOp: memoryResult.delta.heapUsed / operationCount
      };
    }

    if (handler instanceof CachedResourceHandler) {
      const stats = handler.getCacheStats();
      result.cacheStats = {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate,
        finalSize: stats.size
      };
    }

    return result;
  }

  /**
   * Scenario 1: Sequential access to same resources (high cache hit rate)
   */
  async benchmarkSequentialAccess(): Promise<ComparisonResult> {
    const resources = [
      'vault://tags',
      'vault://note/daily.md',
      'vault://note/projects.md',
      'vault://recent'
    ];
    const iterations = 50; // 200 total operations (50 × 4 resources)

    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < iterations; i++) {
        for (const uri of resources) {
          await handler.handleRequest(uri);
        }
      }
    };

    const [cached, nonCached] = await Promise.all([
      this.runScenario('Cached', 'Sequential Access (High Hit Rate)', this.cachedHandler, () => testOperations(this.cachedHandler)),
      this.runScenario('Non-Cached', 'Sequential Access (High Hit Rate)', this.mockHandler, () => testOperations(this.mockHandler))
    ]);

    return this.calculateImprovement(cached, nonCached);
  }

  /**
   * Scenario 2: Random access to large dataset (low cache hit rate)
   */
  async benchmarkRandomAccess(): Promise<ComparisonResult> {
    const totalResources = 200;
    const iterations = 100;

    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < iterations; i++) {
        const resourceIndex = Math.floor(Math.random() * totalResources);
        const uri = `vault://note/file-${resourceIndex}.md`;
        await handler.handleRequest(uri);
      }
    };

    const [cached, nonCached] = await Promise.all([
      this.runScenario('Cached', 'Random Access (Low Hit Rate)', this.cachedHandler, () => testOperations(this.cachedHandler)),
      this.runScenario('Non-Cached', 'Random Access (Low Hit Rate)', this.mockHandler, () => testOperations(this.mockHandler))
    ]);

    return this.calculateImprovement(cached, nonCached);
  }

  /**
   * Scenario 3: 80/20 access pattern (realistic cache efficiency)
   */
  async benchmarkParetoPrinciple(): Promise<ComparisonResult> {
    const hotResources = ['vault://tags', 'vault://recent', 'vault://note/daily.md', 'vault://note/inbox.md'];
    const coldResources = Array.from({ length: 50 }, (_, i) => `vault://note/archive-${i}.md`);
    const iterations = 100;

    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < iterations; i++) {
        // 80% chance to access hot resources, 20% chance for cold resources
        const useHotResource = Math.random() < 0.8;
        let uri: string;
        
        if (useHotResource) {
          uri = hotResources[Math.floor(Math.random() * hotResources.length)];
        } else {
          uri = coldResources[Math.floor(Math.random() * coldResources.length)];
        }
        
        await handler.handleRequest(uri);
      }
    };

    const [cached, nonCached] = await Promise.all([
      this.runScenario('Cached', '80/20 Access Pattern (Realistic)', this.cachedHandler, () => testOperations(this.cachedHandler)),
      this.runScenario('Non-Cached', '80/20 Access Pattern (Realistic)', this.mockHandler, () => testOperations(this.mockHandler))
    ]);

    return this.calculateImprovement(cached, nonCached);
  }

  /**
   * Scenario 4: Unique access pattern (cache provides no benefit)
   */
  async benchmarkUniqueAccess(): Promise<ComparisonResult> {
    const iterations = 50;

    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < iterations; i++) {
        // Each request is to a unique resource
        const uri = `vault://note/unique-${i}-${Date.now()}.md`;
        await handler.handleRequest(uri);
      }
    };

    const [cached, nonCached] = await Promise.all([
      this.runScenario('Cached', 'Unique Access (No Cache Benefit)', this.cachedHandler, () => testOperations(this.cachedHandler)),
      this.runScenario('Non-Cached', 'Unique Access (No Cache Benefit)', this.mockHandler, () => testOperations(this.mockHandler))
    ]);

    return this.calculateImprovement(cached, nonCached);
  }

  /**
   * Scenario 5: Burst access pattern (cache warming)
   */
  async benchmarkBurstAccess(): Promise<ComparisonResult> {
    const resources = ['vault://tags', 'vault://note/project.md', 'vault://recent'];
    const burstSize = 20;
    const bursts = 3;

    const testOperations = async (handler: BaseResourceHandler) => {
      for (let burst = 0; burst < bursts; burst++) {
        // Burst of requests to same resources
        for (let i = 0; i < burstSize; i++) {
          const uri = resources[i % resources.length];
          await handler.handleRequest(uri);
        }
        
        // Small delay between bursts
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };

    const [cached, nonCached] = await Promise.all([
      this.runScenario('Cached', 'Burst Access (Cache Warming)', this.cachedHandler, () => testOperations(this.cachedHandler)),
      this.runScenario('Non-Cached', 'Burst Access (Cache Warming)', this.mockHandler, () => testOperations(this.mockHandler))
    ]);

    return this.calculateImprovement(cached, nonCached);
  }

  /**
   * Scenario 6: Memory pressure test with large data
   */
  async benchmarkMemoryPressure(): Promise<ComparisonResult> {
    // Create a new suite with larger data sizes to test memory pressure
    const largeSuite = new CacheBenchmarkSuite(50, 10240); // 10KB per resource
    const resources = Array.from({ length: 30 }, (_, i) => `vault://note/large-${i}.md`);
    const iterations = 20;

    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < iterations; i++) {
        for (const uri of resources) {
          await handler.handleRequest(uri);
        }
      }
    };

    const [cached, nonCached] = await Promise.all([
      largeSuite.runScenario('Cached', 'Memory Pressure (Large Data)', largeSuite.cachedHandler, () => testOperations(largeSuite.cachedHandler)),
      largeSuite.runScenario('Non-Cached', 'Memory Pressure (Large Data)', largeSuite.mockHandler, () => testOperations(largeSuite.mockHandler))
    ]);

    return this.calculateImprovement(cached, nonCached);
  }

  private calculateImprovement(cached: BenchmarkResult, nonCached: BenchmarkResult): ComparisonResult {
    const speedup = nonCached.duration / cached.duration;
    const latencyReduction = ((nonCached.averageLatency - cached.averageLatency) / nonCached.averageLatency) * 100;
    
    let memoryOverheadRatio = 1;
    if (cached.memoryUsage && nonCached.memoryUsage) {
      memoryOverheadRatio = cached.memoryUsage.delta / Math.max(nonCached.memoryUsage.delta, 1);
    }

    // Consider caching worthwhile if:
    // 1. At least 1.5x speedup OR
    // 2. At least 25% latency reduction AND hit rate > 50%
    const hitRate = cached.cacheStats?.hitRate || 0;
    const worthwhile = speedup >= 1.5 || (latencyReduction >= 25 && hitRate > 0.5);

    return {
      cached,
      nonCached,
      improvement: {
        speedup,
        latencyReduction,
        memoryOverheadRatio,
        worthwhile
      }
    };
  }

  /**
   * Run all benchmark scenarios and generate comprehensive report
   */
  async runAllBenchmarks(): Promise<ComparisonResult[]> {
    console.log('🚀 Starting Cached vs Non-Cached Performance Benchmarks\n');
    console.log('=' . repeat(80));
    console.log('This benchmark compares performance and memory usage between:');
    console.log('- Cached operations (using LRU cache with TTL)');
    console.log('- Direct operations (no caching)');
    console.log('=' . repeat(80) + '\n');

    const scenarios = [
      { name: 'Sequential Access', method: () => this.benchmarkSequentialAccess() },
      { name: '80/20 Access Pattern', method: () => this.benchmarkParetoPrinciple() },
      { name: 'Burst Access', method: () => this.benchmarkBurstAccess() },
      { name: 'Random Access', method: () => this.benchmarkRandomAccess() },
      { name: 'Unique Access', method: () => this.benchmarkUniqueAccess() },
      { name: 'Memory Pressure', method: () => this.benchmarkMemoryPressure() }
    ];

    const results: ComparisonResult[] = [];

    for (const { name, method } of scenarios) {
      console.log(`Running ${name} benchmark...`);
      const result = await method();
      results.push(result);
      this.displayScenarioResult(result);
      console.log();
    }

    this.displaySummaryReport(results);
    return results;
  }

  private displayScenarioResult(result: ComparisonResult): void {
    const { cached, nonCached, improvement } = result;
    
    console.log(`📊 ${cached.scenario}`);
    console.log('─'.repeat(cached.scenario.length + 3));
    
    // Performance comparison
    console.log('\nPerformance:');
    console.log(`  Non-Cached: ${nonCached.duration.toFixed(2)}ms (${nonCached.opsPerSecond.toFixed(0)} ops/sec)`);
    console.log(`  Cached:     ${cached.duration.toFixed(2)}ms (${cached.opsPerSecond.toFixed(0)} ops/sec)`);
    console.log(`  Speedup:    ${improvement.speedup.toFixed(2)}x ${improvement.speedup >= 1.5 ? '✅' : '⚠️'}`);
    console.log(`  Latency:    ${improvement.latencyReduction.toFixed(1)}% reduction`);
    
    // Cache statistics
    if (cached.cacheStats) {
      console.log('\nCache Statistics:');
      console.log(`  Hit Rate:   ${(cached.cacheStats.hitRate * 100).toFixed(1)}%`);
      console.log(`  Hits:       ${cached.cacheStats.hits}`);
      console.log(`  Misses:     ${cached.cacheStats.misses}`);
      console.log(`  Final Size: ${cached.cacheStats.finalSize} entries`);
    }
    
    // Memory usage
    if (cached.memoryUsage && nonCached.memoryUsage) {
      console.log('\nMemory Usage:');
      console.log(`  Non-Cached: ${MemoryTracker.formatBytes(nonCached.memoryUsage.delta)}`);
      console.log(`  Cached:     ${MemoryTracker.formatBytes(cached.memoryUsage.delta)}`);
      console.log(`  Overhead:   ${(improvement.memoryOverheadRatio).toFixed(2)}x`);
      console.log(`  Per Op:     ${MemoryTracker.formatBytes(cached.memoryUsage.averagePerOp)}`);
    }
    
    // Recommendation
    console.log('\nRecommendation:');
    if (improvement.worthwhile) {
      console.log(`  ✅ Caching is beneficial for this access pattern`);
      if (cached.cacheStats && cached.cacheStats.hitRate > 0.8) {
        console.log(`  💡 High hit rate suggests this workload is ideal for caching`);
      }
    } else {
      console.log(`  ❌ Caching provides minimal benefit for this access pattern`);
      if (cached.cacheStats && cached.cacheStats.hitRate < 0.3) {
        console.log(`  💡 Low hit rate suggests cache thrashing - consider disabling cache`);
      }
    }
  }

  private displaySummaryReport(results: ComparisonResult[]): void {
    console.log('=' . repeat(80));
    console.log('\n📈 SUMMARY REPORT\n');
    
    // Overall statistics
    const avgSpeedup = results.reduce((sum, r) => sum + r.improvement.speedup, 0) / results.length;
    const beneficialScenarios = results.filter(r => r.improvement.worthwhile).length;
    const bestScenario = results.reduce((best, current) => 
      current.improvement.speedup > best.improvement.speedup ? current : best
    );
    const worstScenario = results.reduce((worst, current) => 
      current.improvement.speedup < worst.improvement.speedup ? current : worst
    );

    console.log('Performance Summary:');
    console.log(`  Average Speedup:      ${avgSpeedup.toFixed(2)}x`);
    console.log(`  Beneficial Scenarios: ${beneficialScenarios}/${results.length}`);
    console.log(`  Best Case:           ${bestScenario.cached.scenario} (${bestScenario.improvement.speedup.toFixed(2)}x)`);
    console.log(`  Worst Case:          ${worstScenario.cached.scenario} (${worstScenario.improvement.speedup.toFixed(2)}x)`);

    // Hit rate analysis
    console.log('\nCache Hit Rate Analysis:');
    results.forEach(result => {
      const hitRate = result.cached.cacheStats?.hitRate || 0;
      const status = hitRate > 0.7 ? '🟢' : hitRate > 0.4 ? '🟡' : '🔴';
      console.log(`  ${status} ${result.cached.scenario}: ${(hitRate * 100).toFixed(1)}%`);
    });

    // Memory efficiency
    console.log('\nMemory Efficiency:');
    const avgMemoryOverhead = results
      .filter(r => r.improvement.memoryOverheadRatio > 0)
      .reduce((sum, r) => sum + r.improvement.memoryOverheadRatio, 0) / results.length;
    
    console.log(`  Average Memory Overhead: ${avgMemoryOverhead.toFixed(2)}x`);
    
    const efficientScenarios = results.filter(r => r.improvement.memoryOverheadRatio < 2).length;
    console.log(`  Memory Efficient:        ${efficientScenarios}/${results.length} scenarios`);

    console.log('\n🎯 RECOMMENDATIONS:\n');
    
    console.log('When to Enable Caching:');
    console.log('  ✅ Sequential or repeated access to same resources');
    console.log('  ✅ 80/20 access patterns (frequent access to small subset)');
    console.log('  ✅ Burst workloads with resource reuse');
    console.log('  ✅ When cache hit rate > 50%');
    
    console.log('\nWhen to Disable Caching:');
    console.log('  ❌ Unique access patterns (each request is different)');
    console.log('  ❌ When cache hit rate < 30%');
    console.log('  ❌ Memory-constrained environments with large data');
    console.log('  ❌ When memory overhead > 3x without significant speedup');
    
    console.log('\nCache Configuration Guidelines:');
    console.log(`  • Fast-changing data: TTL = ${CACHE_DEFAULTS.FAST_TTL/1000}s`);
    console.log(`  • Stable data: TTL = ${CACHE_DEFAULTS.STABLE_TTL/1000}s`);
    console.log(`  • Individual notes: TTL = ${CACHE_DEFAULTS.NOTE_TTL/1000}s`);
    console.log(`  • Cache size: ${CACHE_DEFAULTS.MAX_SIZE} entries (adjust based on memory)`);
    
    console.log('\nPerformance Monitoring:');
    console.log('  📊 Monitor hit rate - aim for > 60% for optimal benefit');
    console.log('  🧠 Track memory usage - ensure overhead is justified');
    console.log('  ⏱️  Measure latency reduction - should be > 25% for worthwhile caching');
    console.log('  🔄 Review access patterns regularly to tune cache settings');
    
    console.log('\n' + '=' . repeat(80));
  }
}

describe('Cached vs Non-Cached Performance Benchmark', () => {
  it('should demonstrate performance differences between cached and non-cached operations', async () => {
    const benchmark = new CacheBenchmarkSuite();
    const results = await benchmark.runAllBenchmarks();
    
    // Verify we got results for all scenarios
    expect(results).toHaveLength(6);
    
    // At least some scenarios should benefit from caching
    const beneficialScenarios = results.filter(r => r.improvement.worthwhile);
    expect(beneficialScenarios.length).toBeGreaterThan(0);
    
    // Sequential access should show significant improvement
    const sequentialResult = results.find(r => r.cached.scenario.includes('Sequential'));
    expect(sequentialResult).toBeDefined();
    expect(sequentialResult!.improvement.speedup).toBeGreaterThan(1.5);
    
    // Unique access should show minimal improvement (cache provides no benefit)
    const uniqueResult = results.find(r => r.cached.scenario.includes('Unique'));
    expect(uniqueResult).toBeDefined();
    expect(uniqueResult!.cached.cacheStats?.hitRate).toBeLessThan(0.1);
  }, 60000); // 60 second timeout for comprehensive benchmark
});