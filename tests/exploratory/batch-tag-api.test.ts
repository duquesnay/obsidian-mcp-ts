/**
 * Exploratory test to verify if Obsidian API supports batch tag operations
 * This test checks various approaches to sending multiple tags in a single request
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'dotenv/config';
import axios, { AxiosInstance } from 'axios';
import https from 'https';

describe('Obsidian API - Batch Tag Capabilities (Exploratory)', () => {
  let axiosInstance: AxiosInstance;
  const testFilePath = 'test-batch-tags-exploratory.md';

  beforeAll(async () => {
    if (!process.env.OBSIDIAN_API_KEY) {
      throw new Error('OBSIDIAN_API_KEY required for exploratory tests');
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

    // Create test file
    await axiosInstance.put(`/vault/${encodeURIComponent(testFilePath)}`, '# Test File\n\nContent');
  });

  afterAll(async () => {
    // Clean up
    try {
      await axiosInstance.delete(`/vault/${encodeURIComponent(testFilePath)}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('Approach 1: Array in body with Target-Type=tag', async () => {
    try {
      const response = await axiosInstance.patch(
        `/vault/${encodeURIComponent(testFilePath)}`,
        ['batch-tag-1', 'batch-tag-2', 'batch-tag-3'],
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Operation': 'add',
            'Tag-Location': 'frontmatter'
          }
        }
      );
      console.log('✅ Approach 1 succeeded:', response.data);
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log('❌ Approach 1 failed:', error.response?.status, error.response?.data);
      expect(error.response?.status).toBeDefined();
    }
  });

  it('Approach 2: Comma-separated string in Target header', async () => {
    try {
      const response = await axiosInstance.patch(
        `/vault/${encodeURIComponent(testFilePath)}`,
        '',
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Target': 'batch-tag-a,batch-tag-b,batch-tag-c',
            'Operation': 'add',
            'Tag-Location': 'frontmatter'
          }
        }
      );
      console.log('✅ Approach 2 succeeded:', response.data);
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log('❌ Approach 2 failed:', error.response?.status, error.response?.data);
      expect(error.response?.status).toBeDefined();
    }
  });

  it('Approach 3: Array in body WITH Target header', async () => {
    try {
      const response = await axiosInstance.patch(
        `/vault/${encodeURIComponent(testFilePath)}`,
        ['batch-tag-x', 'batch-tag-y'],
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Target': 'batch-tag-x', // First tag
            'Operation': 'add',
            'Tag-Location': 'frontmatter'
          }
        }
      );
      console.log('✅ Approach 3 succeeded:', response.data);
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log('❌ Approach 3 failed:', error.response?.status, error.response?.data);
      expect(error.response?.status).toBeDefined();
    }
  });

  it('Approach 4: Object with tags array in body', async () => {
    try {
      const response = await axiosInstance.patch(
        `/vault/${encodeURIComponent(testFilePath)}`,
        { tags: ['batch-tag-i', 'batch-tag-j'] },
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Operation': 'add',
            'Tag-Location': 'frontmatter'
          }
        }
      );
      console.log('✅ Approach 4 succeeded:', response.data);
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log('❌ Approach 4 failed:', error.response?.status, error.response?.data);
      expect(error.response?.status).toBeDefined();
    }
  });

  it('Current working approach: Single tag in Target header', async () => {
    const response = await axiosInstance.patch(
      `/vault/${encodeURIComponent(testFilePath)}`,
      '',
      {
        headers: {
          'Content-Type': 'application/json',
          'Target-Type': 'tag',
          'Target': 'known-working-tag',
          'Operation': 'add',
          'Tag-Location': 'frontmatter'
        }
      }
    );
    console.log('✅ Working approach succeeded:', response.data);
    expect(response.status).toBe(200);
  });
});
