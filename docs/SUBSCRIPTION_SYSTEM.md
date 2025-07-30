# Subscription System Documentation

## Overview

The Obsidian MCP Server implements a sophisticated event-driven subscription system that enables real-time cache invalidation and synchronization between file operations and cached data. This system ensures that cached resources remain fresh and that MCP clients receive notifications when resources change.

## Architecture

The subscription system consists of four main components:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Tool Operations   │────▶│ NotificationManager  │────▶│CacheSubscriptionMgr │
│ (Create/Update/Del) │     │   (Event Emitter)    │     │ (Event Processing)  │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
                                       │                            │
                                       ▼                            ▼
                            ┌──────────────────────┐     ┌─────────────────────┐
                            │   CacheRegistry      │     │   MCP Clients       │
                            │ (Cache Management)   │     │ (Resource Updates)  │
                            └──────────────────────┘     └─────────────────────┘
```

### 1. NotificationManager (Event Hub)

The `NotificationManager` is a singleton that serves as the central event hub for all notifications in the system. It extends Node.js EventEmitter and provides type-safe methods for emitting and subscribing to events.

**Key Features:**
- Singleton pattern ensures single source of truth
- Type-safe event emission and subscription
- Automatic cleanup on process exit
- Diagnostic capabilities for monitoring

**Event Types:**
- `cache:invalidated` - Cache entries need invalidation
- `file:created` - New file created in vault
- `file:updated` - Existing file modified
- `file:deleted` - File removed from vault
- `directory:created` - New folder created
- `directory:deleted` - Folder removed
- `tag:added` - Tag added to a file
- `tag:removed` - Tag removed from a file

### 2. CacheSubscriptionManager (Event Processing)

The `CacheSubscriptionManager` handles advanced subscription management with priority-based execution, filtering, and performance tracking.

**Key Features:**
- Priority-based subscription execution (CRITICAL, HIGH, NORMAL, LOW)
- Advanced filtering with pattern matching
- Performance statistics per subscription
- Batch processing of notifications

### 3. CacheRegistry (Cache Coordination)

The `CacheRegistry` manages all cache instances in the system and coordinates cache invalidation based on file operations.

**Key Features:**
- Central registry for all cache instances
- Pattern-based cache invalidation
- Automatic subscription to file events
- Cache statistics aggregation

### 4. MCP Client Integration

The system integrates with MCP clients to provide real-time resource update notifications through the MCP protocol's subscription mechanism.

## How It Works

### 1. File Operation Flow

When a tool performs a file operation:

```typescript
// In DeleteFileTool.ts
async executeTyped(args: DeleteFileArgs): Promise<ToolResponse> {
  // Delete the file
  await client.delete(args.filepath);
  
  // Notify the system
  this.notifyFileOperation('delete', args.filepath);
  
  return this.formatResponse({ success: true });
}
```

### 2. Event Propagation

The notification flows through the system:

```typescript
// BaseTool notifies NotificationManager
protected notifyFileOperation(operation: string, filePath: string) {
  switch (operation) {
    case 'delete':
      this.notificationManager.notifyFileDeleted(filePath);
      break;
  }
}

// NotificationManager emits event
notifyFileDeleted(path: string) {
  this.notify(SUBSCRIPTION_EVENTS.FILE_DELETED, { path, key: path });
}

// CacheSubscriptionManager processes event
async processEvent(eventType: string, data: NotificationData) {
  const subscriptions = this.subscriptions.get(eventType);
  for (const subscription of subscriptions) {
    await subscription.callback(data);
  }
}
```

### 3. Cache Invalidation

The CacheRegistry invalidates affected caches:

```typescript
// Invalidation rules determine which caches to clear
const cacheInvalidationRules = {
  [SUBSCRIPTION_EVENTS.FILE_DELETED]: [
    'vault://recent',
    'vault://structure', 
    'vault://stats'
  ]
};

