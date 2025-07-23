# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- Binary file operations not supported
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

This separation enables clean PRs by cherry-picking only non-claude commits.

## Development Learnings

### Quality Improvement Process (2025-07-18)

**Methodological insights**:
- **Incremental Refactoring with TDD**: Successfully refactored 63 tasks using red-green-refactor cycle. Each change was tested independently, preventing regressions while maintaining functionality.
- **Dynamic Discovery Over Configuration**: Replacing hardcoded tool arrays with filesystem-based discovery eliminated manual registration and made the system self-maintaining.

**Technical insights**:
- **TypeScript Generics for Tool Safety**: Using `BaseTool<TArgs>` pattern eliminated any-type proliferation while maintaining flexibility. The execute/executeTyped pattern provides both type safety and backward compatibility.
- **Performance Utilities as Composable Units**: LRU cache, request deduplicator, and batch processor work independently but can be composed for complex scenarios. This modular approach enables targeted optimization.

### E2E Testing with Dynamic Discovery (2025-07-18)

**Technical insights**:
- **Chunked Response Handling**: Large tool lists (21KB for 33 tools) require buffered response parsing in E2E tests. Simple line-by-line parsing fails when JSON responses span multiple chunks.
- **Tool Discovery File Extension Handling**: Dynamic discovery must handle both .ts (development) and .js (production) files. Using `file.endsWith('Tool.ts') || file.endsWith('Tool.js')` ensures compatibility across environments.

## Project Learnings

### 2025-07-23 - Git Worktree Package.json Confusion

**Methodological:**
- **Git Forensics Before Assumptions**: When facing persistent directory/project confusion, trace through git history (`git show`, `git diff`) to understand how files changed over time. The issue may be in commit history rather than current configuration. In our case, a single commit had replaced the entire package.json, creating the confusion.

**Technical:**
- **Interactive Rebase with Selective File Restoration**: During interactive rebase, use `git checkout HEAD~ -- filename` to surgically restore specific files from the parent commit while preserving all other changes. This is more precise than cherry-picking or full commit resets and maintains the integrity of the actual work done.

## Insights and Memories

- **Obsidian MCP is only for obsidian notes, not filesystem access**
- **Performance optimization should be practical, not theoretical**
- **Tool ergonomics matter more than feature completeness**
- **Clean architecture enables easy extension and maintenance**
- **Obsidian API limitation**: The getPeriodicNote('daily') endpoint returns the current daily note only, not historical dates. This means vault://daily/{date} currently works the same for any date - it returns today's note. Future API updates may support date-specific queries.