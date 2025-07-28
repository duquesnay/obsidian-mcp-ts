# Cache Performance Benchmarks

This document explains how to use the cache performance benchmarks to understand when caching is beneficial and when it should be avoided.

## Overview

The cache performance benchmarks compare operations with and without caching across different access patterns. They measure:

- **Performance**: Speed improvement and latency reduction
- **Memory Usage**: Memory overhead vs performance gains
- **Hit Rate Impact**: How cache hit rate affects overall performance
- **Scenarios**: When caching helps vs when it hurts

## Running Benchmarks

### Full Test Suite

Run the comprehensive benchmark as a test:

```bash
npm test -- tests/benchmarks/cached-vs-noncached.benchmark.test.ts
```

This runs all scenarios and provides detailed analysis with memory tracking.

### Standalone Script

For quick performance testing:

```bash
# Run all scenarios
npx tsx scripts/run-cache-benchmark.ts

# Run specific scenario
npx tsx scripts/run-cache-benchmark.ts --scenario sequential

# Quick test with fewer iterations
npx tsx scripts/run-cache-benchmark.ts --iterations 20 --no-memory

# Test with different data sizes
npx tsx scripts/run-cache-benchmark.ts --data-size 10240 --latency 25
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--scenario <name>` | Run specific scenario (sequential, pareto, random, unique) | All scenarios |
| `--iterations <num>` | Number of iterations per scenario | 50 |
| `--latency <ms>` | Simulated API latency in milliseconds | 50ms |
| `--data-size <bytes>` | Size of mock data per resource | 1024 bytes |
| `--no-memory` | Disable memory tracking for faster benchmarks | Memory tracking enabled |

## Benchmark Scenarios

### 1. Sequential Access (High Hit Rate)
**Pattern**: Repeated access to the same small set of resources  
**Cache Benefit**: ✅ **Excellent** (90-98% hit rate)  
**Use Case**: Dashboard loading, frequently accessed notes

```typescript
// Simulates accessing the same resources repeatedly
const resources = ['vault://tags', 'vault://note/daily.md', 'vault://recent'];
for (let i = 0; i < 50; i++) {
  for (const uri of resources) {
    await handler.handleRequest(uri);
  }
}
```

**Expected Results**:
- Hit Rate: 90-98%
- Speedup: 10-50x
- Memory Overhead: Acceptable
- **Recommendation**: Always enable caching

### 2. 80/20 Access Pattern (Realistic)
**Pattern**: 80% of requests to 20% of resources (Pareto Principle)  
**Cache Benefit**: ✅ **Good** (70-85% hit rate)  
**Use Case**: Real-world usage patterns, hot files in a vault

```typescript
// 80% chance to access hot resources, 20% for cold resources
const isHotAccess = Math.random() < 0.8;
const uri = isHotAccess ? hotResource : coldResource;
await handler.handleRequest(uri);
```

**Expected Results**:
- Hit Rate: 70-85%
- Speedup: 3-8x
- Memory Overhead: Reasonable
- **Recommendation**: Enable caching with appropriate size

### 3. Burst Access (Cache Warming)
**Pattern**: Bursts of requests followed by repeated access  
**Cache Benefit**: ✅ **Excellent** (90-95% hit rate)  
**Use Case**: Loading workflows, batch operations

```typescript
// Multiple bursts of requests to same resources
for (let burst = 0; burst < 3; burst++) {
  for (let i = 0; i < 20; i++) {
    const uri = resources[i % resources.length];
    await handler.handleRequest(uri);
  }
}
```

**Expected Results**:
- Hit Rate: 90-95%
- Speedup: 10-20x
- Memory Overhead: Low (cache warming effect)
- **Recommendation**: Ideal for caching

### 4. Random Access (Low Hit Rate)
**Pattern**: Random access to a large dataset  
**Cache Benefit**: ⚠️ **Limited** (10-30% hit rate)  
**Use Case**: Browsing large vaults, random file access

