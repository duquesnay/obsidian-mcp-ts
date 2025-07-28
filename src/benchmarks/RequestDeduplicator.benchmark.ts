import { RequestDeduplicator } from '../utils/RequestDeduplicator.js';
import { performance } from 'perf_hooks';
import { REQUEST_DEDUPLICATOR } from '../constants.js';
import { MemoryTracker } from './utils/MemoryTracker.js';
import { DeduplicatorBenchmarkResult } from './utils/BenchmarkTypes.js';

interface DeduplicatorBenchmarkConfig {
  concurrencyLevel: number;
  totalRequests: number;
  uniqueKeys: number;
  requestDelay: number;
  ttl: number;
}

class RequestDeduplicatorBenchmark {
  private results: DeduplicatorBenchmarkResult[] = [];

  /**
   * Simulate an async operation with configurable delay
   */
  private async simulateAsyncOperation(delay: number, value: any): Promise<any> {
    return new Promise(resolve => {
      setTimeout(() => resolve(value), delay);
    });
  }

  /**
   * Run a benchmark scenario and collect results with memory tracking
   */
  private async runScenario(
    name: string,
    config: DeduplicatorBenchmarkConfig,
    scenario: (deduplicator: RequestDeduplicator) => Promise<void>
  ): Promise<DeduplicatorBenchmarkResult> {
    const deduplicator = new RequestDeduplicator(config.ttl as any);
    
    // Reset stats before benchmark
    deduplicator.resetStats();

    // Track memory and performance
    const tracker = new MemoryTracker();
    tracker.start();

    const startTime = performance.now();
    await scenario(deduplicator);
    const endTime = performance.now();

    const memoryResult = tracker.stop();
    const stats = deduplicator.getStats();
    const duration = endTime - startTime;

    return {
      name,
      totalRequests: stats.totalRequests,
      uniqueRequests: stats.misses,
      deduplicatedRequests: stats.hits,
      duration,
      opsPerSecond: (stats.totalRequests / duration) * 1000,
      deduplicationRate: stats.hitRate,
      avgResponseTime: stats.averageResponseTime,
      memory: memoryResult
    };
  }

  /**
   * Benchmark maximum concurrent deduplication (best case)
   */
  async benchmarkMaxConcurrentDeduplication(): Promise<DeduplicatorBenchmarkResult> {
    const config: DeduplicatorBenchmarkConfig = {
      concurrencyLevel: 100,
      totalRequests: 1000,
      uniqueKeys: 10, // Only 10 unique requests
      requestDelay: 50, // 50ms simulated delay
      ttl: REQUEST_DEDUPLICATOR.DEFAULT_TTL_MS
    };

    return this.runScenario('Maximum Concurrent Deduplication', config, async (deduplicator) => {
      const promises: Promise<any>[] = [];
      
      // Launch all requests concurrently
      for (let i = 0; i < config.totalRequests; i++) {
        const key = `request-${i % config.uniqueKeys}`;
        const promise = deduplicator.dedupe(key, () => 
          this.simulateAsyncOperation(config.requestDelay, { key, timestamp: Date.now() })
        );
        promises.push(promise);
      }

      await Promise.all(promises);
    });
  }

  /**
   * Benchmark burst traffic patterns
   */
  async benchmarkBurstTraffic(): Promise<DeduplicatorBenchmarkResult> {
    const config: DeduplicatorBenchmarkConfig = {
      concurrencyLevel: 50,
      totalRequests: 500,
      uniqueKeys: 20,
      requestDelay: 30,
      ttl: 2000 // Shorter TTL for burst scenarios
    };

    return this.runScenario('Burst Traffic Pattern', config, async (deduplicator) => {
      const burstSize = 50;
      const burstDelay = 100; // 100ms between bursts
      
      for (let burst = 0; burst < config.totalRequests / burstSize; burst++) {
        const burstPromises: Promise<any>[] = [];
        
        // Send a burst of requests
        for (let i = 0; i < burstSize; i++) {
          const key = `burst-${(burst * burstSize + i) % config.uniqueKeys}`;
          const promise = deduplicator.dedupe(key, () =>
            this.simulateAsyncOperation(config.requestDelay, { burst, key })
          );
          burstPromises.push(promise);
        }
        
        await Promise.all(burstPromises);
        
        // Wait between bursts
        if (burst < (config.totalRequests / burstSize) - 1) {
          await this.simulateAsyncOperation(burstDelay, null);
        }
      }
    });
  }

