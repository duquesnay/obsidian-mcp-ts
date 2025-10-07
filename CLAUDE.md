# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Usage Requirement

**MANDATORY**: Always use specialized agents for development work. Delegate all tasks using the Task tool - never perform complex work directly.

## Project Overview

obsidian-mcp-ts is a TypeScript Model Context Protocol (MCP) server that provides an interface for AI assistants to interact with Obsidian vaults via the Local REST API community plugin. It enables reading, writing, searching, and managing notes programmatically.

**Key Features:**
- Full TypeScript implementation with strict typing
- Dynamic tool discovery with metadata and categorization
- High-performance utilities (LRU cache, request deduplication, batch processing)
- Comprehensive error handling with actionable suggestions
- Clean architecture with separation of concerns

## Development Commands

### Setup and Dependencies
```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run built server
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests (requires Obsidian with REST API)
npm run test:e2e

# Test in watch mode
npm run test -- --watch
```

### Debugging
```bash
# Use MCP Inspector for interactive debugging
npx @modelcontextprotocol/inspector tsx src/index.ts

# View logs on macOS
tail -f ~/Library/Logs/Claude/mcp-server-obsidian-mcp-ts.log

# Environment setup for development
export OBSIDIAN_API_KEY=your_api_key_here
export OBSIDIAN_HOST=127.0.0.1  # Optional, defaults to 127.0.0.1
```

## Architecture

### Core Components

1. **src/index.ts** - MCP server entry point
   - Initializes server with stdio transport
   - Registers tools dynamically
   - Handles server lifecycle

