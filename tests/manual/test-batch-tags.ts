#!/usr/bin/env tsx
/**
 * Manual test for batch tag operations with real API
 */
import 'dotenv/config';
import { TagManagementClient } from '../../src/obsidian/services/TagManagementClient.js';
import { FileOperationsClient } from '../../src/obsidian/services/FileOperationsClient.js';

const testFile = 'test-batch-tags-manual.md';

async function main() {
  if (!process.env.OBSIDIAN_API_KEY) {
    console.error('❌ OBSIDIAN_API_KEY not set');
    process.exit(1);
  }

  const config = {
    apiKey: process.env.OBSIDIAN_API_KEY,
    host: '127.0.0.1',
    port: 27124,
    protocol: 'https' as const,
    verifySsl: false
  };

  const tagClient = new TagManagementClient(config);
  const fileClient = new FileOperationsClient(config);

  try {
    console.log('📝 Creating test file...');
    await fileClient.createFile(testFile, '---\ntags: []\n---\n\n# Test File\n\nContent for batch tag testing.');
    console.log('✅ File created\n');

    console.log('🏷️  Adding 3 tags in batch...');
    const addResult = await tagClient.manageFileTags(
      testFile,
      'add',
      ['test-batch-1', 'test-batch-2', 'test-batch-3'],
      'frontmatter'
    );
    console.log('✅ Add result:', JSON.stringify(addResult, null, 2));
    console.log('');

    console.log('📄 Reading file to verify tags...');
    const content = await fileClient.getFileContents(testFile);
    console.log('File content:\n', content);
    console.log('');

    console.log('🗑️  Removing 2 tags in batch...');
    const removeResult = await tagClient.manageFileTags(
      testFile,
      'remove',
      ['test-batch-1', 'test-batch-2'],
      'frontmatter'
    );
    console.log('✅ Remove result:', JSON.stringify(removeResult, null, 2));
    console.log('');

    console.log('📄 Reading file after removal...');
    const contentAfter = await fileClient.getFileContents(testFile);
    console.log('File content:\n', contentAfter);
    console.log('');

    console.log('🧹 Cleaning up...');
    await fileClient.deleteFile(testFile);
    console.log('✅ Test file deleted\n');

    console.log('✨ All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', error.response.data);
    }

    // Cleanup on error
    try {
      await fileClient.deleteFile(testFile);
      console.log('🧹 Cleaned up test file');
    } catch (e) {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

main();
