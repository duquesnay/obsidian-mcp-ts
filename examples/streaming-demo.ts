/**
 * Demo script showing streaming mode usage for memory-efficient batch operations
 */

import { FileOperationsClient } from '../src/obsidian/services/FileOperationsClient.js';
import { DirectoryOperationsClient } from '../src/obsidian/services/DirectoryOperationsClient.js';
import { OptimizedBatchProcessor } from '../src/utils/OptimizedBatchProcessor.js';

// Example 1: Streaming file contents for large batches
async function streamingFileReadExample() {
  const client = new FileOperationsClient({
    apiKey: process.env.OBSIDIAN_API_KEY || '',
    host: '127.0.0.1',
    port: 27124,
    verifySsl: false
  });

  const files = [
    'notes/day1.md',
    'notes/day2.md',
    'notes/day3.md',
    // ... imagine hundreds more files
  ];

  console.log('=== Streaming File Read Example ===');
  console.log(`Processing ${files.length} files...`);

  let processedCount = 0;
  
  // Stream file contents as they complete
  for await (const result of client.streamBatchFileContents(files)) {
    processedCount++;
    
    if (result.error) {
      console.error(`✗ Failed to read ${result.filepath}: ${result.error}`);
    } else {
      console.log(`✓ Read ${result.filepath} (${result.content?.length || 0} chars)`);
      // Process content immediately without waiting for all files
      // This is memory efficient for large file sets
    }
    
    // Show progress every 10 files
    if (processedCount % 10 === 0) {
      console.log(`Progress: ${processedCount}/${files.length} files processed`);
    }
  }
  
  console.log(`\nCompleted processing ${processedCount} files`);
}

// Example 2: Streaming directory copy for large directories
async function streamingDirectoryCopyExample() {
  const client = new DirectoryOperationsClient({
    apiKey: process.env.OBSIDIAN_API_KEY || '',
    host: '127.0.0.1',
    port: 27124,
    verifySsl: false
  });

  const sourcePath = 'projects/large-project';
  const destinationPath = 'archive/large-project-backup';

  console.log('\n=== Streaming Directory Copy Example ===');
  console.log(`Copying ${sourcePath} to ${destinationPath}...`);

  const result = await client.copyDirectoryStream(sourcePath, destinationPath, {
    overwrite: false,
    useStreaming: true, // Force streaming mode
    onProgress: (completed, total) => {
      const percentage = Math.round((completed / total) * 100);
      console.log(`Copy progress: ${completed}/${total} files (${percentage}%)`);
    }
  });

  console.log(`\nCopy completed:`);
  console.log(`- Files copied: ${result.filesCopied}`);
  console.log(`- Failed files: ${result.failedFiles.length}`);
  console.log(`- Streaming used: ${result.streamingUsed}`);
  
  if (result.failedFiles.length > 0) {
    console.log('\nFailed files:');
    result.failedFiles.forEach(file => console.log(`  - ${file}`));
  }
}

// Example 3: Using OptimizedBatchProcessor directly for custom operations
async function customStreamingOperationExample() {
  console.log('\n=== Custom Streaming Operation Example ===');
  
  const processor = new OptimizedBatchProcessor({
    maxConcurrency: 5,
    retryAttempts: 3,
    retryDelay: 1000
  });

  // Simulated list of operations
  const operations = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    action: 'process',
    data: `item-${i}`
  }));

  console.log(`Processing ${operations.length} custom operations...`);
  
  let successCount = 0;
  let errorCount = 0;

  // Process operations as they complete (streaming)
  for await (const result of processor.processStream(operations, async (op) => {
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error(`Failed to process ${op.data}`);
    }
    
    return `Processed ${op.data}`;
  })) {
    if (result.error) {
      errorCount++;
      console.log(`✗ Failed ${result.item.data} after ${result.attempts} attempts`);
    } else {
      successCount++;
      // Process results immediately as they arrive
      if (successCount % 20 === 0) {
        console.log(`Progress: ${successCount} successful, ${errorCount} failed`);
      }
    }
  }

  console.log(`\nFinal results:`);
  console.log(`- Successful: ${successCount}`);
  console.log(`- Failed: ${errorCount}`);
  console.log(`- Total: ${operations.length}`);
}

// Run examples
async function main() {
  try {
    // Uncomment the examples you want to run:
    
    // await streamingFileReadExample();
    // await streamingDirectoryCopyExample();
    await customStreamingOperationExample();
    
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}