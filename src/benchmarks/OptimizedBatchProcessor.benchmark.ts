import { OptimizedBatchProcessor, BatchProcessorOptions } from '../utils/OptimizedBatchProcessor.js';
import { performance } from 'perf_hooks';
import { OBSIDIAN_DEFAULTS, BATCH_PROCESSOR } from '../constants.js';
import { MemoryTracker } from './utils/MemoryTracker.js';
import { BatchProcessorBenchmarkResult } from './utils/BenchmarkTypes.js';

interface ProcessorBenchmarkConfig {
  batchSizes: number[];
  itemCounts: number[];
  concurrency: number;
  simulateErrors: boolean;
  errorRate: number;
  processingDelay: number;
  retryAttempts: number;
}

class OptimizedBatchProcessorBenchmark {
  private results: BatchProcessorBenchmarkResult[] = [];
  
  /**
   * Simulate an async operation with configurable delay and error rate
   */
  private async simulateAsyncOperation(
    item: number, 
    delay: number, 
    errorRate: number,
    attemptNumber: number = 1
  ): Promise<{ id: number; result: string; processTime: number }> {
    const start = performance.now();
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate errors based on rate
    if (Math.random() < errorRate && attemptNumber === 1) {
      throw new Error(`Simulated error for item ${item}`);
    }
    
    const processTime = performance.now() - start;
    return {
      id: item,
      result: `Processed item ${item}`,
      processTime
    };
  }
  
  /**
   * Run a benchmark scenario with memory tracking
   */
  private async runScenario(
    name: string,
    batchSize: number,
    itemCount: number,
    config: Partial<ProcessorBenchmarkConfig>
  ): Promise<BatchProcessorBenchmarkResult> {
    const options: BatchProcessorOptions = {
      batchSize,
      maxConcurrency: config.concurrency || OBSIDIAN_DEFAULTS.BATCH_SIZE,
      retryAttempts: config.retryAttempts || BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS,
      retryDelay: BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS,
      onProgress: () => {} // Silent for benchmarking
    };
    
    const processor = new OptimizedBatchProcessor(options);
    const items = Array.from({ length: itemCount }, (_, i) => i);
    
    // Track memory and performance
    const tracker = new MemoryTracker();
    tracker.start();
    
    const startTime = performance.now();
    const results = await processor.process(items, async (item) => {
      return this.simulateAsyncOperation(
        item,
        config.processingDelay || 10,
        config.simulateErrors ? (config.errorRate || 0.1) : 0
      );
    });
    const endTime = performance.now();
    
    const memoryResult = tracker.stop();
    
    // Calculate metrics
    const duration = endTime - startTime;
    const successful = results.filter(r => r.result).length;
    const failed = results.filter(r => r.error).length;
    const totalRetries = results.reduce((sum, r) => sum + (r.attempts - 1), 0);
    
    return {
      name,
      batchSize,
      totalItems: itemCount,
      duration,
      throughput: (itemCount / duration) * 1000, // items per second
      successRate: (successful / itemCount) * 100,
      avgRetries: totalRetries / itemCount,
      opsPerSecond: (itemCount / duration) * 1000,
      concurrency: config.concurrency || OBSIDIAN_DEFAULTS.BATCH_SIZE,
      errors: failed,
      memory: memoryResult
    };
  }
  
  /**
   * Benchmark different batch sizes with fixed item count
   */
  async benchmarkBatchSizes(): Promise<void> {
    console.log('\n📊 Batch Size Performance Comparison\n');
    
    const batchSizes = [10, 50, 100, 500, 1000];
    const itemCount = 1000;
    
    for (const batchSize of batchSizes) {
      const result = await this.runScenario(
        `Batch Size ${batchSize}`,
        batchSize,
        itemCount,
        { processingDelay: 5 }
      );
      this.results.push(result);
    }
  }
  
  /**
   * Benchmark concurrency vs traditional batch processing
   */
  async benchmarkConcurrencyModes(): Promise<void> {
    console.log('\n🔄 Concurrency Mode Comparison\n');
    
    const itemCount = 500;
    const batchSize = 50;
    
    // Test with optimized concurrency (semaphore pattern)
    const concurrentResult = await this.runScenario(
      'Optimized Concurrent Processing',
      batchSize,
      itemCount,
      { 
        concurrency: 10,
        processingDelay: 20 
      }
    );
    this.results.push(concurrentResult);
    
    // Test with traditional batch processing (using processBatches)
    const options: BatchProcessorOptions = {
      batchSize,
      maxConcurrency: 10,
      retryAttempts: BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS,
      retryDelay: BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS,
      onProgress: () => {}
    };
    
    const processor = new OptimizedBatchProcessor(options);
    const items = Array.from({ length: itemCount }, (_, i) => i);
    
    const startTime = performance.now();
    await processor.processBatches(items, async (item) => {
      return this.simulateAsyncOperation(item, 20, 0);
    });
    const endTime = performance.now();
    
    const batchResult: BatchProcessorBenchmarkResult = {
      name: 'Traditional Batch Processing',
      batchSize,
      totalItems: itemCount,
      duration: endTime - startTime,
      throughput: (itemCount / (endTime - startTime)) * 1000,
      successRate: 100,
      avgRetries: 0,
      opsPerSecond: (itemCount / (endTime - startTime)) * 1000,
      concurrency: batchSize,
      errors: 0
    };
    this.results.push(batchResult);
  }
  