  /**
   * Benchmark real-world API simulation
   */
  async benchmarkRealWorldAPI(): Promise<DeduplicatorBenchmarkResult> {
    const config: DeduplicatorBenchmarkConfig = {
      concurrencyLevel: 30,
      totalRequests: 300,
      uniqueKeys: 50, // 50 different API endpoints
      requestDelay: 100, // 100ms API response time
      ttl: 5000 // 5 second cache
    };

    return this.runScenario('Real-World API Pattern', config, async (deduplicator) => {
      // Simulate multiple components requesting the same API endpoints
      const components = 10;
      const requestsPerComponent = config.totalRequests / components;
      
      const componentPromises = Array.from({ length: components }, async (_, componentId) => {
        const promises: Promise<any>[] = [];
        
        for (let i = 0; i < requestsPerComponent; i++) {
          // 80/20 rule - 80% of requests go to 20% of endpoints
          const isHotEndpoint = Math.random() < 0.8;
          const endpointId = isHotEndpoint 
            ? Math.floor(Math.random() * config.uniqueKeys * 0.2)
            : Math.floor(Math.random() * config.uniqueKeys);
          
          const key = `/api/endpoint/${endpointId}`;
          const promise = deduplicator.dedupe(key, () =>
            this.simulateAsyncOperation(config.requestDelay, {
              endpoint: key,
              component: componentId,
              data: `response-${endpointId}`
            })
          );
          
          promises.push(promise);
          
          // Small delay between requests from same component
          if (i < requestsPerComponent - 1) {
            await this.simulateAsyncOperation(5, null);
          }
        }
        
        return Promise.all(promises);
      });
      
      await Promise.all(componentPromises);
    });
  }

  /**
   * Benchmark varying concurrency levels
   */
  async benchmarkVaryingConcurrency(): Promise<DeduplicatorBenchmarkResult> {
    const config: DeduplicatorBenchmarkConfig = {
      concurrencyLevel: 0, // Will vary
      totalRequests: 500,
      uniqueKeys: 25,
      requestDelay: 40,
      ttl: 3000
    };

    return this.runScenario('Varying Concurrency Levels', config, async (deduplicator) => {
      const concurrencyLevels = [10, 25, 50, 100];
      
      let totalProcessed = 0;
      for (const level of concurrencyLevels) {
        const batchPromises: Promise<any>[] = [];
        const remainingLevels = concurrencyLevels.length - concurrencyLevels.indexOf(level);
        const remainingRequests = config.totalRequests - totalProcessed;
        const batchSize = Math.floor(remainingRequests / remainingLevels);
        
        for (let i = 0; i < batchSize; i++) {
          const key = `concurrent-${(totalProcessed + i) % config.uniqueKeys}`;
          const promise = deduplicator.dedupe(key, () =>
            this.simulateAsyncOperation(config.requestDelay, { level, key })
          );
          batchPromises.push(promise);
        }
        
        totalProcessed += batchSize;
        await Promise.all(batchPromises);
        
        // Brief pause between concurrency level changes
        if (totalProcessed < config.totalRequests) {
          await this.simulateAsyncOperation(20, null);
        }
      }
    });
  }