2. **src/tools/** - Tool implementations
   - Each tool is a class extending BaseTool
   - Includes metadata (category, keywords, version)
   - Dynamic discovery at runtime
   - 33 tools across 6 categories

3. **src/obsidian/ObsidianClient.ts** - REST API client
   - Axios-based HTTP client
   - Handles authentication and request formatting
   - Configurable timeouts and retries
   - Path validation and encoding

4. **src/utils/** - Reusable utilities
   - **ObsidianErrorHandler**: Centralized error handling
   - **BatchProcessor**: Batch operations with concurrency control
   - **OptimizedBatchProcessor**: Advanced batch processing with retries
   - **LRUCache**: Cache with TTL support
   - **RequestDeduplicator**: Prevent duplicate concurrent requests
   - **pathValidator**: Path validation and security

5. **src/constants.ts** - Configuration constants
   - Default values for host, port, timeouts
   - Batch sizes and limits
   - Error messages

### Tool Categories

Tools are organized into categories with metadata:

1. **File Operations** (`file-operations`)
   - List, read, create, copy, move, delete files
   - Check path existence
   - Get metadata without content

2. **Directory Operations** (`directory-operations`)
   - Create, delete, move, copy directories
   - Find empty directories
   - List directory contents

3. **Search** (`search`)
   - Simple text search
   - Advanced search with filters
   - Complex JsonLogic queries

4. **Editing** (`editing`)
   - Smart content editing (UnifiedEditTool)
   - Simple append and replace
   - Structure-aware insertions
   - Query document structure

5. **Tags** (`tags`)
   - List all tags with counts
   - Find files by tag
   - Rename tags globally
   - Manage file tags

6. **Periodic Notes** (`periodic-notes`)
   - Get current periodic notes
   - Get recent periodic notes
   - Track recent changes

### Type System

The codebase uses TypeScript generics extensively:

```typescript
// Base tool with typed arguments
abstract class BaseTool<TArgs = any> {
  abstract executeTyped(args: TArgs): Promise<ToolResponse>;
  execute(args: any): Promise<ToolResponse>;
}

// Specific tool implementation
class GetFileContentsTool extends BaseTool<GetFileContentsArgs> {
  async executeTyped(args: GetFileContentsArgs): Promise<ToolResponse> {
    // Type-safe implementation
  }
}
```

## Code Patterns

### Tool Implementation Pattern
```typescript
export class NewTool extends BaseTool<NewToolArgs> {
  name = 'obsidian_new_tool';
  description = 'Tool description for MCP';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['keyword1', 'keyword2'],
    version: '1.0.0'
  };

  inputSchema = {
    type: 'object' as const,
    properties: {
      // Define parameters
    },
    required: ['param1']
  };

  async executeTyped(args: NewToolArgs): Promise<ToolResponse> {
    try {
      // Validate inputs
      validatePath(args.path, 'path');
      
      // Get client and make request
      const client = this.getClient();
      const result = await client.method(args);
      
      // Return formatted response
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

### Error Handling
```typescript
// Use ObsidianErrorHandler for consistent errors
return ObsidianErrorHandler.handle(error, this.name, {
  404: 'File not found',
  403: 'Permission denied',
  401: 'Authentication failed'
});

// Or use simplified error format
return this.formatError('Error message', {
  suggestion: 'Try this instead',
  example: { param: 'value' }
});
```

### Performance Patterns
```typescript
// Use cache for read operations
const cache = new LRUCache<string, any>({ maxSize: 100, ttl: 60000 });

// Deduplicate concurrent requests
const deduplicator = new RequestDeduplicator();
return deduplicator.dedupe(key, () => client.request());

// Batch process with optimized concurrency
const processor = new OptimizedBatchProcessor({ maxConcurrency: 5 });
const results = await processor.process(items, processItem);
```

## Common Development Tasks

### Integration Checklist for New Features
When implementing new functionality, ensure FULL integration:
1. **Write the code** - Create classes, utilities, or components
2. **Connect to production** - Import and instantiate in main code paths
3. **Wire dependencies** - Ensure all connections are made (e.g., event listeners, handlers)
4. **Verify usage** - Confirm the feature is actually called in production flows
5. **Test end-to-end** - Write integration tests that verify the complete flow

**Common Integration Pitfalls:**
- Creating a class but never instantiating it
- Building event handlers but not registering them
- Writing utilities but not importing them where needed
- Marking tasks "complete" after writing code but before integration

### Adding a New Tool
1. Create new file in `src/tools/NewTool.ts`
2. Extend BaseTool with typed arguments
3. Add metadata for categorization
4. Implement executeTyped method
5. Tool is automatically discovered at runtime
6. Update README.md with tool documentation
7. Add tests in `src/tools/NewTool.test.ts`

### Testing with Obsidian
1. Install Local REST API plugin in Obsidian
2. Generate API key from plugin settings
3. Ensure plugin is running (check port 27124)
4. Set `OBSIDIAN_API_KEY` environment variable
5. Use MCP Inspector to test individual tools

### Debugging Issues
- Check Obsidian plugin is running: `curl -k https://127.0.0.1:27124/`
- Verify API key is correct
- Check logs for detailed error messages
- Use MCP Inspector for step-by-step debugging
- Enable DEBUG environment variable for verbose output

## Configuration

### Development Setup
```bash
# .env file
OBSIDIAN_API_KEY=your_key_here
OBSIDIAN_HOST=127.0.0.1
```

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "npx",
      "args": ["obsidian-mcp-ts"],
      "env": {
        "OBSIDIAN_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Contributing Guidelines

### Code Standards
- TypeScript with strict mode enabled
- No `any` types except in base interfaces
- Comprehensive error handling
- Tests for all new functionality
- Follow existing patterns and conventions

### Testing Requirements
- Unit tests for utilities and helpers
- Integration tests for tools
- E2E tests for critical paths
- Maintain > 80% code coverage

### Pull Request Process
1. Test changes with real Obsidian vault
2. Update README if adding new tools
3. Ensure all tests pass
4. Update version in package.json
5. Document any breaking changes

## Performance Considerations

### Caching Strategy
- Use LRU cache for frequently accessed data
- Cache vault listings and metadata
- Invalidate on write operations
- Configure TTL based on data volatility

### Request Optimization
- Deduplicate concurrent identical requests
- Batch operations when possible
- Use appropriate timeouts for different operations
- Stream large result sets

### Memory Management
- Process large vaults incrementally
- Clear caches periodically
- Use streaming for batch operations
- Monitor memory usage in production

## Known Limitations
- Requires Obsidian to be running with REST API plugin
- SSL verification disabled for self-signed certificates
- Binary files limited to 10 MB for safety and performance
- Large vaults may require performance tuning
- Some Obsidian features (canvas, graph) not accessible via REST API

## Recent Improvements (Quality Backlog Completion)

### Completed Initiatives (97% - 61/63 tasks)

1. **Constants & Magic Numbers** ✅
   - Extracted all hardcoded values to constants.ts
   - Centralized configuration management

2. **Error Handling Consolidation** ✅
   - Created ObsidianErrorHandler utility
   - Simplified error response format
   - Consistent error messages across all tools

3. **Type Safety Improvements** ✅
   - Removed all `any` types (except base interface)
   - Added generics to BaseTool
   - Created typed argument interfaces for all tools

4. **Architecture Improvements** ✅
   - Split ObsidianClient responsibilities
   - Created reusable utilities (BatchProcessor, Cache, etc.)
   - Implemented clean separation of concerns

5. **Dynamic Tool System** ✅
   - Automatic tool discovery at runtime
   - Tool metadata and categorization
   - No more hardcoded tool lists

6. **Performance Optimizations** ✅
   - LRU cache implementation
   - Request deduplication
   - Optimized batch processing
   - Comprehensive performance documentation

### Architectural Decisions
- **Kept "Tool" suffix**: For clarity in dynamic discovery
- **Maintained execute/executeTyped**: Backward compatibility
- **Focused on practical optimizations**: Over complex metrics

## Team Coordination and Task Management

### Coordination Patterns
Use team coordination when dealing with:
- Multi-step development work requiring multiple specialists
- Complex features spanning multiple components  
- Bug fixes requiring investigation across domains
- Refactoring projects with systematic task management
- Quality improvement initiatives

### Workflow Options
1. **Main Agent as Coordinator**: Use TodoWrite extensively for task tracking and delegate to specialists using Task tool
2. **Dedicated Backlog Manager**: Use `Task(subagent_type="backlog-manager")` for strategic project management and persistent goal tracking

### Core Coordination Workflow
1. **Read** → Understand current state (backlog, codebase)
2. **Plan** → Break down work into manageable pieces  
3. **Delegate** → Use Task tool to assign work to specialists
4. **Track** → Monitor progress and update task status
5. **Complete** → Verify completion and mark tasks done

### Specialist Agent Delegation Map
- **Development work** → `developer`
- **Git operations** → `git-workflow-manager`
- **Testing** → `test-engineer`
- **Code quality** → `code-quality-analyst`
- **Architecture** → `architecture-reviewer`
- **Performance** → `performance-optimizer`
- **Documentation** → `documentation-writer`
- **Integration** → `integration-specialist`

### Process Indication Best Practices
- **Mark tasks in progress** before starting work (use TodoWrite)
- **Update status immediately** after completion
- **One task in progress** at a time to maintain focus
- **Delegate implementation work** to appropriate specialists
- **Track goal-oriented items** in backlog vs technical tasks

### TDD Coordination Pattern
Follow Red-Green-Refactor cycle through delegation:
1. **Red**: Write failing tests (→ test-engineer)
2. **Green**: Implement minimal code (→ developer)
3. **Refactor**: Improve code quality (→ code-quality-analyst)
4. **Validate**: Ensure tests pass (→ test-engineer)

### Quality Review Integration
Schedule quality reviews after every 3 completed features:
1. **Analyze** codebase state (→ code-quality-analyst)
2. **Assess** architecture patterns (→ architecture-reviewer)
3. **Evaluate** performance opportunities (→ performance-optimizer)
4. **Review** test coverage (→ test-engineer)
5. **Document** findings and create improvement tasks

### Backlog Management
**Goal-oriented items** (recorded in .claude/backlog.md):
- User-facing features and capabilities
- What users will experience or benefit from
- Marked with checkboxes: [ ] todo, [⏳] work-in-progress, [x] done

**Implementation tasks** (dispatched to specialists):
- Technical work needed to achieve backlog goals
- Internal development activities
- Not tracked in backlog, managed through TodoWrite

## Git Workflow for Claude Development

### Commit Prefix Strategy

**Strict Rule**: Always separate Claude-related changes from actual code changes using commit prefixes.

#### For Feature/Bug Development:
```bash
git commit -m "feat: add new functionality"
git commit -m "fix: resolve issue with X"
git commit -m "refactor: improve code structure"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for X"
git commit -m "perf: optimize batch processing"
```

#### For Claude-Related Files:
```bash
git commit -m "claude: update CLAUDE.md with learnings"
git commit -m "claude: add implementation notes"
git commit -m "claude: document architectural decisions"
```

#### For Backlog-Related Files:
```bash
git commit -m "backlog: add new feature goals"
git commit -m "backlog: update story map with completed tasks"
git commit -m "backlog: document user story acceptance criteria"
```

This separation enables clean PRs by cherry-picking only non-claude commits.


## Project Learnings

### 2025-10-07 - MCP4 Binary File Support

**Technical:**
- **Auto-Detection Strategy**: Using file extension-based detection (rather than content sniffing) provides reliable, fast binary file identification without requiring file reads. The `BinaryFileHandler.isBinaryFile()` method maps 20+ extensions to appropriate MIME types, enabling seamless integration with existing resource URIs.
- **Base64 Encoding for Binary Transport**: Binary files are base64-encoded for safe transport through the MCP protocol. The `BlobResourceContents` type (vs `TextResourceContents`) signals to clients that decoding is required, maintaining type safety while enabling binary data access.
- **Size Limits for Safety**: The 10 MB limit prevents memory issues and ensures responsive performance. Files exceeding this threshold return clear errors suggesting alternative access methods (tools vs resources), guiding users toward appropriate workflows.

**Methodological:**
- **Unified URI Pattern Extension**: Rather than creating separate URIs for binary files (e.g., `vault://image/{path}`), MCP4 extends the existing `vault://note/{path}` pattern with automatic type detection. This reduces cognitive load and maintains consistency - users don't need to know file type before accessing.
- **Type-Based Response Polymorphism**: The resource handler returns different content types (`TextResourceContents` vs `BlobResourceContents`) based on file type, allowing clients to handle responses appropriately without breaking backward compatibility. This pattern enables progressive enhancement of resource capabilities.

### 2025-10-07 - MCP Resource Enhancement (MCP1-MCP3)

**Technical:**
- **Metadata Utility Pattern**: The `ResourceMetadataUtil` provides a clean separation of concerns for fetching resource metadata. By using the existing `getFileContents(filepath, 'metadata')` API call, we avoid adding new API dependencies while providing size and timestamp information efficiently.
- **Graceful Degradation Strategy**: The `_meta` field is optional and metadata fetching uses try-catch with fallback defaults. This ensures resources remain functional even when metadata fetch fails, prioritizing reliability over complete information.
- **Error Code Mapping**: HTTP status codes map to MCP error codes based on semantic meaning: 404 (not found) → MethodNotFound, validation errors → InvalidParams, server errors → InternalError. This maintains protocol compliance while preserving meaningful error context.

**Methodological:**
- **Optional Metadata Design**: Making `_meta` optional in the Resource interface enables backward compatibility and graceful degradation. Clients can check for metadata presence and adapt behavior accordingly, preventing breaking changes.
- **Batch Metadata Fetching**: The `batchFetchMetadata` utility with concurrency control (BATCH_SIZE = 5) balances performance with API rate limits. This pattern prevents overwhelming the Obsidian API while enabling efficient multi-file metadata retrieval.

### 2025-01-29 - RSM/RPS Test Debugging and Coverage Enhancement

**Methodological:**
- **Structured Debugging with Todo Tracking**: Using TodoWrite to decompose complex multi-failure scenarios into discrete, trackable tasks proved essential for systematic resolution. Breaking down 27+ test failures into 5 specific categories (BaseResourceHandler MIME types, hardcoded numbers, SearchHandler migration, resource integration mismatches, full suite verification) prevented overwhelm and ensured nothing was missed. This approach transforms chaotic debugging into methodical problem-solving.

**Technical:**
- **Response Mode System Architecture**: The BaseResourceHandler's auto-detection mechanism (`execute()` method) determines MIME type based on return value type - objects become JSON, strings become markdown. This means `processResponseContent()` must return structured objects (via `ResponseModeSystem.createModeResponse()`) to trigger JSON auto-detection, not raw strings. This pattern enables seamless response mode integration without breaking existing API contracts.

**Methodological:**
- **Sub-Agent Delegation for Comprehensive Coverage**: When facing systematic quality improvements (like test coverage), delegating to specialized sub-agents with clear success criteria achieves better results than attempting comprehensive work directly. The developer sub-agent fixed 30/31 test failures and added 76+ comprehensive test cases, achieving professional-grade coverage that would have taken significantly longer to implement manually. This demonstrates the power of strategic delegation for complex, systematic work.

## Insights and Memories

- **Obsidian MCP is only for obsidian notes, not filesystem access**
- **Performance optimization should be practical, not theoretical**
- **Tool ergonomics matter more than feature completeness**
- **Clean architecture enables easy extension and maintenance**
- **Obsidian API limitation**: The getPeriodicNote('daily') endpoint returns the current daily note only, not historical dates. This means vault://daily/{date} currently works the same for any date - it returns today's note. Future API updates may support date-specific queries.
- **SSL verficiation must be deactivated since obsidian is accessed locally**
- **Claude Desktop resource limitation**: Resources appear as "connected" but cannot be accessed by users due to [TypeScript SDK #686](https://github.com/modelcontextprotocol/typescript-sdk/issues/686) and [Python SDK #263](https://github.com/modelcontextprotocol/python-sdk/issues/263). Our internal resource integration provides the same benefits through tools with automatic caching.
- ALWAYS delegate to sub agents, even for small tasks