// Registry invalidates matching cache entries
invalidateByPath(filepath: string) {
  for (const cache of this.caches.values()) {
    // Clear keys containing the filepath
    const keys = Array.from(cache.instance.keys());
    for (const key of keys) {
      if (key.includes(filepath)) {
        cache.instance.delete(key);
      }
    }
  }
}
```

### 4. MCP Client Notification

Finally, MCP clients receive resource update notifications:

```typescript
// Resource system subscribes to cache invalidation
cacheSubscriptionManager.subscribe({
  eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
  callback: async (data) => {
    if (data.key && server.subscriptionHandlers) {
      // Notify MCP clients about resource changes
      await server.subscriptionHandlers.notifyResourceUpdate(data.key);
    }
  }
});
```

## Configuration

### Subscription Priorities

Configure subscription priority to control execution order:

```typescript
import { SubscriptionPriority } from '../interfaces/subscription.js';

subscriptionManager.subscribe({
  eventType: SUBSCRIPTION_EVENTS.FILE_UPDATED,
  callback: handleUpdate,
  priority: SubscriptionPriority.HIGH, // Execute before NORMAL priority
});
```

### Event Filtering

Use filters to subscribe only to relevant events:

```typescript
subscriptionManager.subscribe({
  eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
  callback: handleInvalidation,
  filter: {
    keyPattern: 'vault://note/*',     // Only notes
    operation: ['delete', 'expire'],  // Only these operations
  }
});
```

### Cache Invalidation Rules

Configure which resources are invalidated by file operations:

```typescript
const cacheInvalidationRules = {
  // When a file is created, invalidate these resources
  [SUBSCRIPTION_EVENTS.FILE_CREATED]: [
    'vault://recent',     // Recent files list
    'vault://structure',  // Vault structure
    'vault://stats'       // Vault statistics
  ],
  
  // When a tag is added, invalidate tag resources
  [SUBSCRIPTION_EVENTS.TAG_ADDED]: [
    'vault://tags'        // All tags list
  ]
};
```

## Usage Examples

### Example 1: Basic File Operation Notification

```typescript
// In a tool that creates files
class CreateFileTool extends BaseTool {
  async executeTyped(args: CreateFileArgs) {
    // Create the file
    const result = await client.create(args.path, args.content);
    
    // Notify the system
    this.notifyFileOperation('create', args.path, {
      contentLength: args.content.length
    });
    
    return this.formatResponse(result);
  }
}
```

### Example 2: Custom Cache Subscription

```typescript
// Register a custom cache with invalidation patterns
const customCache = new LRUCache<string, any>({
  maxSize: 100,
  ttl: 300000 // 5 minutes
});