```typescript
// Random access to large dataset
const resourceIndex = Math.floor(Math.random() * 200);
const uri = `vault://note/file-${resourceIndex}.md`;
await handler.handleRequest(uri);
```

**Expected Results**:
- Hit Rate: 10-30%
- Speedup: 1.1-1.5x
- Memory Overhead: High relative to benefit
- **Recommendation**: Consider disabling cache or increasing cache size

### 5. Unique Access (No Cache Benefit)
**Pattern**: Every request is to a unique resource  
**Cache Benefit**: ❌ **None** (0% hit rate)  
**Use Case**: One-time imports, unique file processing

```typescript
// Each request is unique
const uri = `vault://note/unique-${i}-${Date.now()}.md`;
await handler.handleRequest(uri);
```

**Expected Results**:
- Hit Rate: 0%
- Speedup: ~1.0x (no improvement)
- Memory Overhead: All overhead, no benefit
- **Recommendation**: Disable caching for this pattern

### 6. Memory Pressure (Large Data)
**Pattern**: Repeated access to large resources  
**Cache Benefit**: ✅ **Good** if hit rate > 60%  
**Use Case**: Large documents, media files, complex data structures

```typescript
// Same pattern as sequential but with 10KB+ resources
// Tests memory vs performance tradeoff
```

**Expected Results**:
- Hit Rate: Depends on access pattern
- Speedup: High if cached
- Memory Overhead: Significant but justified by performance
- **Recommendation**: Monitor memory usage, tune cache size

## Interpreting Results

### Performance Metrics

#### Speedup
- **>10x**: Excellent caching scenario
- **3-10x**: Good caching scenario  
- **1.5-3x**: Marginal benefit
- **<1.5x**: Caching not worthwhile

#### Hit Rate
- **>80%**: Ideal for caching
- **60-80%**: Good for caching
- **30-60%**: Consider cache tuning
- **<30%**: Consider disabling cache

#### Memory Overhead
- **<2x**: Excellent memory efficiency
- **2-5x**: Acceptable for good performance gains
- **>5x**: High overhead, evaluate if justified

### Decision Matrix

| Hit Rate | Speedup | Memory Overhead | Recommendation |
|----------|---------|-----------------|----------------|
| >80% | >3x | <5x | ✅ Always cache |
| 60-80% | >2x | <3x | ✅ Cache with monitoring |
| 30-60% | >1.5x | <2x | ⚠️ Cache with tuning |
| <30% | <1.5x | Any | ❌ Don't cache |

## Cache Configuration Guidelines

### TTL Settings
Based on data volatility:

```typescript
const cacheConfig = {
  // Fast-changing data (30 seconds)
  'vault://recent': 30000,
  
  // Stable data (5 minutes)  
  'vault://tags': 300000,
  'vault://structure': 300000,
  
  // Individual notes (2 minutes)
  notePattern: 120000
};
```

### Cache Size
Based on access patterns:

```typescript
// For sequential/burst patterns
const smallCache = { maxSize: 50, ttl: 300000 };

// For 80/20 patterns  
const mediumCache = { maxSize: 100, ttl: 120000 };

// For random patterns (if caching at all)
const largeCache = { maxSize: 500, ttl: 60000 };
```

### Memory Limits
Set size limits to prevent memory issues:

```typescript
const memorySafeCache = {
  maxSize: 100,
  ttl: 120000,
  maxEntrySize: 50 * 1024 // 50KB per entry
};
```

## Performance Monitoring

### Key Metrics to Track

```typescript
// Check cache effectiveness
const stats = cache.getStats();
console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Memory Usage: ${cache.size()} entries`);

// Monitor over time
setInterval(() => {
  if (stats.hitRate < 0.5) {
    console.warn('Low cache hit rate - consider tuning');
  }
}, 60000);
```

### Alerting Thresholds

- **Hit Rate < 40%**: Consider cache tuning or disabling
- **Memory Growth**: Monitor for memory leaks
- **Cache Size**: Alert if approaching maxSize frequently
- **TTL Effectiveness**: Monitor expired vs accessed ratios

## Real-World Examples

### Dashboard Application
```typescript
// Perfect for caching - repeated access to same data
const dashboardCache = new LRUCache({
  maxSize: 50,
  ttl: 300000 // 5 minutes
});
// Expected: 90%+ hit rate, 20x+ speedup
```

### Search Interface  
```typescript
// Good for caching with proper size
const searchCache = new LRUCache({
  maxSize: 200,
  ttl: 120000 // 2 minutes
});
// Expected: 60-80% hit rate, 3-5x speedup
```

### File Browser
```typescript
// May not benefit from caching
// Consider disabling or using very large cache
const browserCache = new LRUCache({
  maxSize: 1000,
  ttl: 60000 // 1 minute
});
// Expected: 20-40% hit rate, 1.2x speedup
```

### Batch Processing
```typescript
// Don't cache unique operations
// Each file processed once
// Disable caching to save memory
const noCaching = { enabled: false };
// Expected: 0% hit rate, 1.0x speedup
```

## Troubleshooting

### Low Hit Rate
- **Cause**: Access pattern doesn't reuse resources
- **Solution**: Increase cache size or disable caching
- **Check**: Are resources being accessed multiple times?

### High Memory Usage
- **Cause**: Large resources or cache size too big
- **Solution**: Reduce maxSize or add maxEntrySize limit
- **Check**: Monitor memory growth over time

### No Performance Improvement
- **Cause**: Cache overhead exceeds benefits
- **Solution**: Disable caching for this use case
- **Check**: Measure actual latency with/without cache

### Cache Thrashing
- **Cause**: Working set larger than cache size
- **Solution**: Increase cache size or use different caching strategy
- **Check**: Monitor eviction rate vs hit rate

## Conclusion

Cache performance benchmarks help you make data-driven decisions about when and how to use caching. The key is matching cache configuration to your actual access patterns and continuously monitoring effectiveness.

**Remember**: Caching is not always beneficial. Sometimes the overhead exceeds the benefits, and it's better to disable caching entirely for certain access patterns.