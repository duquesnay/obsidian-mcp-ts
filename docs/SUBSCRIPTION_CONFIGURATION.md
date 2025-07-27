# Subscription Configuration

This document describes how subscription configuration is integrated into the server initialization process.

## Overview

The subscription system is automatically configured when the server starts up. It provides live update notifications for frequently changing resources in your Obsidian vault.

## Configuration Options

The subscription system can be configured using environment variables:

### Environment Variables

- `OBSIDIAN_ENABLE_SUBSCRIPTIONS` (default: `true`)
  - Enable or disable subscription capabilities
  - Set to `false` to disable subscriptions entirely

- `OBSIDIAN_MAX_SUBSCRIPTIONS` (default: `100`)
  - Maximum number of concurrent subscriptions per client
  - Must be a non-negative integer

- `OBSIDIAN_DEFAULT_SUBSCRIPTIONS` (default: empty)
  - Comma-separated list of resources to validate at startup
  - Example: `vault://recent,vault://tags,vault://stats`
  - These are not automatically subscribed, just validated

### Example Configuration

```bash
# Enable subscriptions with custom limits
export OBSIDIAN_ENABLE_SUBSCRIPTIONS=true
export OBSIDIAN_MAX_SUBSCRIPTIONS=50
export OBSIDIAN_DEFAULT_SUBSCRIPTIONS="vault://recent,vault://tags"

# Start the server
npm start
```

## Subscribable Resources

The following resources support subscriptions:

- `vault://recent` - Recently modified notes
- `vault://tags` - All tags in the vault with usage counts  
- `vault://stats` - Vault statistics (file counts, etc.)

## Server Initialization Process

The subscription system is integrated into server startup as follows:

1. **Environment Loading** - Configuration is loaded from environment variables
2. **Validation** - Configuration values are validated for correctness
3. **Server Creation** - Server is created with subscription capabilities enabled
4. **Component Registration** - Tools, resources, and subscriptions are registered in order
5. **Subscription Setup** - SubscriptionManager and SubscriptionHandlers are attached to the server
6. **Transport Connection** - Server connects to stdio transport and begins accepting requests

## Graceful Shutdown

The server includes graceful shutdown handling:

- **SIGINT/SIGTERM** - Triggers cleanup of subscription components
- **Cleanup Process** - Unsubscribes all clients and clears subscription data
- **Error Handling** - Cleanup errors are logged but don't prevent shutdown

## Implementation Details

### Server Architecture

```typescript
// Server creation with subscription capabilities
const server = createServerWithConfig(); // Includes subscription capability

// Initialization sequence
await initializeServer(server);
// 1. registerTools(server)
// 2. registerResources(server) 
// 3. registerSubscriptions(server) // Attaches managers and handlers

// Shutdown sequence
await shutdownServer(server);
// 1. subscriptionManager.cleanup()
// 2. subscriptionHandlers.cleanup()
// 3. server.close()
```

### Component Integration

- **SubscriptionManager** - Manages client subscriptions and resource tracking
- **SubscriptionHandlers** - Handles MCP protocol requests (subscribe/unsubscribe)
- **NotificationTrigger** - Sends notifications when resources change
- **Server Integration** - Components are attached to server instance for access

### Configuration Validation

Configuration is validated at startup:

```typescript
// Valid configuration
{
  enableSubscriptions: true,
  maxSubscriptions: 100,
  defaultSubscriptions: ['vault://recent', 'vault://tags']
}

// Invalid examples that will throw errors
{
  maxSubscriptions: -1,              // Must be non-negative
  defaultSubscriptions: ['invalid']  // Must start with 'vault://'
}
```

## Testing

The subscription configuration includes comprehensive tests:

- **Unit Tests** - Configuration validation, server lifecycle, component integration
- **Integration Tests** - End-to-end protocol testing with real server instance
- **Error Handling** - Graceful failure scenarios and cleanup

## Troubleshooting

### Common Issues

1. **Subscriptions Not Working**
   - Check `OBSIDIAN_ENABLE_SUBSCRIPTIONS` is not set to `false`
   - Verify the resource URI is subscribable (see list above)

2. **Server Startup Failures** 
   - Check environment variable values are valid
   - Ensure `OBSIDIAN_MAX_SUBSCRIPTIONS` is a positive integer
   - Verify default subscription URIs start with `vault://`

3. **Graceful Shutdown Issues**
   - Check console output for cleanup errors
   - Verify signal handlers are properly registered

### Debug Mode

Enable verbose logging for subscription debugging:

```bash
export DEBUG=obsidian-mcp:subscriptions
npm start
```

## Migration Notes

### From Previous Versions

If upgrading from a version without subscription configuration:

1. No breaking changes - subscriptions are enabled by default
2. Environment variables are optional - defaults work out of the box
3. Existing functionality remains unchanged

### Custom Implementations

If you have custom server initialization code:

1. Replace direct `registerSubscriptions()` calls with `initializeServer()`
2. Use `createServerWithConfig()` instead of manually creating server instances
3. Add graceful shutdown handling with `shutdownServer()`

## Related Documentation

- [Subscription System Overview](../src/subscriptions/README.md)
- [MCP Resource Protocol](https://spec.modelcontextprotocol.io/specification/basic/resources/)
- [Server API Reference](../src/server/README.md)