CacheRegistry.getInstance().register(
  'custom-cache',
  customCache,
  [/^vault:\/\/custom\//] // Invalidation patterns
);

// Subscribe to specific events
NotificationManager.getInstance().subscribe(
  SUBSCRIPTION_EVENTS.FILE_UPDATED,
  (data) => {
    if (data.path?.startsWith('custom/')) {
      customCache.delete(`vault://custom/${data.path}`);
    }
  }
);
```

### Example 3: Monitoring Subscription Performance

```typescript
// Get subscription statistics
const stats = subscriptionManager.getStats();
console.log('Total subscriptions:', stats.totalSubscriptions);
console.log('Events processed:', stats.totalEventsProcessed);
console.log('Average processing time:', stats.averageProcessingTime);

// Get diagnostics for debugging
const diagnostics = subscriptionManager.getDiagnostics();
console.log('Active subscriptions by event:', diagnostics.eventDiagnostics);
```

### Example 4: Advanced Filtering with Pattern Matching

```typescript
// Subscribe with complex filtering
const handle = subscriptionManager.subscribe({
  eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
  callback: async (data) => {
    console.log(`Cache invalidated: ${data.key}`);
  },
  filter: {
    keyPattern: 'vault://note/*',
    instanceId: ['main-cache', 'search-cache'],
    operation: ['set', 'delete']
  },
  priority: SubscriptionPriority.HIGH,
  metadata: {
    name: 'note-cache-monitor',
    tags: ['monitoring', 'performance']
  }
});

// Later, unsubscribe
handle.unsubscribe();
```

## Best Practices

### 1. Always Notify After Successful Operations

```typescript
// ✅ Good: Notify after success
try {
  await client.delete(filepath);
  this.notifyFileOperation('delete', filepath);
} catch (error) {
  // Don't notify on failure
  throw error;
}

// ❌ Bad: Notify before operation
this.notifyFileOperation('delete', filepath);
await client.delete(filepath); // May fail
```

### 2. Include Relevant Metadata

```typescript
// ✅ Good: Include useful metadata
this.notifyFileOperation('update', filepath, {
  operation: 'append',
  contentLength: newContent.length,
  previousLength: oldContent.length
});

// ❌ Bad: No context
this.notifyFileOperation('update', filepath);
```

### 3. Use Appropriate Priorities

```typescript
// ✅ Good: Critical operations get high priority
subscriptionManager.subscribe({
  eventType: SUBSCRIPTION_EVENTS.FILE_DELETED,
  callback: cleanupOrphanedData,
  priority: SubscriptionPriority.CRITICAL
});

// ✅ Good: Analytics get low priority
subscriptionManager.subscribe({
  eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
  callback: updateAnalytics,
  priority: SubscriptionPriority.LOW
});
```

### 4. Clean Up Subscriptions

```typescript
// ✅ Good: Store handle and clean up
class MyService {
  private subscriptionHandle?: CacheSubscriptionHandle;
  
  start() {
    this.subscriptionHandle = subscriptionManager.subscribe({
      eventType: SUBSCRIPTION_EVENTS.FILE_UPDATED,
      callback: this.handleUpdate.bind(this)
    });
  }
  
  stop() {
    this.subscriptionHandle?.unsubscribe();
  }
}
```

## Troubleshooting

### Common Issues

1. **Cache not invalidating**
   - Check if the tool is calling `notifyFileOperation`
   - Verify invalidation rules include the affected resource
   - Check subscription filters aren't too restrictive

2. **Performance degradation**
   - Monitor subscription count with `getStats()`
   - Check for memory leaks with `getDiagnostics()`
   - Ensure callbacks complete quickly or use async processing

3. **Missing notifications**
   - Verify NotificationManager singleton is initialized
   - Check event names match SUBSCRIPTION_EVENTS constants
   - Ensure subscriptions are active (`isActive()`)

### Debugging Tools

```typescript
// Enable detailed logging
const notificationManager = NotificationManager.getInstance();
const diagnostics = notificationManager.getDiagnostics();
console.log('Notification diagnostics:', diagnostics);

// Monitor specific events
notificationManager.subscribe('*', (data) => {
  console.log('Event fired:', data);
});

// Check cache registry state
const registry = CacheRegistry.getInstance();
const cacheStats = registry.getStats();
console.log('Cache statistics:', cacheStats);
```

## Performance Considerations

### Memory Management

The subscription system includes automatic cleanup:
- Process exit handlers remove all listeners
- LRU caches have size limits and TTL
- Subscription cleanup prevents memory leaks

### Event Processing

- Events are processed in priority order
- Async callbacks are handled with Promise.all
- Errors in callbacks don't affect other subscriptions

### Optimization Tips

1. **Batch Operations**: Group related file operations to reduce events
2. **Debounce Updates**: Use debouncing for rapid file changes
3. **Selective Invalidation**: Use specific cache keys instead of clearing entire caches
4. **Monitor Performance**: Track subscription execution times

## Future Enhancements

Potential improvements to the subscription system:

1. **Event Replay**: Ability to replay events for debugging
2. **Persistent Subscriptions**: Save subscriptions across restarts
3. **Event Filtering DSL**: More powerful filtering syntax
4. **Distributed Events**: Multi-process event propagation
5. **Event Streaming**: WebSocket support for external clients