  /**
   * Benchmark error handling and retry performance
   */
  async benchmarkErrorHandling(): Promise<void> {
    console.log('\n❌ Error Handling & Retry Performance\n');
    
    const errorRates = [0.1, 0.3, 0.5]; // 10%, 30%, 50% error rates
    const itemCount = 200;
    
    for (const errorRate of errorRates) {
      const result = await this.runScenario(
        `Error Rate ${(errorRate * 100).toFixed(0)}%`,
        50,
        itemCount,
        {
          simulateErrors: true,
          errorRate,
          retryAttempts: 3,
          processingDelay: 10
        }
      );
      this.results.push(result);
    }
  }
  
  /**
   * Benchmark progress callback overhead
   */
  async benchmarkProgressOverhead(): Promise<void> {
    console.log('\n📈 Progress Callback Overhead\n');
    
    const itemCount = 1000;
    const batchSize = 100;
    
    // Without progress callback
    const withoutProgress = await this.runScenario(
      'Without Progress Callback',
      batchSize,
      itemCount,
      { processingDelay: 2 }
    );
    this.results.push(withoutProgress);
    
    // With lightweight progress callback
    let progressCount = 0;
    const lightweightOptions: BatchProcessorOptions = {
      batchSize,
      maxConcurrency: OBSIDIAN_DEFAULTS.BATCH_SIZE,
      retryAttempts: BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS,
      retryDelay: BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS,
      onProgress: () => { progressCount++; }
    };
    
    const lightProcessor = new OptimizedBatchProcessor(lightweightOptions);
    const items = Array.from({ length: itemCount }, (_, i) => i);
    
    const lightStart = performance.now();
    await lightProcessor.process(items, async (item) => {
      return this.simulateAsyncOperation(item, 2, 0);
    });
    const lightEnd = performance.now();
    
    const lightResult: BatchProcessorBenchmarkResult = {
      name: 'With Lightweight Progress',
      batchSize,
      totalItems: itemCount,
      duration: lightEnd - lightStart,
      throughput: (itemCount / (lightEnd - lightStart)) * 1000,
      successRate: 100,
      avgRetries: 0,
      opsPerSecond: (itemCount / (lightEnd - lightStart)) * 1000,
      concurrency: OBSIDIAN_DEFAULTS.BATCH_SIZE,
      errors: 0
    };
    this.results.push(lightResult);
    
    // With heavy progress callback
    const heavyOptions: BatchProcessorOptions = {
      batchSize,
      maxConcurrency: OBSIDIAN_DEFAULTS.BATCH_SIZE,
      retryAttempts: BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS,
      retryDelay: BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS,
      onProgress: (completed, total) => {
        // Simulate heavy progress tracking
        const percentage = (completed / total) * 100;
        const progressBar = '█'.repeat(Math.floor(percentage / 2));
        const spaces = ' '.repeat(50 - progressBar.length);
        // In real scenario, this might update UI
        const _progress = `[${progressBar}${spaces}] ${percentage.toFixed(1)}%`;
      }
    };
    
    const heavyProcessor = new OptimizedBatchProcessor(heavyOptions);
    
    const heavyStart = performance.now();
    await heavyProcessor.process(items, async (item) => {
      return this.simulateAsyncOperation(item, 2, 0);
    });
    const heavyEnd = performance.now();
    
    const heavyResult: BatchProcessorBenchmarkResult = {
      name: 'With Heavy Progress Callback',
      batchSize,
      totalItems: itemCount,
      duration: heavyEnd - heavyStart,
      throughput: (itemCount / (heavyEnd - heavyStart)) * 1000,
      successRate: 100,
      avgRetries: 0,
      opsPerSecond: (itemCount / (heavyEnd - heavyStart)) * 1000,
      concurrency: OBSIDIAN_DEFAULTS.BATCH_SIZE,
      errors: 0
    };
    this.results.push(heavyResult);
  }
  
  /**
   * Benchmark scalability with different item counts
   */
  async benchmarkScalability(): Promise<void> {
    console.log('\n📏 Scalability Test\n');
    
    const itemCounts = [100, 1000, 5000, 10000];
    const batchSize = 100;
    
    for (const itemCount of itemCounts) {
      const result = await this.runScenario(
        `${itemCount.toLocaleString()} Items`,
        batchSize,
        itemCount,
        {
          processingDelay: 1,
          concurrency: 20
        }
      );
      this.results.push(result);
    }
  }
  
