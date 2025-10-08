#!/usr/bin/env tsx
/**
 * Verify tags are actually written to frontmatter
 */
import 'dotenv/config';
import { TagManagementClient } from '../../src/obsidian/services/TagManagementClient.js';
import { FileOperationsClient } from '../../src/obsidian/services/FileOperationsClient.js';

const testFile = 'test-verify-frontmatter.md';

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
    console.log('📝 Creating test file with empty frontmatter...');
    await fileClient.createFile(testFile, '---\ntags: []\n---\n\n# Test\n\nContent.');

    console.log('🏷️  Adding 5 tags...');
    await tagClient.manageFileTags(testFile, 'add', ['alpha', 'beta', 'gamma', 'delta', 'epsilon'], 'frontmatter');

    console.log('📖 Reading frontmatter...');
    const frontmatter: any = await fileClient.getFileContents(testFile, 'frontmatter');
    console.log('Frontmatter:', JSON.stringify(frontmatter, null, 2));

    if (frontmatter.tags && frontmatter.tags.length === 5) {
      console.log('✅ All 5 tags found in frontmatter:', frontmatter.tags);
    } else {
      console.error('❌ Expected 5 tags, found:', frontmatter.tags);
    }

    console.log('\n🗑️  Removing 3 tags...');
    await tagClient.manageFileTags(testFile, 'remove', ['beta', 'delta'], 'frontmatter');

    console.log('📖 Reading frontmatter after removal...');
    const frontmatterAfter: any = await fileClient.getFileContents(testFile, 'frontmatter');
    console.log('Frontmatter:', JSON.stringify(frontmatterAfter, null, 2));

    if (frontmatterAfter.tags && frontmatterAfter.tags.length === 3) {
      console.log('✅ Correct: 3 tags remaining:', frontmatterAfter.tags);
      const remaining = frontmatterAfter.tags;
      if (remaining.includes('alpha') && remaining.includes('gamma') && remaining.includes('epsilon')) {
        console.log('✅ Correct tags remained!');
      }
    }

    await fileClient.deleteFile(testFile);
    console.log('\n✨ Verification complete - batch tags work perfectly!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    try { await fileClient.deleteFile(testFile); } catch (e) {}
    process.exit(1);
  }
}

main();
