#!/usr/bin/env tsx
/**
 * Reproduce false positive bug: API returns success but tags not actually added
 */
import 'dotenv/config';
import { TagManagementClient } from '../../src/obsidian/services/TagManagementClient.js';
import { FileOperationsClient } from '../../src/obsidian/services/FileOperationsClient.js';

const testFile = 'test-false-positive-bug.md';

async function main() {
  const config = {
    apiKey: process.env.OBSIDIAN_API_KEY!,
    host: '127.0.0.1',
    port: 27124,
    protocol: 'https' as const,
    verifySsl: false
  };

  const tagClient = new TagManagementClient(config);
  const fileClient = new FileOperationsClient(config);

  try {
    console.log('📝 Creating test file with YAML array format (like Allianz file)...');
    const initialContent = `---
tags:
  - type/container
  - domain/business
  - client/test
  - status/active
---

# Test File

Content here.`;

    await fileClient.createFile(testFile, initialContent);

    console.log('\n📖 Reading frontmatter BEFORE tag addition...');
    const beforeFrontmatter: any = await fileClient.getFileContents(testFile, 'frontmatter');
    console.log('BEFORE tags:', beforeFrontmatter.tags);

    console.log('\n🏷️  Adding 3 tags using batch API...');
    const result = await tagClient.manageFileTags(
      testFile,
      'add',
      ['topic/team-coaching', 'workshop/retrospective', 'method/retrospective'],
      'frontmatter'
    );

    console.log('API Response:', JSON.stringify(result, null, 2));

    console.log('\n📖 Reading frontmatter AFTER tag addition...');
    const afterFrontmatter: any = await fileClient.getFileContents(testFile, 'frontmatter');
    console.log('AFTER tags:', afterFrontmatter.tags);

    console.log('\n📄 Reading full file content...');
    const fullContent = await fileClient.getFileContents(testFile);
    console.log('Full content:\n', fullContent);

    const beforeCount = beforeFrontmatter.tags?.length || 0;
    const afterCount = afterFrontmatter.tags?.length || 0;
    const expectedCount = beforeCount + 3;

    console.log(`\n🔍 Analysis:`);
    console.log(`  Before: ${beforeCount} tags`);
    console.log(`  Expected after: ${expectedCount} tags (${beforeCount} + 3)`);
    console.log(`  Actually after: ${afterCount} tags`);

    if (afterCount === expectedCount) {
      console.log('✅ Tags were actually added!');
    } else {
      console.log('❌ BUG CONFIRMED: Tags NOT added despite success response');
      console.log('   API said:', result.tagsModified, 'tags modified');
      console.log('   Reality:', afterCount - beforeCount, 'tags added');
    }

    await fileClient.deleteFile(testFile);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
    try { await fileClient.deleteFile(testFile); } catch (e) {}
    process.exit(1);
  }
}

main();
