/**
 * Comprehensive test to verify if multi-tag support has been added to the API
 * Testing all possible approaches for adding multiple tags in a single request
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'dotenv/config';
import axios, { AxiosInstance } from 'axios';
import https from 'https';

describe('Multi-Tag Support Verification (Latest API)', () => {
  let axiosInstance: AxiosInstance;
  const testFilePath = 'test-multi-tag-verification.md';

  beforeAll(async () => {
    if (!process.env.OBSIDIAN_API_KEY) {
      throw new Error('OBSIDIAN_API_KEY required');
    }

    axiosInstance = axios.create({
      baseURL: `https://127.0.0.1:27124`,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    // Create test file with frontmatter
    await axiosInstance.put(
      `/vault/${encodeURIComponent(testFilePath)}`,
      '---\ntags: []\n---\n\n# Test File\n\nContent for multi-tag testing.'
    );
  });

  afterAll(async () => {
    try {
      await axiosInstance.delete(`/vault/${encodeURIComponent(testFilePath)}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('Approach 1: Array of strings in body (JSON)', async () => {
    try {
      const response = await axiosInstance.patch(
        `/vault/${encodeURIComponent(testFilePath)}`,
        ['multi-tag-a', 'multi-tag-b', 'multi-tag-c'],
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Operation': 'add'
          }
        }
      );
      console.log('✅ SUCCESS - Array in body works!');
      console.log('Response:', JSON.stringify(response.data, null, 2));

      // Verify tags were actually added
      const fileContent = await axiosInstance.get(`/vault/${encodeURIComponent(testFilePath)}`);
      console.log('File content:', fileContent.data.substring(0, 200));

      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log('❌ Array in body failed:', error.response?.status, error.response?.data);
      throw error;
    }
  });

  it('Approach 2: Array with Target pointing to tag field', async () => {
    try {
      const response = await axiosInstance.patch(
        `/vault/${encodeURIComponent(testFilePath)}`,
        ['tag-x', 'tag-y', 'tag-z'],
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'frontmatter',
            'Target': 'tags',
            'Operation': 'add'
          }
        }
      );
      console.log('✅ Frontmatter tags array works!');
      console.log('Response:', response.data);
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log('❌ Frontmatter approach failed:', error.response?.status, error.response?.data);
      throw error;
    }
  });

  it('Approach 3: Object with tags property', async () => {
    try {
      const response = await axiosInstance.patch(
        `/vault/${encodeURIComponent(testFilePath)}`,
        { tags: ['obj-tag-1', 'obj-tag-2'] },
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Operation': 'add'
          }
        }
      );
      console.log('✅ Object with tags property works!');
      console.log('Response:', response.data);
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log('❌ Object approach failed:', error.response?.status, error.response?.data);
      throw error;
    }
  });

  it('Check API version', async () => {
    const response = await axiosInstance.get('/');
    console.log('\n📋 Current API Version:', response.data.manifest?.version);
    console.log('Plugin Name:', response.data.manifest?.name);
  });

  it('Verify final file state', async () => {
    const response = await axiosInstance.get(`/vault/${encodeURIComponent(testFilePath)}`);
    console.log('\n📄 Final file content:');
    console.log(response.data);
  });
});
