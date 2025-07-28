# Performance Benchmarks with Memory Tracking

This directory contains comprehensive performance benchmarks for all optimization utilities in the project, now enhanced with detailed memory usage tracking.

## Features

### Memory Tracking Capabilities
- **Real-time memory sampling**: Captures heap usage at regular intervals during benchmark execution
- **Peak memory detection**: Identifies maximum memory usage during each scenario
- **Memory efficiency metrics**: Calculates bytes per operation/item/request
- **Garbage collection awareness**: Can force GC for more accurate measurements
- **Visual memory charts**: ASCII charts showing memory usage over time

### Benchmark Suites

#### 1. LRU Cache Benchmarks (`LRUCache.benchmark.ts`)
Tests cache performance under various access patterns:
- Sequential access (best case)
- Random access with large dataset
- TTL expiration impact
- Optimal working set (Pareto principle)
- Cache thrashing (worst case)
- Real-world file metadata caching

**Memory Metrics Tracked:**
- Memory per cache operation
- Peak heap usage during different access patterns
- Memory efficiency comparison between scenarios

#### 2. Optimized Batch Processor Benchmarks (`OptimizedBatchProcessor.benchmark.ts`)
Evaluates batch processing strategies:
- Different batch sizes
- Concurrent vs traditional batch processing
- Error handling and retry performance
- Progress callback overhead
- Scalability testing
- Streaming vs collection modes

**Memory Metrics Tracked:**
- Memory per processed item
- Memory usage at different batch sizes
- Peak memory comparison: streaming vs collection
- Memory overhead of error handling

#### 3. Request Deduplicator Benchmarks (`RequestDeduplicator.benchmark.ts`)
Measures deduplication effectiveness:
- Maximum concurrent deduplication
- Burst traffic patterns
- Real-world API patterns
- Varying concurrency levels
- TTL expiration effects
- File reading patterns

**Memory Metrics Tracked:**
- Memory per request
- Memory per deduplicated request
- Peak memory during burst scenarios
- Memory efficiency of the deduplication map

## Running Benchmarks

### Quick Start
```bash
# Run all benchmarks with memory tracking
npm run benchmark

# Or use the shell script
./scripts/run-benchmarks.sh
```

### With Accurate Memory Tracking
For the most accurate memory measurements, run with garbage collection exposed:

```bash
# Build first
npm run build

# Run with GC exposed
node --expose-gc dist/scripts/run-benchmarks.js

# Or run individual benchmarks
node --expose-gc dist/benchmarks/LRUCache.benchmark.js
node --expose-gc dist/benchmarks/OptimizedBatchProcessor.benchmark.js
node --expose-gc dist/benchmarks/RequestDeduplicator.benchmark.js
```

## Understanding the Output

### Memory Metrics Explained

1. **Initial**: Heap usage at the start of the benchmark
2. **Peak**: Maximum heap usage during execution
3. **Final**: Heap usage after completion
4. **Delta**: Change in heap usage (final - initial)
5. **Average**: Average heap usage across all samples
6. **Total Allocated**: Sum of all heap increases (tracks allocations)
7. **RSS Delta**: Change in Resident Set Size (total process memory)

### Sample Output
```
Memory Usage:
  Initial: 12.45 MB
  Peak: 45.67 MB
  Final: 15.23 MB
  Delta: +2.78 MB
  Average: 28.34 MB
  Total Allocated: 156.78 MB
  RSS Delta: +8.92 MB
```

### Memory Efficiency Rankings
Each benchmark suite provides memory efficiency comparisons:
- Bytes per operation/item/request
- Most vs least memory efficient scenarios
- Peak memory usage comparison
- Specific insights (e.g., streaming saves X% memory)

## Memory Tracking Utilities

### MemoryTracker Class (`utils/MemoryTracker.ts`)
Core utility for memory profiling:

```typescript
// Basic usage
const tracker = new MemoryTracker();
tracker.start(100); // Sample every 100ms
// ... run your code ...
const result = tracker.stop();

// Convenience method
const { result, memory } = await MemoryTracker.track(async () => {
  // Your async operation
}, 100);

// Format results for display
console.log(MemoryTracker.formatResult(memory));
console.log(MemoryTracker.generateChart(memory));
```

### Integration with Benchmarks
All benchmark results now include optional memory data:

```typescript
interface BenchmarkResult {
  name: string;
  duration: number;
  opsPerSecond: number;
  memory?: MemoryTrackingResult;
  // ... other metrics
}
```

## Best Practices

### For Benchmark Authors
1. Always use `MemoryTracker` for consistent measurements
2. Start tracking before any allocations
3. Stop tracking after all operations complete
4. Force GC before benchmarks when available
5. Include memory efficiency in your analysis

### For Performance Optimization
1. Compare memory usage across different approaches
2. Look for memory leaks (continuously growing heap)
3. Identify peak memory usage scenarios
4. Consider memory-performance trade-offs
5. Use streaming for large datasets to reduce memory

## Interpreting Results

### Memory Patterns to Watch For
- **Constant growth**: Possible memory leak
- **High peaks**: Consider chunking or streaming
- **Large delta**: Objects not being garbage collected
- **High bytes/operation**: Inefficient data structures

### Optimization Opportunities
- Cache: Balance size with hit rate and memory usage
- Batch Processing: Find optimal batch size for memory efficiency
- Deduplication: Minimal memory overhead for significant savings

## Adding New Benchmarks

To add memory tracking to a new benchmark:

1. Import the utilities:
```typescript
import { MemoryTracker } from './utils/MemoryTracker.js';
import { YourBenchmarkResult } from './utils/BenchmarkTypes.js';
```

2. Add memory tracking to your scenarios:
```typescript
const tracker = new MemoryTracker();
tracker.start();
// ... run scenario ...
const memoryResult = tracker.stop();
```

3. Include memory in results:
```typescript
return {
  // ... other metrics
  memory: memoryResult
};
```

4. Display memory metrics:
```typescript
if (result.memory) {
  console.log('\n' + MemoryTracker.formatResult(result.memory));
}
```

## Performance Tips

- Run benchmarks on a quiet system for consistent results
- Close other applications to reduce memory pressure
- Run multiple times and average results for accuracy
- Use the --expose-gc flag for deterministic memory measurements
- Consider system memory when interpreting results