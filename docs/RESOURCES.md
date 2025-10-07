# MCP Resources Guide

This guide explains how to use the MCP Resources feature in obsidian-mcp-ts to access your Obsidian vault data through the Model Context Protocol.

## Table of Contents

1. [Overview](#overview)
2. [Available Resources](#available-resources)
3. [URI Format and Parameters](#uri-format-and-parameters)
4. [Usage Examples](#usage-examples)
5. [Common Use Cases](#common-use-cases)
6. [Integration Guide](#integration-guide)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Overview

MCP Resources provide a standardized way for AI assistants to access read-only data from your Obsidian vault. Unlike tools which perform actions, resources are designed for retrieving and maintaining context about your vault's content and structure.

**⚠️ Important Note - Claude Desktop Limitation:**
Due to a [known limitation in Claude Desktop](https://github.com/modelcontextprotocol/typescript-sdk/issues/686), resources cannot be accessed directly by users, even though they appear as "connected" in settings. However, this server implements internal resource integration where tools automatically use resources for caching benefits. All functionality is available through equivalent tools. See the [Troubleshooting Guide](../TROUBLESHOOTING.md#claude-desktop-mcp-resource-limitation) for complete details.

### Key Benefits

- **Persistent Context**: Resources help AI assistants maintain awareness of your vault structure
- **Performance**: Built-in caching reduces API calls and improves response times
- **Standardized Access**: Uses the `vault://` URI scheme for consistent access patterns
- **Read-Only Safety**: Resources cannot modify your vault, ensuring data integrity

### Resources vs Tools

| Aspect | Resources | Tools |
|--------|-----------|-------|
| **Purpose** | Read data, maintain context | Perform actions, modify content |
| **Operations** | Read-only | Read/Write |
| **Caching** | Built-in with TTL | Per-tool implementation |
| **Protocol** | `resources/list`, `resources/read` | `tools/list`, `tools/call` |
| **Use Case** | Reference data, browsing | Creating, editing, searching |

### Resource Metadata (v2.3.0)

All MCP resources now include optional metadata in the `_meta` field, providing file size and modification timestamps for better cache optimization.

**Metadata Structure:**
```typescript
{
  "uri": "vault://note/meeting-notes.md",
  "name": "Meeting Notes",
  "mimeType": "text/plain",
  "text": "# Meeting Notes\n...",
  "_meta": {
    "size": 2048,                              // File size in bytes
    "sizeFormatted": "2.00 KB",                // Human-readable size
    "lastModified": "2025-10-07T14:30:00.000Z" // ISO 8601 timestamp (UTC)
  }
}
```

**Benefits:**
- **Cache Validation**: Use `lastModified` to determine if cached resources are stale
- **Resource Filtering**: Filter by size before fetching full content
- **Performance Monitoring**: Track resource sizes to optimize batch operations
- **User Feedback**: Display file sizes and modification dates in UIs

**Graceful Degradation:**
The `_meta` field is optional. If metadata cannot be fetched (e.g., API errors), resources still work without metadata, ensuring reliability and backward compatibility.

## Available Resources

### Static Resources

These resources provide vault-wide information with longer cache times (5 minutes):

#### 1. **Vault Tags** - `vault://tags`
Returns all unique tags in your vault with usage counts.

**Response format:**
```json
{
  "tags": [
    { "tag": "project", "count": 15 },
    { "tag": "meeting", "count": 8 },
    { "tag": "todo", "count": 23 }
  ]
}
```

#### 2. **Vault Statistics** - `vault://stats`
Provides file and note counts for your vault.

**Response format:**
```json
{
  "totalNotes": 156,
  "totalMarkdownFiles": 145,
  "totalFiles": 203,
  "totalFolders": 28
}
```

#### 3. **Recent Changes** - `vault://recent`
Lists recently modified notes with time-based pagination (cached for 30 seconds).

**Parameters:**
- `mode`: Response mode (`preview` or `full`). Default: `preview`
- `limit`: Number of items per page (1-1000). Default: `20`
- `offset`: Number of items to skip for pagination. Default: `0`

**Examples:**
- `vault://recent` - First 20 recent notes with preview
- `vault://recent?mode=full` - First 20 recent notes with full content
- `vault://recent?limit=10&offset=0` - First 10 recent notes
- `vault://recent?limit=10&offset=10` - Next 10 recent notes

**Response format (preview mode):**
```json
{
  "notes": [
    {
      "path": "Daily/2024-01-15.md",
      "title": "2024-01-15",
      "modifiedAt": "2024-01-15T10:30:00.000Z",
      "preview": "Today I worked on the MCP server pagination feature..."
    }
  ],
  "mode": "preview",
  "pagination": {
    "totalNotes": 25,
    "hasMore": true,
    "limit": 20,
    "offset": 0,
    "nextOffset": 20,
    "continuationToken": "1704096000000"
  }
}
```

**Response format (full mode):**
```json
{
  "notes": [
    {
      "path": "Daily/2024-01-15.md", 
      "title": "2024-01-15",
      "modifiedAt": "2024-01-15T10:30:00.000Z",
      "content": "# Daily Note\n\nToday I worked on..."
    }
  ],
  "mode": "full"  
}
```

**Pagination Notes:**
- Default limit is 20 items per page, optimized for recent items
- Chronological ordering maintained (most recent first)
- Continuation tokens enable time-based pagination for large datasets
- Pagination info only included when multiple pages are available

#### 4. **Vault Structure** - `vault://structure`
Returns the complete hierarchical structure of your vault.

**Response format:**
```json
{
  "root": {
    "name": "/",
    "type": "folder",
    "children": [
      {
        "name": "Projects",
        "type": "folder",
        "children": [...]
      },
      {
        "name": "README.md",
        "type": "file",
        "size": 1024
      }
    ]
  }
}
```

### Dynamic Resources

These resources accept parameters and have shorter cache times (1-2 minutes):

#### 5. **Individual Notes** - `vault://note/{path}`
Retrieves the content of a specific note or binary file.

**Parameters:**
- `path`: The file path relative to vault root (include file extension)

**Examples:**
- `vault://note/README.md` - Markdown note
- `vault://note/Daily/2024-01-15.md` - Daily note
- `vault://note/attachments/diagram.png` - Image file
- `vault://note/documents/report.pdf` - PDF document

**Response Format:**

**Text files (.md, .txt):**
```typescript
{
  "uri": "vault://note/README.md",
  "name": "README",
  "mimeType": "text/plain",
  "text": "# README\n\nMarkdown content...",
  "_meta": {
    "size": 1024,
    "sizeFormatted": "1.00 KB",
    "lastModified": "2025-10-07T14:30:00.000Z"
  }
}
```

**Binary files (images, PDFs, audio, video):**
```typescript
{
  "uri": "vault://note/attachments/diagram.png",
  "name": "diagram.png",
  "mimeType": "image/png",
  "blob": "iVBORw0KGgoAAAANSUhEUgAA...", // base64-encoded data
  "_meta": {
    "size": 45678,
    "sizeFormatted": "44.61 KB",
    "lastModified": "2025-10-07T14:30:00.000Z"
  }
}
```

**Supported Binary Formats:**
- **Images**: PNG, JPG, JPEG, GIF, SVG, WebP, BMP, ICO
- **Documents**: PDF
- **Audio**: MP3, WAV, OGG, AAC, FLAC, M4A
- **Video**: MP4, WebM, MOV, AVI, MKV

**Size Limits:**
Binary files are limited to 10 MB for safety and performance. Files exceeding this limit will return an error suggesting alternative access methods.

#### 6. **Folder Contents** - `vault://folder/{path}`
Lists all files and subfolders within a specific directory.

**Parameters:**
- `path`: The folder path relative to vault root

**Examples:**
- `vault://folder/Projects`
- `vault://folder/Daily`
- `vault://folder/Archive/2023`

**Response format:**
```json
{
  "folders": ["subfolder1", "subfolder2"],
  "files": [
    {
      "name": "note1.md",
      "path": "Projects/note1.md",
      "modified": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### 7. **Daily Notes** - `vault://daily/{date}`
Accesses daily notes by date.

**Parameters:**
- `date`: ISO date (YYYY-MM-DD) or special keywords

**Examples:**
- `vault://daily/2024-01-15`
- `vault://daily/today`
- `vault://daily/yesterday`

**Response:** Raw markdown content of the daily note

**Note:** Currently returns today's note regardless of date parameter due to Obsidian API limitations.

#### 8. **Notes by Tag** - `vault://tag/{tagname}`
Finds all notes containing a specific tag.

**Parameters:**
- `tagname`: The tag name (with or without # prefix)

**Examples:**
- `vault://tag/project`
- `vault://tag/meeting`
- `vault://tag/important`

**Response format:**
```json
{
  "tag": "project",
  "files": [
    {
      "path": "Projects/web-app.md",
      "title": "Web App Project"
    },
    {
      "path": "Projects/mobile-app.md",
      "title": "Mobile App Project"
    }
  ]
}
```

#### 9. **Search Results** - `vault://search/{query}`
Searches vault content and returns results with context.

**Parameters:**
- `query`: Search terms (URL encoded if containing spaces)

**Examples:**
- `vault://search/meeting%20notes`
- `vault://search/TODO`
- `vault://search/project%20deadline`

**Response format:**
```json
{
  "query": "meeting notes",
  "results": [
    {
      "path": "Meetings/2024-01-15.md",
      "title": "Team Standup",
      "context": "...discussed the meeting notes for the upcoming sprint...",
      "score": 0.95
    }
  ]
}
```

## URI Format and Parameters

### Static Resources
Static resources use simple URIs without parameters:
```
vault://tags
vault://stats
vault://recent
vault://structure
```

### Dynamic Resources
Dynamic resources use URI templates with parameters:
```
vault://note/{path}
vault://folder/{path}
vault://daily/{date}
vault://tag/{tagname}
vault://search/{query}
```

### Parameter Encoding

- **Paths**: Use forward slashes for directories, include file extensions
  - ✅ `vault://note/Projects/README.md`
  - ❌ `vault://note/Projects/README`

- **Spaces**: URL encode spaces as `%20`
  - ✅ `vault://search/meeting%20notes`
  - ❌ `vault://search/meeting notes`

- **Special Characters**: URL encode when needed
  - ✅ `vault://tag/high-priority`
  - ✅ `vault://search/question%3F`

## Working with Binary Files

### Binary File Types

The server automatically detects and handles binary files based on file extension. Binary files are returned as base64-encoded blobs through the same `vault://note/{path}` URI pattern used for text files.

**Supported Binary Formats:**

| Category | Extensions | MIME Types |
|----------|-----------|------------|
| **Images** | .png, .jpg, .jpeg, .gif, .svg, .webp, .bmp, .ico | image/png, image/jpeg, etc. |
| **Documents** | .pdf | application/pdf |
| **Audio** | .mp3, .wav, .ogg, .aac, .flac, .m4a | audio/mpeg, audio/wav, etc. |
| **Video** | .mp4, .webm, .mov, .avi, .mkv | video/mp4, video/webm, etc. |

### Response Format Differences

**Text files** return `TextResourceContents`:
```typescript
{
  uri: string,
  name: string,
  mimeType: "text/plain",
  text: string,           // Raw text content
  _meta?: { ... }
}
```

**Binary files** return `BlobResourceContents`:
```typescript
{
  uri: string,
  name: string,
  mimeType: string,       // Format-specific (e.g., "image/png")
  blob: string,           // Base64-encoded binary data
  _meta?: { ... }
}
```

### Binary File Limitations

- **Size Limit**: 10 MB maximum
- **Error Handling**: Files exceeding 10 MB return an error with suggestions to use tools instead
- **Memory Safety**: Base64 encoding increases data size by ~33%, factored into memory calculations
- **Performance**: Large binary files may impact response time; consider using tools for batch operations

### Use Cases for Binary Resources

**Display embedded images:**
```typescript
// Retrieve image from vault
const image = await client.readResource('vault://note/assets/screenshot.png');
// Decode base64 for display
const imageData = atob(image.blob);
```

**Process PDF attachments:**
```typescript
// Access PDF document
const pdf = await client.readResource('vault://note/reports/quarterly-report.pdf');
// Forward base64 data to PDF processing service
processPDF(pdf.blob, pdf._meta.size);
```

**Extract media metadata:**
```typescript
// Check file size before downloading
const video = await client.readResource('vault://note/recordings/meeting.mp4');
if (video._meta.size < 5000000) { // Less than 5MB
  // Process smaller video
  processVideo(video.blob);
}
```

## Usage Examples

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "npx",
      "args": ["obsidian-mcp-ts"],
      "env": {
        "OBSIDIAN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Programmatic Access

#### List Available Resources
```typescript
const resources = await client.listResources();
// Returns array of available resources with metadata
```

#### Read Specific Resources
```typescript
// Get all tags
const tags = await client.readResource('vault://tags');

// Read a specific note
const note = await client.readResource('vault://note/Daily/2024-01-15.md');

// Search for content
const results = await client.readResource('vault://search/project%20status');
```

### Real-World Workflows

#### 1. Browse and Read Workflow
```typescript
// First, check vault structure
const structure = await client.readResource('vault://structure');

// Browse a specific folder
const projects = await client.readResource('vault://folder/Projects');

// Read a specific project note
const projectNote = await client.readResource('vault://note/Projects/web-app.md');
```

#### 2. Tag-Based Workflow
```typescript
// Get all available tags
const allTags = await client.readResource('vault://tags');

// Find notes with specific tag
const projectNotes = await client.readResource('vault://tag/project');

// Read each project note
for (const file of projectNotes.files) {
  const content = await client.readResource(`vault://note/${file.path}`);
}
```

#### 3. Daily Review Workflow
```typescript
// Get recent changes with preview (default)
const recent = await client.readResource('vault://recent');

// Get recent changes with pagination
const recentPage = await client.readResource('vault://recent?limit=10&offset=0');

// Get full content for deeper review
const recentFull = await client.readResource('vault://recent?mode=full&limit=5');

// Read today's daily note
const today = await client.readResource('vault://daily/today');

// Check vault statistics
const stats = await client.readResource('vault://stats');
```

#### 4. Paginated Recent Changes Workflow
```typescript
// Function to process all recent changes with pagination
async function processAllRecentChanges() {
  let offset = 0;
  const limit = 20;
  let hasMore = true;
  
  while (hasMore) {
    const response = await client.readResource(`vault://recent?limit=${limit}&offset=${offset}`);
    const data = JSON.parse(response.contents[0].text);
    
    // Process this page of notes
    for (const note of data.notes) {
      console.log(`Processing: ${note.title} (${note.modifiedAt})`);
      console.log(`Preview: ${note.preview}`);
    }
    
    // Check if there are more pages
    hasMore = data.pagination?.hasMore || false;
    offset += limit;
  }
}

// Use continuation tokens for time-based pagination
async function getRecentChangesAfter(timestamp: string) {
  const response = await client.readResource(`vault://recent?limit=50`);
  const data = JSON.parse(response.contents[0].text);
  
  // Filter notes newer than the timestamp
  const newerNotes = data.notes.filter(note => 
    new Date(note.modifiedAt).getTime() > parseInt(timestamp)
  );
  
  return newerNotes;
}
```

## Common Use Cases

### 1. Vault Overview
Use resources to get a high-level view of your vault:
- `vault://stats` - How many notes and files
- `vault://structure` - Organization and hierarchy
- `vault://tags` - Topic distribution

### 2. Content Discovery
Find and access specific content:
- `vault://search/{query}` - Full-text search
- `vault://tag/{tagname}` - Tag-based filtering
- `vault://recent` - Latest changes

### 3. Navigation
Browse vault contents:
- `vault://folder/{path}` - Directory listings
- `vault://structure` - Full hierarchy
- `vault://note/{path}` - Direct access

### 4. Daily Workflow
Support daily note workflows:
- `vault://daily/today` - Current daily note
- `vault://daily/yesterday` - Previous daily note
- `vault://daily/2024-01-15` - Specific date

### 5. Context Building
Help AI assistants understand your vault:
- Load vault structure on startup
- Refresh recent changes periodically
- Cache frequently accessed notes

## Integration Guide

### Setting Up with Claude Desktop

1. **Install the MCP server:**
   ```bash
   npm install -g obsidian-mcp-ts
   ```

2. **Configure Obsidian:**
   - Install Local REST API plugin
   - Enable the plugin
   - Copy the API key from settings

3. **Configure Claude Desktop:**
   - Add server configuration (see examples above)
   - Restart Claude Desktop

4. **Verify setup:**
   - Ask Claude to "list available Obsidian resources"
   - Try reading a simple resource like `vault://stats`

### Using Resources in Conversations

Example prompts for Claude:
- "Show me the structure of my Obsidian vault"
- "What tags am I using in my vault?"
- "Read my daily note for today"
- "Find all notes tagged with #project"
- "Search for notes mentioning 'API design'"

### Combining Resources with Tools

Resources work best when combined with tools:

1. **Discovery + Action:**
   ```
   Resource: vault://tags (see available tags)
   Tool: obsidian_get_files_by_tag (get specific files)
   Resource: vault://note/{path} (read the files)
   ```

2. **Browse + Edit:**
   ```
   Resource: vault://folder/Projects (browse folder)
   Resource: vault://note/Projects/todo.md (read file)
   Tool: obsidian_edit (make changes)
   ```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
**Error:** "Authentication failed - check API key"

**Solutions:**
- Verify API key in Obsidian Local REST API settings
- Check environment variable: `OBSIDIAN_API_KEY`
- Ensure REST API plugin is running

#### 2. Path Not Found
**Error:** "File not found: path/to/note"

**Solutions:**
- Include .md extension for notes
- Use forward slashes for paths
- Check path exists with `vault://structure`

#### 3. Encoding Issues
**Error:** "Invalid URI format"

**Solutions:**
- URL encode spaces: `meeting notes` → `meeting%20notes`
- Encode special characters properly
- Use encodeURIComponent() for dynamic values

#### 4. Empty Results
**Issue:** Resource returns empty data

**Solutions:**
- Verify Obsidian is running
- Check vault has content
- Confirm REST API is accessible

### Cache Behavior

Resources use intelligent caching:

| Resource | Cache Duration | Invalidation |
|----------|---------------|--------------|
| Static (tags, stats) | 5 minutes | On write operations |
| Dynamic (notes, folders) | 2 minutes | On specific file changes |
| Recent changes | 30 seconds | Always fresh |
| Search results | 1 minute | Per unique query |

## Best Practices

### 1. Resource Selection

**Use Resources when:**
- Reading reference data
- Browsing vault structure
- Maintaining context
- Frequent read operations

**Use Tools when:**
- Creating or modifying content
- Performing complex searches
- One-time operations
- Need latest data

### 2. Performance Optimization

- **Batch related reads:** Get folder contents before individual files
- **Use structure wisely:** Cache vault structure for navigation
- **Respect cache times:** Don't repeatedly request same resource
- **URL encode properly:** Avoid parsing errors

### 3. Error Handling

```typescript
try {
  const content = await client.readResource('vault://note/missing.md');
} catch (error) {
  if (error.code === 'RESOURCE_NOT_FOUND') {
    // Handle missing file
  } else if (error.code === 'INVALID_PARAMS') {
    // Handle invalid parameters
  }
}
```

### 4. Integration Patterns

#### Context Preloading
```typescript
// Load essential context on start
const context = await Promise.all([
  client.readResource('vault://structure'),
  client.readResource('vault://tags'),
  client.readResource('vault://recent')
]);
```

#### Progressive Enhancement
```typescript
// Start with overview
const stats = await client.readResource('vault://stats');

// Drill down as needed
if (stats.totalNotes > 100) {
  const structure = await client.readResource('vault://structure');
  // Use structure to navigate efficiently
}
```

## Summary

MCP Resources provide a powerful, standardized way to access Obsidian vault data. By understanding the available resources, their caching behavior, and best practices, you can build efficient integrations that help AI assistants work effectively with your knowledge base.

Remember: Resources are for reading and context, tools are for actions and modifications. Use them together for the best experience.