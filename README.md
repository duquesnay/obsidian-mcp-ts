# Obsidian MCP Server (TypeScript)

A TypeScript MCP server to interact with Obsidian via the Local REST API community plugin.

**Note**: This is a TypeScript port of the original [mcp-obsidian](https://github.com/MarkusPfundstein/mcp-obsidian) Python project by MarkusPfundstein. All credit for the original concept and API design goes to the original author.

## Features

- **🚀 High Performance**: LRU caching, request deduplication, and optimized batch processing
- **🔧 Type Safety**: Full TypeScript with strict typing and comprehensive error handling
- **📋 Dynamic Tool Discovery**: Automatically discovers and loads tools with metadata
- **🎯 Smart Error Handling**: Simplified error responses with actionable suggestions
- **📦 Modular Architecture**: Clean separation of concerns with reusable utilities
- **📊 MCP Resources**: Read-only access to vault data through the resources protocol

## Performance Optimization: Internal Resource Caching

The Obsidian MCP server automatically optimizes performance through intelligent internal resource caching. This system provides significant speed improvements for frequently used operations while remaining completely transparent to users.

### How It Works

Several major tools now use internal MCP resources with smart caching instead of making direct API calls every time:

| Tool | Internal Resource | Cache Duration | Performance Benefit |
|------|------------------|----------------|-------------------|
| `obsidian_get_all_tags` | `vault://tags` | 5 minutes | 10-50x faster for tag operations |
| `obsidian_get_recent_changes` | `vault://recent` | 30 seconds | Near-instant recent file listings with titles & previews |
| `obsidian_get_file_contents` | `vault://note/{path}` | 2 minutes | Dramatically faster for repeated file access |
| `obsidian_simple_search` | `vault://search/{query}` | 1 minute | Cached search results for common queries |
| `obsidian_list_files_in_vault` | `vault://structure` | 5 minutes | Instant vault browsing after first load |
| `obsidian_list_files_in_dir` | `vault://folder/{path}` | 2 minutes | Fast folder navigation |

### User Benefits

- **Transparent Performance**: All speed improvements happen automatically - no configuration required
- **Backward Compatible**: Existing workflows continue to work exactly the same way
- **Smart Invalidation**: Cache automatically updates when you modify files through the tools
- **Reduced API Load**: Fewer direct calls to Obsidian's REST API improves overall responsiveness
- **Better User Experience**: Operations like browsing tags, searching, and accessing recent files feel instant

### Technical Details

The optimization works by:

1. **Resource-First Strategy**: Tools check internal MCP resources before making API calls
2. **Tiered Caching**: Different cache durations based on data volatility (30s for recent changes, 5min for vault structure)
3. **Graceful Fallback**: If resources aren't available, tools automatically fall back to direct API calls
4. **Memory Efficient**: Uses LRU caching with automatic cleanup to prevent memory leaks

This optimization is part of our commitment to making the Obsidian MCP server both powerful and performant for daily use.

## Feature Status

This section shows what resources and capabilities are available in the Obsidian MCP server.

### MCP Resources Available ✅

MCP Resources provide read-only access to data from your Obsidian vault through the resources protocol. These are ideal for AI assistants to maintain context about your vault.

**📚 See the [Complete Resources Guide](docs/RESOURCES.md) for detailed documentation, examples, and best practices.**

#### Static Resources (Cached 5min)

| Resource | Description | Example URI |
|----------|-------------|-------------|
| **Vault Tags** | All unique tags with usage counts | `vault://tags` |
| **Vault Statistics** | File and note counts for the vault | `vault://stats` |
| **Recent Changes** | Recently modified notes with preview mode (cached 30s) | `vault://recent` or `vault://recent?mode=full` |
| **Vault Structure** | Complete hierarchical structure | `vault://structure` |

#### Dynamic Resources (Cached 1-2min)

| Resource | Description | Example URI |
|----------|-------------|-------------|
| **Individual Notes** | Read any note by path | `vault://note/Daily/2024-01-01.md` |
| **Folder Contents** | Browse folder contents by path | `vault://folder/Projects` |
| **Daily Notes** | Access daily notes by date | `vault://daily/2024-01-15` |
| **Notes by Tag** | Find all notes with specific tag | `vault://tag/project` |
| **Search Results** | Search vault for content | `vault://search/meeting%20notes` |

#### Using Resources

Resources are accessed through the MCP protocol's `resources/list` and `resources/read` methods:

```typescript
// List available resources
const resources = await client.listResources();

// Read specific resources
const tags = await client.readResource('vault://tags');
const stats = await client.readResource('vault://stats');
const note = await client.readResource('vault://note/meeting-notes.md');
const folder = await client.readResource('vault://folder/Projects');

// Recent changes with preview mode (default)
const recentPreview = await client.readResource('vault://recent');
// Returns: { notes: [{ path, title, modifiedAt, preview }], mode: 'preview' }

// Recent changes with full content 
const recentFull = await client.readResource('vault://recent?mode=full');
// Returns: { notes: [{ path, title, modifiedAt, content }], mode: 'full' }
```

**⚠️ Claude Desktop Limitation:** Resources currently cannot be accessed directly in Claude Desktop due to a [known limitation](https://github.com/modelcontextprotocol/typescript-sdk/issues/686). However, equivalent tools provide the same functionality with automatic caching benefits. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#claude-desktop-mcp-resource-limitation) for details.

#### Resource vs Tool Decision

- **Resources**: Read-only data access, cached responses, reference information that AI needs in context
- **Tools**: Actions that modify content, real-time operations, one-time queries

**Example workflow**: Use `vault://tags` resource to see available tags → Use `obsidian_get_files_by_tag` tool to find specific files → Use `vault://note/{path}` resource to read those files.

### Tools

The server implements multiple tools to interact with Obsidian:

- list_files_in_vault: Lists all files and directories in the root directory of your Obsidian vault
- list_files_in_dir: Lists all files and directories in a specific Obsidian directory (now returns empty array for empty directories instead of error)
- find_empty_directories: Find all empty directories in your vault by scanning the directory structure
- get_file_contents: Return the content of a single file in your vault
- batch_get_file_contents: Return the contents of multiple files in your vault, concatenated with headers
- simple_search: Simple search for documents matching a specified text query across all files in the vault
- advanced_search: Advanced search with structured filters for content, metadata, tags, and frontmatter (recommended)
- complex_search: Complex search using JsonLogic queries - requires Obsidian REST API support for JsonLogic operators
- obsidian_edit: Edit Obsidian vault notes with smart operations - progressive complexity from simple appends to structured edits
- simple_append: Simple text appending to files - reliable for basic additions
- simple_replace: Simple find and replace operations - straightforward text replacement
- query_structure: Query document structure to get headings, blocks, and sections - useful for LLMs to build unambiguous references before modifying content
- append_content: Append content to a new or existing file in the vault
- delete_file: Delete a file or directory from your vault
- rename_file: Rename a file within the same directory while preserving history and updating links (requires updated REST API plugin)
- move_file: Move a file to a different location (can move between directories, rename in place, or both) while preserving history and updating links (requires updated REST API plugin)
- move_directory: Move an entire directory and all its contents to a different location while preserving the internal structure and updating all links
- copy_file: Copy a file to a new location within the vault, creating a duplicate with all content preserved
- copy_directory: Copy an entire directory and all its contents to a new location, preserving the internal structure
- check_path_exists: Check if a file or directory exists in the vault and determine its type
- create_directory: Create a new directory in the vault, with support for creating nested directory structures
- delete_directory: Delete a directory from the vault, with optional recursive deletion of contents
- get_all_tags: List all unique tags in the vault with their usage counts
- get_files_by_tag: Get all files that contain a specific tag
- rename_tag: Rename a tag across the entire vault
- manage_file_tags: Add or remove tags from a specific file
- get_periodic_note: Get current periodic note for the specified period (daily, weekly, monthly, quarterly, yearly)
- get_recent_periodic_notes: Get most recent periodic notes for the specified period type
- get_recent_changes: Get recently modified files in the vault (note: content preview parameter not yet supported by API)
- get_file_metadata: Get file metadata (size, dates, permissions) without retrieving content - efficient for large files
- get_file_frontmatter: Get only the frontmatter of a file without content - efficient for metadata analysis
- get_file_formatted: Get file in different formats (plain text, HTML, etc.) for token optimization

### Example prompts

Its good to first instruct Claude to use Obsidian. Then it will always call the tool.

The use prompts like this:
- Get the contents of the last architecture call note and summarize them
- Search for all files where Azure CosmosDb is mentioned and quickly explain to me the context in which it is mentioned
- Summarize the last meeting notes and put them into a new note 'summary meeting.md'. Add an introduction so that I can send it via email.
- Rename my file 'draft-proposal.md' to 'final-proposal-2024.md'
- Replace all occurrences of '![[old-image.png]]' with '![[new-image.png]]' in my notes
- Find and replace 'TODO:' with '- [ ]' in meeting-notes.md to convert to checkboxes
- Move 'inbox/todo.md' to 'projects/active/todo.md' to reorganize it
- Move all files from the 'inbox' folder to 'processed/2024' folder
- Move the entire 'drafts/2023' directory to 'archive/2023/drafts' to organize old content
- Copy 'templates/meeting-template.md' to 'meetings/2024-07-02-standup.md' for today's meeting
- Check if 'projects/important-project/' directory exists before creating new files there
- Create a new directory 'projects/2024/q3-initiatives' for organizing quarterly work
- Delete the empty 'old-drafts/' directory (moves to trash by default)
- Permanently delete 'temp-folder/' and all its contents with recursive=true and permanent=true
- Copy 'projects/template-structure/' to 'projects/new-client/' to reuse project structure
- List all tags in my vault to see which ones are most used
- Find all files tagged with #project to review my active projects
- Rename the tag #todo to #task across all my notes
- Add tags #meeting #important to today's meeting notes
- Search for files containing "API" that were modified in the last week
- Find all notes with frontmatter field "status" equal to "in-progress"
- Search for markdown files larger than 10KB containing regex pattern "TODO|FIXME"
- Get just the metadata for large-notes.md to check its size before reading
- Extract only the frontmatter from meeting-notes.md to analyze the tags and status
- Get today's daily note in plain text format without markdown formatting
- Retrieve project-readme.md as HTML for sharing outside Obsidian
- Find all empty directories in my vault for cleanup
- Search for empty directories within the 'archive' folder only
- List files in 'projects/drafts/' - will return empty array if the directory is empty

## Editing Tools Overview

The MCP server provides tools with progressive complexity for editing Obsidian notes:

### Simple Operations
- **`obsidian_simple_append`** - Append text to files with automatic newline handling
- **`obsidian_simple_replace`** - Find and replace text in files

### Smart Editing
- **`obsidian_edit`** - Unified editing tool with progressive complexity:
  - Stage 1: Simple append operations (100% reliability)
  - Stage 2: Structure-aware edits (insert after/before headings)
  - Stage 3: Complex operations (batch edits, new sections)

### Structure Query
- **`obsidian_query_structure`** - Query document structure to find headings and blocks before editing

**Usage examples:**
```typescript
// Simple append
await obsidian_simple_append({
  filepath: "note.md",
  content: "New paragraph"
});

// Smart editing - insert after heading
await obsidian_edit({
  file: "note.md",
  after: "Overview",
  add: "New content after the Overview heading"
});

// Find and replace
await obsidian_simple_replace({
  filepath: "note.md",
  find: "old text",
  replace: "new text"
});

// Complex batch operations
await obsidian_edit({
  file: "note.md",
  batch: [
    { after: "Introduction", add: "New intro content" },
    { find: "TODO", replace: "DONE" }
  ]
});
```

See the [migration guide](docs/llm-ergonomic-migration-guide.md) for details.

## Tool Categories

Tools are organized into categories for better discoverability:

- **File Operations**: Read, write, copy, move files
- **Directory Operations**: Create, delete, move directories
- **Search**: Simple and advanced search capabilities
- **Editing**: Smart content editing with structure awareness
- **Tags**: Tag management and operations
- **Periodic Notes**: Daily, weekly, monthly note support

## Configuration

### Obsidian REST API Key

The MCP server needs an API key to connect to Obsidian. There are multiple ways to provide it (in order of precedence):

1. **Environment variables** (highest priority)
   ```bash
   export OBSIDIAN_API_KEY=your_api_key_here
   export OBSIDIAN_HOST=127.0.0.1  # optional, defaults to 127.0.0.1
   ```

2. **External config file** (recommended for persistent setup)
   
   Create `~/.config/mcp/obsidian.json`:
   ```json
   {
     "apiKey": "your_api_key_here",
     "host": "127.0.0.1"
   }
   ```
   
   Or use a custom location:
   ```bash
   export OBSIDIAN_CONFIG_FILE=/path/to/your/config.json
   ```

3. **Claude Desktop config** (for Claude Desktop users)
   ```json
   {
     "obsidian-mcp-ts": {
       "command": "npx",
       "args": ["obsidian-mcp-ts"],
       "env": {
         "OBSIDIAN_API_KEY": "<your_api_key_here>",
         "OBSIDIAN_HOST": "<your_obsidian_host>"
       }
     }
   }
   ```

Note: You can find the API key in the Obsidian Local REST API plugin settings.

## Quickstart

### Install

#### Install from npm

```bash
npm install -g obsidian-mcp-ts
```

#### Obsidian REST API

You need the Obsidian REST API community plugin running: https://github.com/coddingtonbear/obsidian-local-rest-api

Install and enable it in the settings and copy the api key.

#### Claude Desktop

On MacOS: `~/Library/Application\ Support/Claude/claude_desktop_config.json`

On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

<details>
  <summary>Development/Unpublished Servers Configuration</summary>
  
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "node",
      "args": [
        "<path_to>/obsidian-mcp-ts/dist/index.js"
      ],
      "env": {
        "OBSIDIAN_API_KEY": "<YOUR_OBSIDIAN_API_KEY>"
      }
    }
  }
}
```
</details>

<details>
  <summary>Published Servers Configuration</summary>
  
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "npx",
      "args": [
        "obsidian-mcp-ts"
      ],
      "env": {
        "OBSIDIAN_API_KEY": "<YOUR_OBSIDIAN_API_KEY>"
      }
    }
  }
}
```
</details>

