#!/usr/bin/env tsx

/**
 * Standalone Cache Performance Benchmark
 * 
 * This script runs comprehensive benchmarks comparing cached vs non-cached operations
 * to help understand when caching is beneficial and when it should be avoided.
 * 
 * Usage:
 *   npx tsx scripts/run-cache-benchmark.ts
 *   
 * Or run specific scenarios:
 *   npx tsx scripts/run-cache-benchmark.ts --scenario sequential
 *   npx tsx scripts/run-cache-benchmark.ts --scenario random
 *   npx tsx scripts/run-cache-benchmark.ts --scenario unique
 */

import { LRUCache } from '../src/utils/Cache.js';
import { CachedResourceHandler } from '../src/resources/CachedResourceHandler.js';
import { BaseResourceHandler } from '../src/resources/BaseResourceHandler.js';
import { MemoryTracker } from '../src/benchmarks/utils/MemoryTracker.js';
import { performance } from 'perf_hooks';
import { CACHE_DEFAULTS } from '../src/constants.js';

interface BenchmarkConfig {
  latencyMs: number;
  dataSizeBytes: number;
  iterations: number;
  enableMemoryTracking: boolean;
}

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
    speedup: number;
    latencyReduction: number;
    memoryOverheadRatio: number;
    worthwhile: boolean;
  };
}

// Mock resource handler for benchmarking
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
    
    // Simulate realistic API latency
    await this.delay(this.simulatedLatency);
    
    return this.generateMockData(uri);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateMockData(uri: string): any {
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
        metadata: { created: Date.now(), modified: Date.now(), size: content.length }
      };
    }
    
    if (uri.includes('vault://recent')) {
      return Array.from({ length: 20 }, (_, i) => ({
        path: `notes/recent-${i}.md`,
        modified: Date.now() - (i * 3600000),
        size: Math.floor(Math.random() * 5000)
      }));
    }
    
    return { data: 'x'.repeat(this.dataSize), timestamp: Date.now() };
  }

  getCallCount(): number { return this.callCount; }
  resetCallCount(): void { this.callCount = 0; }
}

class CacheBenchmarkRunner {
  private mockHandler: MockResourceHandler;
  private cachedHandler: CachedResourceHandler;
  private config: BenchmarkConfig;

  constructor(config: BenchmarkConfig) {
    this.config = config;
    this.mockHandler = new MockResourceHandler(config.latencyMs, config.dataSizeBytes);
    this.cachedHandler = new CachedResourceHandler(this.mockHandler);
  }