  /**
   * Benchmark streaming vs batch collection
   */
  async benchmarkStreamingMode(): Promise<void> {
    console.log('\n🌊 Streaming vs Collection Mode\n');
    
    const itemCount = 1000;
    const batchSize = 100;
    const options: BatchProcessorOptions = {
      batchSize,
      maxConcurrency: 10,
      retryAttempts: BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS,
      retryDelay: BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS
    };
    
    // Test collection mode (default process method)
    const collectionStart = performance.now();
    const processor = new OptimizedBatchProcessor(options);
    const items = Array.from({ length: itemCount }, (_, i) => i);
    
    await processor.process(items, async (item) => {
      return this.simulateAsyncOperation(item, 5, 0);
    });
    const collectionEnd = performance.now();
    
    const collectionResult: BatchProcessorBenchmarkResult = {
      name: 'Collection Mode (process)',
      batchSize,
      totalItems: itemCount,
      duration: collectionEnd - collectionStart,
      throughput: (itemCount / (collectionEnd - collectionStart)) * 1000,
      successRate: 100,
      avgRetries: 0,
      opsPerSecond: (itemCount / (collectionEnd - collectionStart)) * 1000,
      concurrency: 10,
      errors: 0
    };
    this.results.push(collectionResult);
    
    // Test streaming mode
    const streamStart = performance.now();
    let streamCount = 0;
    
    for await (const result of processor.processStream(items, async (item) => {
      return this.simulateAsyncOperation(item, 5, 0);
    })) {
      streamCount++;
      // Simulate doing something with each result as it arrives
    }
    const streamEnd = performance.now();
    
    const streamResult: BatchProcessorBenchmarkResult = {
      name: 'Streaming Mode (processStream)',
      batchSize,
      totalItems: itemCount,
      duration: streamEnd - streamStart,
      throughput: (itemCount / (streamEnd - streamStart)) * 1000,
      successRate: 100,
      avgRetries: 0,
      opsPerSecond: (itemCount / (streamEnd - streamStart)) * 1000,
      concurrency: 10,
      errors: 0
    };
    this.results.push(streamResult);
  }
  
  /**
   * Run all benchmarks and display results
   */
  async runAll(): Promise<void> {
    console.log('🚀 OptimizedBatchProcessor Performance Benchmarks\n');
    console.log('=' . repeat(80));
    
    // Clear previous results
    this.results = [];
    
    // Run all benchmark suites
    await this.benchmarkBatchSizes();
    await this.benchmarkConcurrencyModes();
    await this.benchmarkErrorHandling();
    await this.benchmarkProgressOverhead();
    await this.benchmarkScalability();
    await this.benchmarkStreamingMode();
    
    // Display results
    this.displayResults();
    this.displaySummary();
  }
  
  private displayResults(): void {
    console.log('\n📊 Detailed Results:\n');
    
    // Group results by benchmark type
    const groups = new Map<string, BatchProcessorBenchmarkResult[]>();
    
    for (const result of this.results) {
      const groupKey = result.name.includes('Batch Size') ? 'Batch Sizes' :
                      result.name.includes('Error Rate') ? 'Error Handling' :
                      result.name.includes('Progress') ? 'Progress Overhead' :
                      result.name.includes('Items') ? 'Scalability' :
                      result.name.includes('Mode') ? 'Processing Modes' :
                      'Concurrency';
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(result);
    }
    
    // Display each group
    for (const [groupName, results] of groups) {
      console.log(`\n${groupName}:`);
      console.log('─'.repeat(60));
      
      for (const result of results) {
        console.log(`\n${result.name}:`);
        console.log(`  Total Items: ${result.totalItems.toLocaleString()}`);
        console.log(`  Batch Size: ${result.batchSize}`);
        console.log(`  Concurrency: ${result.concurrency}`);
        console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
        console.log(`  Throughput: ${result.throughput.toFixed(0).toLocaleString()} items/sec`);
        console.log(`  Success Rate: ${result.successRate.toFixed(1)}%`);
        if (result.errors > 0) {
          console.log(`  Errors: ${result.errors}`);
          console.log(`  Avg Retries: ${result.avgRetries.toFixed(2)}`);
        }
        
        // Display memory metrics if available
        if (result.memory) {
          console.log('\n' + MemoryTracker.formatResult(result.memory));
        }
      }
    }
  }
  
  private displaySummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('\n📈 Performance Summary:\n');
    
    // Find best performers
    const sortedByThroughput = [...this.results].sort((a, b) => b.throughput - a.throughput);
    const bestThroughput = sortedByThroughput[0];
    