<details>
  <summary>Using External Config File (Recommended)</summary>
  
First, create the config file at `~/.config/mcp/obsidian.json`:
```json
{
  "apiKey": "your-obsidian-api-key-here",
  "host": "127.0.0.1"
}
```

Then in Claude Desktop config, you only need:
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "npx",
      "args": ["obsidian-mcp-ts"]
    }
  }
}
```

The server will automatically load the API key from the config file. You can also use a custom config location:
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "npx",
      "args": ["obsidian-mcp-ts"],
      "env": {
        "OBSIDIAN_CONFIG_FILE": "/path/to/your/config.json"
      }
    }
  }
}
```
</details>

## Error Handling

The MCP server uses a simplified error format for clear and consistent error reporting:

### Error Response Structure

All errors follow this structure:
```typescript
{
  success: false,
  error: string,        // Error message
  tool: string,         // Tool name that generated the error
  suggestion?: string,  // Optional actionable suggestion
  example?: object      // Optional example of correct usage
}
```

### Common Error Types

1. **File Not Found (404)**
   ```json
   {
     "success": false,
     "error": "File not found: notes/missing.md",
     "tool": "obsidian_get_file_contents",
     "suggestion": "Use obsidian_list_files_in_vault to browse available files first"
   }
   ```

2. **Authentication Failed (401)**
   ```json
   {
     "success": false,
     "error": "Authentication failed - check API key",
     "tool": "obsidian_list_files_in_vault",
     "suggestion": "Verify your OBSIDIAN_API_KEY is correct in Claude Desktop settings"
   }
   ```

