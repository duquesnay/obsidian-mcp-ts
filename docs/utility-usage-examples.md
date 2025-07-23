# Utility Classes Usage Examples

This document provides a quick reference for the usage examples added to the utility classes in the obsidian-mcp-ts project.

## Overview

Comprehensive JSDoc documentation with practical examples has been added to the following utility classes:

### 1. **LRUCache** (`src/utils/Cache.ts`)
- **Purpose**: High-performance cache with automatic eviction and TTL support
- **Key Examples**:
  - File metadata caching with TTL
  - Search results caching with variable TTL
  - Performance monitoring and hit rate tracking
  - Memory management with periodic cleanup
- **Best Practices**: Monitor hit rates, use appropriate TTL values, periodic cleanup

### 2. **BatchProcessor** (`src/utils/BatchProcessor.ts`)
- **Purpose**: Simple batch processing with controlled concurrency
- **Key Examples**:
  - Processing multiple files with rate limiting
  - Batch API requests with error handling
  - Custom result formatting for reports
  - Large dataset processing with progress tracking
- **Best Practices**: Choose batch size based on operation type, handle mixed results

### 3. **OptimizedBatchProcessor** (`src/utils/OptimizedBatchProcessor.ts`)
- **Purpose**: Advanced batch processing with retry logic and streaming
- **Key Examples**:
  - API calls with automatic retries and progress tracking
  - Stream processing for large datasets
  - Traditional batch processing with strict boundaries
  - Complex workflows with mixed operation types
- **Best Practices**: Use streaming for large data, configure retries based on reliability

### 4. **RequestDeduplicator** (`src/utils/RequestDeduplicator.ts`)
- **Purpose**: Prevent duplicate concurrent requests
- **Key Examples**:
  - Preventing duplicate API calls
  - Cache service integration
  - File reading deduplication
  - Complex key generation for search parameters
  - Monitoring deduplication effectiveness
- **Best Practices**: Use stable keys, appropriate TTL, avoid side-effect operations

## Key Features Added

1. **Comprehensive @example sections** showing real-world usage scenarios
2. **@performance notes** explaining complexity and overhead
3. **@bestPractices** sections with recommendations
4. **@commonPitfalls** warnings about typical mistakes
5. **Method-specific examples** for key operations

## Usage Pattern Comparisons

### When to use each utility:

- **LRUCache**: When you need to store frequently accessed data with automatic eviction
- **BatchProcessor**: For simple parallel operations with fixed concurrency
- **OptimizedBatchProcessor**: For complex workflows needing retries, streaming, or dynamic concurrency
- **RequestDeduplicator**: To prevent redundant concurrent operations

### Performance Considerations:

- LRUCache: O(1) operations, ~200 bytes overhead per entry
- BatchProcessor: Memory grows with batch size
- OptimizedBatchProcessor: Memory-efficient streaming available
- RequestDeduplicator: O(1) lookup, minimal overhead

## Integration Examples

The utilities can be combined for maximum efficiency:

```typescript
class OptimizedService {
  private cache = new LRUCache<string, any>({ maxSize: 100, ttl: 60000 });
  private deduplicator = new RequestDeduplicator(5000);
  private processor = new OptimizedBatchProcessor({ maxConcurrency: 5 });

  async getMultipleItems(ids: string[]): Promise<any[]> {
    return this.processor.process(ids, async (id) => {
      // Check cache first
      const cached = this.cache.get(id);
      if (cached) return cached;

      // Deduplicate concurrent requests
      return this.deduplicator.dedupe(`item:${id}`, async () => {
        const data = await fetchItem(id);
        this.cache.set(id, data);
        return data;
      });
    });
  }
}
```

## Testing

All utilities have comprehensive test coverage and the documentation examples are designed to be testable and practical.