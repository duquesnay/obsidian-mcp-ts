# Paginated Caching Documentation

## Overview

The Enhanced CachedResourceHandler implements intelligent caching for paginated resources, providing optimal performance for large datasets while maintaining memory efficiency.

## Key Features

### 1. Page-Aware Caching
Each page is cached separately based on normalized pagination parameters:
- `page=2&limit=10` and `offset=10&limit=10` use the same cache entry
- Different limits create separate cache entries even for the same offset
- Cache keys are normalized to `baseUri?limit=X&offset=Y` format

### 2. Smart Cache Invalidation
```typescript
// Invalidate all cached pages for a resource
cachedHandler.invalidateResourcePages('vault://items');

// This clears cache for all pages:
// - vault://items?page=1&limit=10
// - vault://items?page=2&limit=10
// - vault://items?offset=0&limit=5
// etc.
```

### 3. Memory Optimization
- LRU eviction ensures memory usage stays within configured limits
- Automatic cleanup of expired entries
- Efficient storage of large paginated datasets

### 4. Enhanced Metrics
Track pagination-specific cache performance:
```typescript
const stats = cachedHandler.getPaginatedCacheStats();
console.log(`Paginated entries: ${stats.paginatedEntries}`);
console.log(`Non-paginated entries: ${stats.nonPaginatedEntries}`);
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
```

## Configuration

### Basic Configuration
```typescript
const config: ResourceCacheConfig = {
  maxSize: 100,
  defaultTtl: 300000, // 5 minutes
  paginationOptimization: true, // Enable pagination features
  resourceTtls: {
    'vault://recent': 30000 // Shorter TTL for dynamic resources
  }
};

const cachedHandler = new CachedResourceHandler(baseHandler, config);
```

### Disabling Pagination Optimization
```typescript
const config: ResourceCacheConfig = {
  maxSize: 100,
  defaultTtl: 300000,
  paginationOptimization: false, // Disable normalization
  resourceTtls: {}
};
```

## Cache Behavior

### Pagination Parameter Normalization
The system normalizes equivalent pagination parameters:

| Original URI | Normalized Cache Key |
|--------------|---------------------|
| `vault://items?page=1&limit=10` | `vault://items?limit=10&offset=0` |
| `vault://items?page=2&limit=10` | `vault://items?limit=10&offset=10` |
| `vault://items?offset=10&limit=10` | `vault://items?limit=10&offset=10` |

### TTL Behavior
- Each paginated entry respects resource-specific TTL settings
- Expired pages are automatically cleaned up during cache operations
- TTL applies per page, not per resource

### Memory Management
- Cache size limits apply to total entries (paginated + non-paginated)
- LRU eviction prioritizes recently accessed pages
- Large paginated datasets are stored efficiently

## Performance Characteristics

### Cache Hit Scenarios
✅ **Cache Hit**: Same pagination parameters
```typescript
await handler.execute('vault://items?page=1&limit=10'); // Miss
await handler.execute('vault://items?page=1&limit=10'); // Hit
```

✅ **Cache Hit**: Equivalent pagination parameters
```typescript
await handler.execute('vault://items?page=2&limit=10'); // Miss
await handler.execute('vault://items?offset=10&limit=10'); // Hit
```

### Cache Miss Scenarios
❌ **Cache Miss**: Different pagination parameters
```typescript
await handler.execute('vault://items?page=1&limit=10'); // Miss
await handler.execute('vault://items?page=2&limit=10'); // Miss (different page)
await handler.execute('vault://items?page=1&limit=20'); // Miss (different limit)
```

### Best Practices

#### 1. Configure Appropriate Cache Size
```typescript
// For small vaults
const smallVaultConfig = { maxSize: 50, defaultTtl: 300000 };

// For large vaults with heavy pagination usage
const largeVaultConfig = { maxSize: 200, defaultTtl: 300000 };
```

#### 2. Use Resource-Specific TTLs
```typescript
const config = {
  maxSize: 100,
  defaultTtl: 300000,
  resourceTtls: {
    'vault://recent': 30000,    // Dynamic data - short TTL
    'vault://tags': 600000,     // Stable data - long TTL
    'vault://search': 120000    // Search results - medium TTL
  }
};
```

#### 3. Monitor Cache Performance
```typescript
// Regular performance monitoring
setInterval(() => {
  const stats = cachedHandler.getPaginatedCacheStats();
  console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`Total entries: ${stats.size} (${stats.paginatedEntries} paginated)`);
}, 60000);
```

#### 4. Strategic Cache Invalidation
```typescript
// After bulk operations that might affect multiple pages
await performBulkUpdate();
cachedHandler.invalidateResourcePages('vault://items');

// Or clear entire cache after major changes
await performMajorRestructure();
cachedHandler.clearCache();
```

## Error Handling

The system gracefully handles various error scenarios:

### Malformed URIs
```typescript
// Falls back to using original URI as cache key
await handler.execute('not-a-valid-uri'); // Won't throw
```

### Pagination Parsing Errors
```typescript
// Treats as non-paginated resource
await handler.execute('vault://items?invalid-param=bad'); // Safe fallback
```

### Network Errors
```typescript
// Errors are not cached - retry behavior preserved
try {
  await handler.execute('vault://items?page=1&limit=10');
} catch (error) {
  // Next call will retry, not use cached error
}
```

## Migration Guide

### From Basic Caching
```typescript
// Before
const handler = new CachedResourceHandler(baseHandler);

// After - no changes needed, pagination optimization enabled by default
const handler = new CachedResourceHandler(baseHandler);
```

### From Custom Cache Logic
```typescript
// Before - manual pagination handling
const customKey = `${uri}-${page}-${limit}`;
cache.set(customKey, result);

// After - automatic normalization
const handler = new CachedResourceHandler(baseHandler, {
  paginationOptimization: true
});
```

## Troubleshooting

### High Memory Usage
- Reduce `maxSize` in configuration
- Implement more aggressive TTL for dynamic resources
- Monitor `getPaginatedCacheStats()` for entry counts

### Low Cache Hit Rate
- Check if pagination parameters are consistent
- Verify TTL settings aren't too aggressive
- Consider normalizing pagination parameters in client code

### Unexpected Cache Behavior
- Verify `paginationOptimization` is enabled
- Check for malformed URIs causing fallback behavior
- Review cache invalidation logic