  /**
   * Benchmark TTL expiration effects
   */
  async benchmarkTTLExpiration(): Promise<DeduplicatorBenchmarkResult> {
    const config: DeduplicatorBenchmarkConfig = {
      concurrencyLevel: 20,
      totalRequests: 200,
      uniqueKeys: 10,
      requestDelay: 30,
      ttl: 100 // Very short TTL - 100ms
    };

    return this.runScenario('TTL Expiration Effects', config, async (deduplicator) => {
      // Send requests with delays to test TTL expiration
      for (let batch = 0; batch < 10; batch++) {
        const batchPromises: Promise<any>[] = [];
        
        for (let i = 0; i < 20; i++) {
          const key = `ttl-test-${i % config.uniqueKeys}`;
          const promise = deduplicator.dedupe(key, () =>
            this.simulateAsyncOperation(config.requestDelay, { batch, key })
          );
          batchPromises.push(promise);
        }
        
        await Promise.all(batchPromises);
        
        // Wait longer than TTL between some batches
        if (batch % 3 === 0) {
          await this.simulateAsyncOperation(150, null); // Longer than TTL
        } else {
          await this.simulateAsyncOperation(50, null); // Within TTL
        }
      }
    });
  }

  /**
   * Benchmark file reading deduplication scenario
   */
  async benchmarkFileReadingPattern(): Promise<DeduplicatorBenchmarkResult> {
    const config: DeduplicatorBenchmarkConfig = {
      concurrencyLevel: 40,
      totalRequests: 400,
      uniqueKeys: 100, // 100 different files
      requestDelay: 20, // Fast file reads
      ttl: 10000 // Long TTL for stable files
    };

    return this.runScenario('File Reading Pattern', config, async (deduplicator) => {
      // Simulate multiple tools reading the same files
      const tools = ['search', 'index', 'analyze', 'backup'];
      const requestsPerTool = config.totalRequests / tools.length;
      
      const toolPromises = tools.map(async (tool) => {
        const promises: Promise<any>[] = [];
        
        for (let i = 0; i < requestsPerTool; i++) {
          // Some files are accessed more frequently
          const fileId = Math.random() < 0.7
            ? Math.floor(Math.random() * 20) // 70% access to 20 hot files
            : Math.floor(Math.random() * config.uniqueKeys);
          
          const key = `/vault/files/file-${fileId}.md`;
          const promise = deduplicator.dedupe(key, () =>
            this.simulateAsyncOperation(config.requestDelay, {
              tool,
              file: key,
              content: `Content of file ${fileId}`
            })
          );
          
          promises.push(promise);
        }
        
        return Promise.all(promises);
      });
      
      await Promise.all(toolPromises);
    });
  }

  /**
   * Benchmark worst-case scenario (no deduplication possible)
   */
  async benchmarkWorstCase(): Promise<DeduplicatorBenchmarkResult> {
    const config: DeduplicatorBenchmarkConfig = {
      concurrencyLevel: 1,
      totalRequests: 100,
      uniqueKeys: 100, // Every request is unique
      requestDelay: 10,
      ttl: 5000
    };

    return this.runScenario('Worst Case (No Deduplication)', config, async (deduplicator) => {
      // Sequential unique requests - no deduplication possible
      for (let i = 0; i < config.totalRequests; i++) {
        const key = `unique-request-${i}`; // Always unique
        await deduplicator.dedupe(key, () =>
          this.simulateAsyncOperation(config.requestDelay, { id: i, unique: true })
        );
      }
    });
  }

  /**
   * Run all benchmarks and display results
   */
  async runAll(): Promise<void> {
    console.log('🚀 Request Deduplicator Concurrent Performance Benchmarks\n');
    console.log('=' . repeat(80));

    // Run benchmarks
    this.results.push(await this.benchmarkMaxConcurrentDeduplication());
    this.results.push(await this.benchmarkBurstTraffic());
    this.results.push(await this.benchmarkRealWorldAPI());
    this.results.push(await this.benchmarkFileReadingPattern());
    this.results.push(await this.benchmarkVaryingConcurrency());
    this.results.push(await this.benchmarkTTLExpiration());
    this.results.push(await this.benchmarkWorstCase());

    // Display results
    this.displayResults();
    this.displaySummary();
  }