  private async runScenario(
    name: string,
    scenario: string,
    handler: BaseResourceHandler,
    operations: () => Promise<void>
  ): Promise<BenchmarkResult> {
    this.mockHandler.resetCallCount();
    if (handler instanceof CachedResourceHandler) {
      handler.clearCache();
      handler.resetCacheStats();
    }

    let memoryResult;
    const startTime = performance.now();
    
    if (this.config.enableMemoryTracking) {
      const tracker = new MemoryTracker();
      tracker.start(50);
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

  async benchmarkSequentialAccess(): Promise<ComparisonResult> {
    const resources = ['vault://tags', 'vault://note/daily.md', 'vault://note/projects.md', 'vault://recent'];
    
    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < this.config.iterations; i++) {
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

  async benchmarkRandomAccess(): Promise<ComparisonResult> {
    const totalResources = 200;
    
    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < this.config.iterations; i++) {
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

  async benchmarkUniqueAccess(): Promise<ComparisonResult> {
    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < this.config.iterations; i++) {
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

  async benchmarkParetoAccess(): Promise<ComparisonResult> {
    const hotResources = ['vault://tags', 'vault://recent', 'vault://note/daily.md', 'vault://note/inbox.md'];
    const coldResources = Array.from({ length: 50 }, (_, i) => `vault://note/archive-${i}.md`);
    
    const testOperations = async (handler: BaseResourceHandler) => {
      for (let i = 0; i < this.config.iterations; i++) {
        const useHotResource = Math.random() < 0.8;
        const uri = useHotResource 
          ? hotResources[Math.floor(Math.random() * hotResources.length)]
          : coldResources[Math.floor(Math.random() * coldResources.length)];
        
        await handler.handleRequest(uri);
      }
    };

    const [cached, nonCached] = await Promise.all([
      this.runScenario('Cached', '80/20 Access Pattern (Realistic)', this.cachedHandler, () => testOperations(this.cachedHandler)),
      this.runScenario('Non-Cached', '80/20 Access Pattern (Realistic)', this.mockHandler, () => testOperations(this.mockHandler))
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

  private displayResult(result: ComparisonResult): void {
    const { cached, nonCached, improvement } = result;
    
    console.log(`\n📊 ${cached.scenario}`);
    console.log('─'.repeat(cached.scenario.length + 3));
    
    console.log('\nPerformance:');
    console.log(`  Non-Cached: ${nonCached.duration.toFixed(2)}ms (${nonCached.opsPerSecond.toFixed(0)} ops/sec)`);
    console.log(`  Cached:     ${cached.duration.toFixed(2)}ms (${cached.opsPerSecond.toFixed(0)} ops/sec)`);
    console.log(`  Speedup:    ${improvement.speedup.toFixed(2)}x ${improvement.speedup >= 1.5 ? '✅' : '⚠️'}`);
    console.log(`  Latency:    ${improvement.latencyReduction.toFixed(1)}% reduction`);
    
    if (cached.cacheStats) {
      console.log('\nCache Statistics:');
      console.log(`  Hit Rate:   ${(cached.cacheStats.hitRate * 100).toFixed(1)}%`);
      console.log(`  Hits:       ${cached.cacheStats.hits}`);
      console.log(`  Misses:     ${cached.cacheStats.misses}`);
      console.log(`  Final Size: ${cached.cacheStats.finalSize} entries`);
    }
    
    if (cached.memoryUsage && nonCached.memoryUsage) {
      console.log('\nMemory Usage:');
      console.log(`  Non-Cached: ${MemoryTracker.formatBytes(nonCached.memoryUsage.delta)}`);
      console.log(`  Cached:     ${MemoryTracker.formatBytes(cached.memoryUsage.delta)}`);
      console.log(`  Overhead:   ${(improvement.memoryOverheadRatio).toFixed(2)}x`);
    }
    
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

  async runBenchmark(scenarioName?: string): Promise<ComparisonResult[]> {
    console.log('🚀 Cache Performance Benchmark\n');
    console.log(`Configuration:`);
    console.log(`  Simulated Latency: ${this.config.latencyMs}ms`);
    console.log(`  Data Size:         ${MemoryTracker.formatBytes(this.config.dataSizeBytes)}`);
    console.log(`  Iterations:        ${this.config.iterations}`);
    console.log(`  Memory Tracking:   ${this.config.enableMemoryTracking ? 'Enabled' : 'Disabled'}`);
    console.log('\n' + '='.repeat(80));

    const scenarios = new Map([
      ['sequential', { name: 'Sequential Access', method: () => this.benchmarkSequentialAccess() }],
      ['pareto', { name: '80/20 Pattern', method: () => this.benchmarkParetoAccess() }],
      ['random', { name: 'Random Access', method: () => this.benchmarkRandomAccess() }],
      ['unique', { name: 'Unique Access', method: () => this.benchmarkUniqueAccess() }]
    ]);

    const results: ComparisonResult[] = [];

    if (scenarioName && scenarios.has(scenarioName)) {
      const scenario = scenarios.get(scenarioName)!;
      console.log(`\nRunning ${scenario.name} benchmark...`);
      const result = await scenario.method();
      results.push(result);
      this.displayResult(result);
    } else {
      for (const [key, scenario] of scenarios) {
        console.log(`\nRunning ${scenario.name} benchmark...`);
        const result = await scenario.method();
        results.push(result);
        this.displayResult(result);
      }
    }

    if (results.length > 1) {
      this.displaySummary(results);
    }

    return results;
  }

  private displaySummary(results: ComparisonResult[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('\n📈 PERFORMANCE SUMMARY\n');
    
    const avgSpeedup = results.reduce((sum, r) => sum + r.improvement.speedup, 0) / results.length;
    const beneficialScenarios = results.filter(r => r.improvement.worthwhile).length;
    
    console.log(`Average Speedup:      ${avgSpeedup.toFixed(2)}x`);
    console.log(`Beneficial Scenarios: ${beneficialScenarios}/${results.length}`);
    
    console.log('\nHit Rate Analysis:');
    results.forEach(result => {
      const hitRate = result.cached.cacheStats?.hitRate || 0;
      const status = hitRate > 0.7 ? '🟢' : hitRate > 0.4 ? '🟡' : '🔴';
      console.log(`  ${status} ${result.cached.scenario}: ${(hitRate * 100).toFixed(1)}%`);
    });

    console.log('\n🎯 RECOMMENDATIONS:\n');
    console.log('✅ Enable caching when:');
    console.log('   • Hit rate > 60%');
    console.log('   • Repeated access to same resources');
    console.log('   • 80/20 access patterns');
    console.log('   • Speedup > 1.5x');
    
    console.log('\n❌ Disable caching when:');
    console.log('   • Hit rate < 30%');
    console.log('   • Unique access patterns');
    console.log('   • Memory overhead > 3x without speedup');
    console.log('   • Cache thrashing occurs');
    
    console.log('\n' + '='.repeat(80));
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  let scenario: string | undefined;
  let iterations = 50;
  let latencyMs = 50;
  let dataSizeBytes = 1024;
  let enableMemoryTracking = true;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scenario':
      case '-s':
        scenario = args[++i];
        break;
      case '--iterations':
      case '-i':
        iterations = parseInt(args[++i]) || 50;
        break;
      case '--latency':
      case '-l':
        latencyMs = parseInt(args[++i]) || 50;
        break;
      case '--data-size':
      case '-d':
        dataSizeBytes = parseInt(args[++i]) || 1024;
        break;
      case '--no-memory':
        enableMemoryTracking = false;
        break;
      case '--help':
      case '-h':
        console.log(`
Cache Performance Benchmark

Usage:
  npx tsx scripts/run-cache-benchmark.ts [options]

Options:
  -s, --scenario <name>    Run specific scenario (sequential, pareto, random, unique)
  -i, --iterations <num>   Number of iterations per scenario (default: 50)
  -l, --latency <ms>       Simulated API latency in milliseconds (default: 50)
  -d, --data-size <bytes>  Size of mock data in bytes (default: 1024)
  --no-memory              Disable memory tracking for faster benchmarks
  -h, --help               Show this help message

Examples:
  npx tsx scripts/run-cache-benchmark.ts
  npx tsx scripts/run-cache-benchmark.ts --scenario sequential
  npx tsx scripts/run-cache-benchmark.ts --iterations 100 --latency 25
  npx tsx scripts/run-cache-benchmark.ts --data-size 10240 --no-memory
        `);
        process.exit(0);
        break;
    }
  }

  const config: BenchmarkConfig = {
    latencyMs,
    dataSizeBytes,
    iterations,
    enableMemoryTracking
  };

  try {
    const runner = new CacheBenchmarkRunner(config);
    await runner.runBenchmark(scenario);
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CacheBenchmarkRunner, BenchmarkConfig, ComparisonResult };