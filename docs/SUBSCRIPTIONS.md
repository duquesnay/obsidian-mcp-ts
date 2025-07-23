# Resource Subscriptions (R8.1)

This document describes the subscription system for resource change notifications in the Obsidian MCP server.

## Overview

The subscription system allows MCP clients (like Claude Desktop) to subscribe to resource changes and receive real-time notifications when resources are updated. This is particularly useful for frequently changing resources like recent files, vault statistics, and tags.

## Subscribable Resources

The following resources support subscriptions:

- `vault://recent` - Recently modified notes (changes frequently)
- `vault://stats` - Vault statistics (file counts, etc.)
- `vault://tags` - All tags in the vault with usage counts

## MCP Protocol Integration

### Subscribe to a Resource

```json
{
  "method": "resources/subscribe",
  "params": {
    "uri": "vault://recent"
  }
}
```

### Unsubscribe from a Resource

```json
{
  "method": "resources/unsubscribe", 
  "params": {
    "uri": "vault://recent"
  }
}
```

### Resource Update Notification

When a subscribed resource changes, the server sends:

```json
{
  "method": "notifications/resources/updated",
  "params": {
    "uri": "vault://recent"
  }
}
```

## Architecture

### Core Components

1. **SubscriptionManager** - Tracks client subscriptions and validates subscribable resources
2. **SubscriptionHandlers** - Handles MCP subscribe/unsubscribe requests
3. **NotificationTrigger** - Utilities for manually triggering resource update notifications

### Server Integration

The subscription system is registered during server initialization:

```typescript
import { registerSubscriptions } from './subscriptions/index.js';

// Register subscription capabilities
await registerSubscriptions(server);
```

This adds the `subscribe: true` capability to the server's resource capabilities.

## Usage Examples

### Basic Subscription Workflow

```typescript
// Client subscribes to recent files
await server.handleRequest({
  method: 'resources/subscribe',
  params: { uri: 'vault://recent' }
});

// Server notifies when recent files change
await notificationTrigger.notifyRecentFilesChanged();

// Client receives notification
{
  method: 'notifications/resources/updated',
  params: { uri: 'vault://recent' }
}
```

### Manual Notification Triggers

```typescript
import { createNotificationTrigger } from './subscriptions/index.js';

const trigger = createNotificationTrigger(server);

// Notify specific resource changes
await trigger.notifyRecentFilesChanged();
await trigger.notifyVaultStatsChanged(); 
await trigger.notifyTagsChanged();

// Generic notification
await trigger.notifyResourceUpdate('vault://custom-resource');
```

## Implementation Details

### Subscription Validation

- Only resources in the `SUBSCRIBABLE_RESOURCES` set can be subscribed to
- Resource URIs must follow the `vault://` format
- Invalid subscriptions are rejected with descriptive error messages

### Client Management

- Currently uses a default client ID (`default-client`) since MCP doesn't provide client identification
- Multiple subscriptions per client are supported
- Duplicate subscriptions are automatically deduplicated

### Notification Delivery

- Notifications are sent to all subscribed clients
- Uses the MCP server's `notification()` method
- Gracefully handles cases where no clients are subscribed

### Error Handling

- Invalid resource URIs throw validation errors
- Non-subscribable resources are rejected with clear messages
- Server without subscription handlers gracefully ignores notifications

## Limitations and Future Enhancements

### Current Limitations

- **Manual triggers only** - No automatic file watching yet
- **Single client support** - MCP protocol doesn't distinguish between clients
- **Limited resources** - Only 3 resources currently support subscriptions

### Future Enhancements

1. **File System Watching** - Automatic notifications when vault files change
2. **Multi-client Support** - Enhanced client identification and management
3. **More Resources** - Expand subscriptions to folder contents and individual notes
4. **Subscription Filters** - Allow clients to filter notifications by criteria
5. **Batch Notifications** - Group multiple changes into single notifications

## Testing

### Unit Tests

- `SubscriptionManager.test.ts` - Core subscription management
- `SubscriptionHandlers.test.ts` - MCP request handling
- `NotificationTrigger.test.ts` - Manual notification utilities

### Integration Tests

- `subscription-integration.test.ts` - End-to-end subscription workflow
- Verifies proper integration with existing resource system

### Test Coverage

- 100% coverage of subscription functionality
- Tests for valid and invalid scenarios
- Edge case handling (no subscribers, invalid resources)

## Performance Considerations

- Subscription tracking uses efficient Map/Set data structures
- Notifications are sent concurrently to multiple clients
- Minimal memory overhead for subscription state
- Graceful handling of disconnected clients

## Security

- Resource URI validation prevents unauthorized subscriptions
- Only whitelisted resources can be subscribed to
- No sensitive information exposed in subscription state

## Backwards Compatibility

- Subscription system is opt-in - existing functionality unchanged
- Servers without subscription support continue to work normally
- Graceful degradation when subscription handlers not available