  private displayResults(): void {
    console.log('\n📊 Detailed Results:\n');
    
    for (const result of this.results) {
      console.log(`Scenario: ${result.name}`);
      console.log(`${'─' . repeat(result.name.length + 10)}`);
      console.log(`Total Requests: ${result.totalRequests.toLocaleString()}`);
      console.log(`Unique Requests: ${result.uniqueRequests.toLocaleString()}`);
      console.log(`Deduplicated Requests: ${result.deduplicatedRequests.toLocaleString()}`);
      console.log(`Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`Requests/Second: ${result.opsPerSecond.toFixed(0).toLocaleString()}`);
      console.log(`Deduplication Rate: ${(result.deduplicationRate * 100).toFixed(2)}%`);
      console.log(`Average Response Time: ${result.avgResponseTime.toFixed(2)}ms`);
      
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

    // Sort by deduplication rate
    const sortedByDedup = [...this.results].sort((a, b) => b.deduplicationRate - a.deduplicationRate);
    
    console.log('Deduplication Effectiveness:');
    sortedByDedup.forEach((result, index) => {
      const savings = ((result.deduplicatedRequests / result.totalRequests) * 100).toFixed(1);
      console.log(`${index + 1}. ${result.name}: ${(result.deduplicationRate * 100).toFixed(2)}% (saved ${savings}% of requests)`);
    });

    // Performance insights
    console.log('\n💡 Performance Insights:');
    
    const bestDedup = sortedByDedup[0];
    const worstDedup = sortedByDedup[sortedByDedup.length - 1];
    
    console.log(`- Best deduplication: ${bestDedup.name} (${(bestDedup.deduplicationRate * 100).toFixed(2)}%)`);
    console.log(`- Worst deduplication: ${worstDedup.name} (${(worstDedup.deduplicationRate * 100).toFixed(2)}%)`);
    
    // Calculate total savings
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSaved = this.results.reduce((sum, r) => sum + r.deduplicatedRequests, 0);
    console.log(`- Overall savings: ${((totalSaved / totalRequests) * 100).toFixed(1)}% of all requests deduplicated`);
    
    // Average throughput
    const avgThroughput = this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / this.results.length;
    console.log(`- Average throughput: ${avgThroughput.toFixed(0).toLocaleString()} requests/sec`);
    
    // Memory efficiency analysis
    console.log('\n💾 Memory Efficiency:');
    const memoryResults = this.results
      .filter(r => r.memory)
      .map(r => ({
        name: r.name,
        bytesPerRequest: r.memory!.delta.heapUsed / r.totalRequests,
        bytesPerDedupe: r.deduplicatedRequests > 0 ? r.memory!.delta.heapUsed / r.deduplicatedRequests : 0,
        peakUsage: r.memory!.peak.heapUsed
      }))
      .sort((a, b) => a.bytesPerRequest - b.bytesPerRequest);
    
    if (memoryResults.length > 0) {
      const mostEfficient = memoryResults[0];
      const leastEfficient = memoryResults[memoryResults.length - 1];
      
      console.log(`- Most memory efficient: ${mostEfficient.name}`);
      console.log(`  ${mostEfficient.bytesPerRequest.toFixed(2)} bytes/request`);
      console.log(`- Least memory efficient: ${leastEfficient.name}`);
      console.log(`  ${leastEfficient.bytesPerRequest.toFixed(2)} bytes/request`);
      console.log(`- Peak memory usage: ${MemoryTracker.formatBytes(Math.max(...memoryResults.map(r => r.peakUsage)))}`);
    }
    
    // Deduplication recommendations
    console.log('\n🎯 Deduplication Best Practices:');
    console.log('- High concurrency + few unique keys = Maximum deduplication');
    console.log('- Burst traffic patterns benefit greatly from deduplication');
    console.log('- Use longer TTL for stable data, shorter for volatile data');
    console.log('- Monitor deduplication rate to identify optimization opportunities');
    console.log('- Consider combining with caching for even better performance');
    console.log('- Memory overhead is minimal compared to savings from prevented requests');
  }
}

// Run benchmarks if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new RequestDeduplicatorBenchmark();
  benchmark.runAll().catch(console.error);
}

export { RequestDeduplicatorBenchmark };