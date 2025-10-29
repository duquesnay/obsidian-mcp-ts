# MCP Logging Module

Provides comprehensive logging infrastructure for the Obsidian MCP server with MCP protocol integration.

## Features

- **Circular Buffer**: Memory-efficient log storage (default 1000 entries, configurable)
- **Level-Based Filtering**: 8 log levels (debug, info, notice, warning, error, critical, alert, emergency)
- **MCP Integration**: Sends logs to MCP clients via `server.sendLoggingMessage()`
- **Export to JSON**: Serialize logs for analysis
- **Performance**: <1ms overhead per log entry
- **Tool Usage Tracking**: Methods for tools to log their execution

## Architecture

### Components

1. **LoggingManager** (`LoggingManager.ts`)
   - Circular buffer implementation
   - Level filtering
   - Statistics and export
   - Zero dependencies on MCP SDK

2. **LoggingHandler** (`LoggingHandler.ts`)
   - MCP protocol integration
   - Client capability detection
   - Tool execution helpers
   - Graceful degradation

3. **Types** (`types.ts`)
   - TypeScript interfaces
   - Log level definitions
   - Configuration options

## Usage

### Basic Setup

```typescript
import { registerLogging } from './logging/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({ name: 'my-server', version: '1.0.0' });

// Register logging with custom config
const loggingHandler = await registerLogging(server, {
  maxEntries: 2000,
  minLevel: 'info',
  sendToClient: true,
  logToConsole: false,
});
```

### Logging Messages

```typescript
// Simple message
await loggingHandler.logMessage('info', 'Operation completed');

// With tool name and context
await loggingHandler.logMessage(
  'warning',
  'Rate limit approaching',
  'ApiClient',
  { remaining: 10 }
);

// Error with details
const error = new Error('Connection failed');
await loggingHandler.logError(
  'Failed to connect',
  error,
  'NetworkClient',
  { retries: 3 }
);
```

### Tool Usage Tracking

Tools can log their execution:

```typescript
class MyTool extends BaseTool {
  async executeTyped(args: MyArgs): Promise<ToolResponse> {
    const startTime = await server.loggingHandler?.logToolStart(this.name, args);

    try {
      const result = await this.performWork(args);

      await server.loggingHandler?.logToolSuccess(this.name, startTime, result);

      return this.formatResponse(result);
    } catch (error) {
      await server.loggingHandler?.logToolError(this.name, startTime, error as Error);
      throw error;
    }
  }
}
```

### Export Logs

```typescript
// Export to JSON file
await loggingHandler.exportLogs('planning/research/usage-logs.json');

// Get statistics
const stats = loggingHandler.getManager().getStats();
console.log(`Total logs: ${stats.total}`);
console.log(`By level:`, stats.byLevel);
console.log(`By tool:`, stats.byTool);
```

### Filtering

```typescript
const manager = loggingHandler.getManager();

// Get all entries
const allLogs = manager.getEntries();

// Filter by level
const errorsOnly = manager.getEntriesByLevel('error');

// Filter by tool
const tool1Logs = manager.getEntriesByTool('Tool1');
```

### Runtime Configuration

```typescript
// Update configuration
loggingHandler.getManager().setConfig({
  minLevel: 'warning', // Only log warnings and above
  sendToClient: false, // Stop sending to client
});

// Clear logs
loggingHandler.getManager().clear();
```

## Configuration Options

```typescript
interface LoggingConfig {
  /** Maximum number of log entries (default: 1000) */
  maxEntries?: number;

  /** Minimum log level to capture (default: 'debug') */
  minLevel?: LogLevel;

  /** Send logs to MCP client (default: true) */
  sendToClient?: boolean;

  /** Log to console for debugging (default: false) */
  logToConsole?: boolean;
}
```

## Log Levels

Ordered by severity (lowest to highest):

1. **debug** - Detailed debugging information
2. **info** - General informational messages
3. **notice** - Normal but significant events
4. **warning** - Warning messages
5. **error** - Error conditions
6. **critical** - Critical conditions
7. **alert** - Action must be taken immediately
8. **emergency** - System is unusable

## Performance

- **Log entry creation**: <1ms average
- **Circular buffer**: O(1) insert, O(n) retrieval
- **Memory**: ~1KB per entry (depends on message/context size)
- **Client sending**: Async, doesn't block tool execution

## Testing

### Unit Tests

```bash
npm test tests/unit/logging/
```

Tests cover:
- Circular buffer behavior
- Level filtering
- Export functionality
- Statistics
- Performance (<1ms per log)

### Integration Tests

```bash
npm test tests/integration/logging/
```

Tests cover:
- MCP protocol integration
- Client capability detection
- Export to file
- Multi-level filtering

## Future Enhancements

Potential improvements (not currently implemented):

1. **Automatic Tool Wrapping**: Hook into tool execution at protocol level
2. **Log Rotation**: Automatic file rotation for long-running servers
3. **Remote Logging**: Send logs to external logging services
4. **Query API**: Advanced filtering and search capabilities
5. **Metrics Integration**: Export metrics to monitoring systems

## Notes

- **Client Support**: Logging requires MCP client support. The handler gracefully degrades if client doesn't support logging.
- **No Breaking Changes**: Adding logging doesn't affect existing functionality.
- **Opt-In Tool Tracking**: Tools must explicitly call logging methods; automatic wrapping isn't implemented due to SDK limitations.