3. **Invalid Parameters**
   ```json
   {
     "success": false,
     "error": "Missing required parameters",
     "tool": "obsidian_append_content",
     "suggestion": "Provide both filepath and content parameters",
     "example": {
       "filepath": "notes/example.md",
       "content": "New content to append"
     }
   }
   ```

### Error Recovery

When you encounter an error:
1. Check the `suggestion` field for immediate fixes
2. Use the `example` field to understand correct parameter format
3. For file operations, verify the file exists with `obsidian_list_files_in_vault`
4. For authentication errors, check your API key configuration

## Development

### Building

To prepare the package for distribution:

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

### Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run integration tests (requires compiled code)
npm run build
npm run test:integration

# Run E2E tests against real Obsidian API
OBSIDIAN_API_KEY=your-key npm run test:e2e

# Run tests in watch mode during development
npm run test -- --watch
```

### Debugging

Since MCP servers run over stdio, debugging can be challenging. For the best debugging
experience, we strongly recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

You can launch the MCP Inspector via [`npm`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) with this command:

```bash
# For development (with TypeScript)
npx @modelcontextprotocol/inspector tsx src/index.ts

# For production (compiled)
npx @modelcontextprotocol/inspector node dist/index.js
```

Upon launching, the Inspector will display a URL that you can access in your browser to begin debugging.

You can also watch the server logs with this command:

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp-server-obsidian-mcp-ts.log
```

