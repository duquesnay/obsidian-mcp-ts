# Performance Best Practices for Obsidian MCP

This guide outlines performance optimization strategies and best practices for the Obsidian MCP server.

## Table of Contents
- [Caching Strategy](#caching-strategy)
- [Request Deduplication](#request-deduplication)
- [Batch Processing](#batch-processing)
- [API Usage Patterns](#api-usage-patterns)
- [Memory Management](#memory-management)
- [Network Optimization](#network-optimization)

## Caching Strategy

The MCP server includes an LRU (Least Recently Used) cache implementation for frequently accessed data.

### When to Use Caching

**Good candidates for caching:**
- Vault file listings (`listFilesInVault`)
- Directory contents (`listFilesInDir`)
- Tag listings (`getAllTags`)
- File metadata that doesn't change frequently
- Path existence checks

**Should NOT cache:**
- File contents that are actively being edited
- Search results (users expect fresh results)
- Write operation results

### Cache Configuration

```typescript
import { LRUCache } from './utils/Cache.js';

// Create cache with 100 item limit and 1 minute TTL
const cache = new LRUCache<string, any>({
  maxSize: 100,
  ttl: 60000 // 1 minute in milliseconds
});

// Use cache in operations
async function getCachedFileList(): Promise<string[]> {
  const cacheKey = 'vault:files';
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  // Fetch from API
  const files = await obsidianClient.listFilesInVault();
  
  // Store in cache
  cache.set(cacheKey, files);
  return files;
}
```

### Cache Invalidation

Always invalidate cache entries when:
- Files are created, updated, or deleted
- Directories are moved or renamed
- Tags are added or removed

```typescript
// Invalidate related cache entries
function invalidateFileCache(filepath: string) {
  cache.delete('vault:files');
  cache.delete(`file:${filepath}`);
  
  const dir = path.dirname(filepath);
  if (dir) cache.delete(`dir:${dir}`);
}
```

## Request Deduplication

Prevent duplicate concurrent requests using the RequestDeduplicator utility.

### Implementation

```typescript
import { RequestDeduplicator } from './utils/RequestDeduplicator.js';

const deduplicator = new RequestDeduplicator(5000); // 5 second TTL

// Deduplicate identical requests
async function getFileContents(filepath: string): Promise<string> {
  return deduplicator.dedupe(
    `file:${filepath}`,
    () => obsidianClient.getFileContents(filepath)
  );
}
```

### Benefits
- Reduces API load when multiple tools request the same data
- Prevents race conditions
- Improves response time for duplicate requests

## Batch Processing

Use the OptimizedBatchProcessor for operations on multiple items.

### Basic Usage

```typescript
import { OptimizedBatchProcessor } from './utils/OptimizedBatchProcessor.js';

// Process files with concurrency limit
const processor = new OptimizedBatchProcessor({
  maxConcurrency: 5,  // Max 5 concurrent operations
  retryAttempts: 2,   // Retry failed operations twice
  retryDelay: 1000,   // 1 second between retries
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});

const results = await processor.process(files, async (file) => {
  return await obsidianClient.getFileContents(file);
});
```

### Streaming Results

For large datasets, use streaming to process results as they complete:

```typescript
// Process and yield results as they complete
for await (const result of processor.processStream(files, processFile)) {
  if (result.error) {
    console.error(`Failed: ${result.item}`, result.error);
  } else {
    console.log(`Completed: ${result.item}`);
  }
}
```

### Batch Processing Patterns

**Sequential Batches** - Use when order matters or API has strict rate limits:
```typescript
const results = await processor.processBatches(items, processItem);
```

**Concurrent Processing** - Use for maximum throughput:
```typescript
const results = await processor.process(items, processItem);
```

## API Usage Patterns

### Minimize API Calls

**Bad:**
```typescript
// Multiple API calls
for (const file of files) {
  const exists = await checkPathExists(file);
  if (exists) {
    const content = await getFileContents(file);
    // process...
  }
}
```

**Good:**
```typescript
// Batch operations
const contents = await OptimizedBatchProcessor.processSimple(
  files,
  file => getFileContents(file),
  { maxConcurrency: 5 }
);
```

### Use Appropriate Endpoints

- Use `listFilesInVault()` for full vault listing instead of recursive directory walks
- Use `getAllTags()` instead of scanning all files for tags
- Use batch endpoints when available

## Memory Management

### Large File Handling

When processing large vaults:

1. **Use streaming where possible:**
```typescript
// Process files one at a time instead of loading all into memory
async function* processLargeVault() {
  const files = await listFilesInVault();
  
  for (const file of files) {
    const content = await getFileContents(file);
    yield { file, content };
    // Content is garbage collected after processing
  }
}
```

2. **Clear caches periodically:**
```typescript
// Clear cache if it grows too large
if (cache.size() > 80) {
  cache.clear();
}
```

3. **Use pagination for large result sets:**
```typescript
async function paginatedSearch(query: string, pageSize = 50) {
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const results = await search(query, { offset, limit: pageSize });
    yield results;
    
    hasMore = results.length === pageSize;
    offset += pageSize;
  }
}
```

## Network Optimization

### Connection Pooling

The ObsidianClient uses axios with connection pooling by default. Ensure you reuse the same client instance:

```typescript
// Good - single instance
const client = new ObsidianClient(config);

// Bad - creates new connection each time
function getClient() {
  return new ObsidianClient(config);
}
```

### Timeout Configuration

Set appropriate timeouts based on operation type:

```typescript
// Short timeout for metadata operations
const metadata = await client.getFileMetadata(path, { timeout: 3000 });

// Longer timeout for content operations
const content = await client.getFileContents(path, { timeout: 10000 });

// Very long timeout for batch operations
const results = await batchProcessor.process(files, processFile, {
  timeout: 60000 // 1 minute
});
```

### Error Handling and Retries

Use exponential backoff for transient failures:

```typescript
const processor = new OptimizedBatchProcessor({
  retryAttempts: 3,
  retryDelay: 1000, // Base delay, multiplied by attempt number
});
```

## Performance Monitoring

### Track Key Metrics

```typescript
// Cache hit rate
const stats = cache.getStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);

// Request deduplication effectiveness
console.log(`Pending requests: ${deduplicator.size()}`);

// Batch processing performance
const startTime = Date.now();
const results = await processor.process(items, processItem);
const duration = Date.now() - startTime;
console.log(`Processed ${items.length} items in ${duration}ms`);
```

### Common Performance Issues

1. **Cache Misses** - Monitor cache hit rate and adjust TTL or size
2. **Timeout Errors** - Increase timeouts or reduce batch sizes
3. **Memory Growth** - Clear caches periodically and use streaming
4. **Slow Searches** - Use more specific queries and limit result sets

## Summary

Key takeaways for optimal performance:

1. **Cache aggressively** but invalidate appropriately
2. **Deduplicate requests** to prevent redundant API calls
3. **Batch operations** with appropriate concurrency limits
4. **Stream large datasets** instead of loading into memory
5. **Monitor performance** and adjust settings based on usage patterns

Remember that performance optimization is an iterative process. Start with the defaults and adjust based on your specific use case and vault size.