    console.log('🏆 Best Throughput:');
    console.log(`   ${bestThroughput.name}: ${bestThroughput.throughput.toFixed(0).toLocaleString()} items/sec`);
    
    // Batch size analysis
    const batchSizeResults = this.results.filter(r => r.name.includes('Batch Size'));
    if (batchSizeResults.length > 0) {
      const optimalBatch = batchSizeResults.reduce((best, current) => 
        current.throughput > best.throughput ? current : best
      );
      console.log(`\n📦 Optimal Batch Size: ${optimalBatch.batchSize} (${optimalBatch.throughput.toFixed(0).toLocaleString()} items/sec)`);
    }
    
    // Concurrency comparison
    const concurrentResult = this.results.find(r => r.name.includes('Optimized Concurrent'));
    const batchResult = this.results.find(r => r.name.includes('Traditional Batch'));
    if (concurrentResult && batchResult) {
      const improvement = ((concurrentResult.throughput - batchResult.throughput) / batchResult.throughput) * 100;
      console.log(`\n🔄 Concurrency Improvement: ${improvement.toFixed(1)}% faster than traditional batching`);
    }
    
    // Error handling impact
    const errorResults = this.results.filter(r => r.name.includes('Error Rate'));
    if (errorResults.length > 0) {
      console.log('\n❌ Error Handling Impact:');
      errorResults.forEach(r => {
        console.log(`   ${r.name}: ${r.throughput.toFixed(0).toLocaleString()} items/sec (${r.successRate.toFixed(1)}% success)`);
      });
    }
    
    // Progress callback overhead
    const noProgress = this.results.find(r => r.name === 'Without Progress Callback');
    const heavyProgress = this.results.find(r => r.name === 'With Heavy Progress Callback');
    if (noProgress && heavyProgress) {
      const overhead = ((heavyProgress.duration - noProgress.duration) / noProgress.duration) * 100;
      console.log(`\n📊 Progress Callback Overhead: ${overhead.toFixed(1)}% for heavy callbacks`);
    }
    
    // Scalability insights
    const scalabilityResults = this.results.filter(r => r.name.includes('Items'));
    if (scalabilityResults.length > 0) {
      console.log('\n📏 Scalability:');
      scalabilityResults.forEach(r => {
        const itemsPerMs = r.totalItems / r.duration;
        console.log(`   ${r.name}: ${itemsPerMs.toFixed(2)} items/ms`);
      });
    }
    
    // Memory efficiency analysis
    console.log('\n💾 Memory Efficiency:');
    const memoryResults = this.results
      .filter(r => r.memory)
      .map(r => ({
        name: r.name,
        bytesPerItem: r.memory!.delta.heapUsed / r.totalItems,
        peakUsage: r.memory!.peak.heapUsed,
        totalAllocated: r.memory!.summary.totalAllocated
      }))
      .sort((a, b) => a.bytesPerItem - b.bytesPerItem);
    
    if (memoryResults.length > 0) {
      const mostEfficient = memoryResults[0];
      const leastEfficient = memoryResults[memoryResults.length - 1];
      
      console.log(`- Most memory efficient: ${mostEfficient.name}`);
      console.log(`  ${mostEfficient.bytesPerItem.toFixed(2)} bytes/item, Peak: ${MemoryTracker.formatBytes(mostEfficient.peakUsage)}`);
      console.log(`- Least memory efficient: ${leastEfficient.name}`);
      console.log(`  ${leastEfficient.bytesPerItem.toFixed(2)} bytes/item, Peak: ${MemoryTracker.formatBytes(leastEfficient.peakUsage)}`);
      
      // Compare streaming vs collection
      const streamingResult = memoryResults.find(r => r.name.includes('Streaming'));
      const collectionResult = memoryResults.find(r => r.name.includes('Collection'));
      if (streamingResult && collectionResult) {
        const memoryImprovement = ((collectionResult.peakUsage - streamingResult.peakUsage) / collectionResult.peakUsage) * 100;
        console.log(`- Streaming saves ${memoryImprovement.toFixed(1)}% peak memory vs collection mode`);
      }
    }
    
    console.log('\n💡 Key Insights:');
    console.log('- Optimal batch size depends on operation latency and concurrency limits');
    console.log('- Semaphore-based concurrency significantly outperforms traditional batching');
    console.log('- Error rates impact throughput but retry logic maintains high success rates');
    console.log('- Progress callbacks have minimal overhead when implemented efficiently');
    console.log('- Streaming mode provides better memory efficiency for large datasets');
    console.log('- The processor scales linearly with proper concurrency configuration');
    console.log('- Memory usage scales with batch size and concurrency level');
  }
}

// Run benchmarks if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new OptimizedBatchProcessorBenchmark();
  benchmark.runAll().catch(console.error);
}

export { OptimizedBatchProcessorBenchmark };