### Development Commands

```bash
# Run in development mode with auto-reload
npm run dev

# Type check without building
npm run typecheck

# Build for production
npm run build

# Run the built server
npm start

# Lint code
npm run lint
```

### Performance Optimization

The server includes several performance optimizations:

- **LRU Cache**: Reduces API calls for frequently accessed data
- **Request Deduplication**: Prevents duplicate concurrent requests
- **Optimized Batch Processing**: Smart concurrency control with retry logic
- **Streaming Results**: Process large datasets without loading everything into memory

#### Performance Benchmarks
Compare cached vs non-cached operations to understand when caching is beneficial:

```bash
# Run comprehensive benchmark test
npm test -- tests/benchmarks/cached-vs-noncached.benchmark.test.ts

# Quick standalone benchmark
npx tsx scripts/run-cache-benchmark.ts --scenario sequential

# Test with different configurations
npx tsx scripts/run-cache-benchmark.ts --iterations 100 --data-size 10240
```

The benchmarks test six scenarios:
- **Sequential Access**: High hit rate (90-98%), 10-50x speedup ✅
- **80/20 Pattern**: Realistic usage (70-85% hit rate), 3-8x speedup ✅  
- **Random Access**: Low hit rate (10-30%), marginal benefit ⚠️
- **Unique Access**: No cache benefit (0% hit rate), disable caching ❌

See [Cache Performance Benchmarks](docs/Cache-Performance-Benchmarks.md) for detailed analysis and configuration guidelines.

See [Performance Best Practices](docs/PERFORMANCE.md) for detailed optimization strategies.

### Architecture

The codebase follows clean architecture principles:

- **Tools**: Each tool is a self-contained class with metadata
- **Utilities**: Reusable components (Cache, BatchProcessor, ErrorHandler)
- **Constants**: Centralized configuration values
- **Types**: Comprehensive TypeScript types for all operations

Tools are dynamically discovered at runtime, making it easy to add new functionality.
