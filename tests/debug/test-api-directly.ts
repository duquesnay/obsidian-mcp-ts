#!/usr/bin/env tsx
/**
 * Test API directly to isolate the problem
 */
import 'dotenv/config';
import axios from 'axios';
import https from 'https';

const testFile = 'test-api-direct.md';

async function main() {
  const api = axios.create({
    baseURL: 'https://127.0.0.1:27124',
    headers: { 'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}` },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
  });

  try {
    console.log('📝 Creating file with YAML array tags...');
    const initialContent = `---
tags:
  - original-tag-1
  - original-tag-2
---

# Test`;

    await api.put(`/vault/${encodeURIComponent(testFile)}`, initialContent);

    console.log('\n📖 Getting frontmatter format...');
    const fmResponse = await api.get(`/vault/${encodeURIComponent(testFile)}`, {
      headers: { 'Accept': 'application/vnd.olrapi.frontmatter+json' }
    });
    console.log('Frontmatter response:', JSON.stringify(fmResponse.data, null, 2));

    console.log('\n🏷️  Adding tags with batch API...');
    const patchResponse = await api.patch(
      `/vault/${encodeURIComponent(testFile)}`,
      { tags: ['new-tag-1', 'new-tag-2'] },
      {
        headers: {
          'Content-Type': 'application/json',
          'Target-Type': 'tag',
          'Operation': 'add',
          'Location': 'frontmatter'
        }
      }
    );
    console.log('PATCH response:', JSON.stringify(patchResponse.data, null, 2));

    console.log('\n📖 Reading frontmatter after PATCH...');
    const fmAfter = await api.get(`/vault/${encodeURIComponent(testFile)}`, {
      headers: { 'Accept': 'application/vnd.olrapi.frontmatter+json' }
    });
    console.log('Frontmatter after:', JSON.stringify(fmAfter.data, null, 2));

    console.log('\n📄 Reading full file...');
    const fullContent = await api.get(`/vault/${encodeURIComponent(testFile)}`);
    console.log('Full file:\n', fullContent.data);

    await api.delete(`/vault/${encodeURIComponent(testFile)}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

main();
