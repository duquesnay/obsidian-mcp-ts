# Streaming Operations for Memory Efficiency

This document describes the streaming capabilities available in obsidian-mcp-ts for handling large datasets efficiently.

## Overview

When working with hundreds or thousands of files, traditional batch operations that load all results into memory can cause performance issues. Streaming operations process results as they complete, allowing for:

- **Lower memory usage**: Process results one at a time instead of loading all into memory
- **Faster initial results**: Start processing as soon as the first result is ready
- **Better progress tracking**: Monitor operations as they happen
- **Graceful error handling**: Handle failures without affecting other operations

## Streaming Methods

### File Operations

#### `streamBatchFileContents()`

Stream file contents for multiple files without loading all into memory:

```typescript
const client = new FileOperationsClient(config);

// Stream contents of many files
for await (const result of client.streamBatchFileContents(filepaths)) {
  if (result.error) {
    console.error(`Failed to read ${result.filepath}: ${result.error}`);
  } else {
    // Process content immediately
    await processContent(result.filepath, result.content);
  }
}
```

#### `streamBatchCreateFiles()`

Create multiple files with streaming progress:

```typescript
const operations = [
  { filepath: 'note1.md', content: 'Content 1' },
  { filepath: 'note2.md', content: 'Content 2' },
  // ... hundreds more
];

for await (const result of client.streamBatchCreateFiles(operations)) {
  if (result.success) {
    console.log(`✓ Created ${result.filepath}`);
  } else {
    console.error(`✗ Failed ${result.filepath}: ${result.error}`);
  }
}
```

#### `streamBatchDeleteFiles()`

Delete multiple files with streaming results:

```typescript
for await (const result of client.streamBatchDeleteFiles(filepaths)) {
  if (result.success) {
    console.log(`✓ Deleted ${result.filepath}`);
  } else {
    console.error(`✗ Failed to delete ${result.filepath}: ${result.error}`);
  }
}
```

### Directory Operations

#### `copyDirectoryStream()`

Copy large directories with streaming support:

```typescript
const client = new DirectoryOperationsClient(config);

const result = await client.copyDirectoryStream(sourcePath, destPath, {
  overwrite: false,
  useStreaming: true, // Auto-enabled for >100 files
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total} files`);
  }
});
```

## Tool Support

### BatchGetFileContentsStreamTool

The `obsidian_batch_get_file_contents_stream` tool automatically uses streaming for large file sets:

```json
{
  "tool": "obsidian_batch_get_file_contents_stream",
  "arguments": {
    "filepaths": ["file1.md", "file2.md", "..."],
    "streamMode": true,
    "maxFilesPerResponse": 50
  }
}
```

### CopyDirectoryTool

The `obsidian_copy_directory` tool supports streaming for large directories:

```json
{
  "tool": "obsidian_copy_directory",
  "arguments": {
    "sourcePath": "large-folder",
    "destinationPath": "backup/large-folder",
    "useStreaming": true
  }
}
```

### FindEmptyDirectoriesTool

Automatically uses streaming when checking >500 directories for better performance.

## Using OptimizedBatchProcessor Directly

For custom streaming operations, use the `OptimizedBatchProcessor`:

```typescript
import { OptimizedBatchProcessor } from '../utils/OptimizedBatchProcessor.js';

const processor = new OptimizedBatchProcessor({
  maxConcurrency: 10,
  retryAttempts: 3,
  retryDelay: 1000,
  onProgress: (completed, total) => {
    console.log(`${completed}/${total} processed`);
  }
});

// Stream results as they complete
for await (const result of processor.processStream(items, async (item) => {
  // Your async operation here
  return await processItem(item);
})) {
  if (result.error) {
    console.error(`Failed after ${result.attempts} attempts:`, result.error);
  } else {
    // Process successful result immediately
    console.log(`Processed:`, result.result);
  }
}
```

## When to Use Streaming

Use streaming mode when:

- Processing **>100 files** at once
- Working with **large directories** (many files)
- Memory usage is a concern
- You want to see results as they happen
- You need detailed progress tracking

Streaming is automatically enabled for:
- Directory operations with >100 files
- Batch operations when explicitly requested
- Find operations on large directory sets

## Performance Considerations

1. **Concurrency**: Streaming operations respect concurrency limits (default: 10-20 concurrent operations)
2. **Retries**: Failed operations are automatically retried with exponential backoff
3. **Order**: Streaming doesn't guarantee order - results arrive as they complete
4. **Memory**: Each result is processed and released, keeping memory usage constant

## Example: Processing a Large Vault

```typescript
// Find all markdown files
const allFiles = await client.listFilesInVault();
const mdFiles = allFiles.filter(f => f.endsWith('.md'));

console.log(`Processing ${mdFiles.length} markdown files...`);

// Process in streaming mode
let processed = 0;
let totalSize = 0;

for await (const result of client.streamBatchFileContents(mdFiles)) {
  if (!result.error && result.content) {
    processed++;
    totalSize += result.content.length;
    
    // Process each file as it arrives
    if (result.content.includes('TODO')) {
      console.log(`Found TODO in ${result.filepath}`);
    }
    
    // Show progress every 100 files
    if (processed % 100 === 0) {
      console.log(`Progress: ${processed}/${mdFiles.length} files, ${totalSize} bytes`);
    }
  }
}

console.log(`Completed: ${processed} files, ${totalSize} total bytes`);
```

This approach uses constant memory regardless of vault size, making it suitable for vaults with thousands of files.