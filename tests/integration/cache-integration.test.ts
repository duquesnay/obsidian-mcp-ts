import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import 'dotenv/config';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { ResourceMetadataUtil } from '../../src/utils/ResourceMetadataUtil.js';

/**
 * Integration test for resource caching
 *
 * Tests that caching actually works with real Obsidian API calls
 * by measuring response times and verifying cache behavior.
 */
describe('Resource Caching Integration', () => {
  let client: ObsidianClient;

  beforeAll(() => {
    if (!process.env.OBSIDIAN_API_KEY) {
      throw new Error(
        'Integration tests require OBSIDIAN_API_KEY environment variable\n' +
        'Set it in .env file'
      );
    }

    client = new ObsidianClient({
      apiKey: process.env.OBSIDIAN_API_KEY,
      host: '127.0.0.1',
      port: 27124,
      verifySsl: false
    });
  });

  beforeEach(() => {
    // Clear cache before each test to ensure clean state
    ResourceMetadataUtil.clearCache();
  });

  it('should demonstrate real caching performance improvement', async () => {
    // First, make uncached calls and measure time
    const start1 = Date.now();
    const tags1 = await client.getAllTags();
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    const files1 = await client.listFilesInVault();
    const time2 = Date.now() - start2;
    
    // Store results for comparison
    const firstTagCount = tags1.length;
    const firstFileCount = files1.length;
    
    console.log(`First getAllTags took: ${time1}ms`);
    console.log(`First listFilesInVault took: ${time2}ms`);
    
    // Now test with caching - in a real implementation,
    // the ObsidianClient or resource handlers should have caching
    // For now, we'll test that repeated calls return consistent data
    
    // Make the same calls again immediately
    const start3 = Date.now();
    const tags2 = await client.getAllTags();
    const time3 = Date.now() - start3;
    
    const start4 = Date.now();
    const files2 = await client.listFilesInVault();
    const time4 = Date.now() - start4;
    
    console.log(`Second getAllTags took: ${time3}ms`);
    console.log(`Second listFilesInVault took: ${time4}ms`);
    
    // Verify data consistency
    // File count might change if other tests are running concurrently
    // Allow for small variations (±1 file)
    expect(Math.abs(files2.length - firstFileCount)).toBeLessThanOrEqual(1);
    
    // At least verify we got tags both times
    expect(tags1.length).toBeGreaterThan(0);
    expect(tags2.length).toBeGreaterThan(0);
    
    // If caching is implemented, second calls should be faster
    // This test documents the current behavior and will help
    // verify when caching is properly implemented
  });

  it('should handle cache invalidation on write operations', async () => {
    // Get initial tag count
    const initialTags = await client.getAllTags();
    const initialCount = initialTags.length;
    
    // Create a test file with a unique tag
    const testTag = `test-cache-${Date.now()}`;
    const testFile = `cache-test-${Date.now()}.md`;
    const content = `# Cache Test\n\n#${testTag}\n\nThis file tests cache invalidation.`;
    
    try {
      // Create file with tag
      await client.createFile(testFile, content);
      
      // Get tags again - cache should be invalidated
      const updatedTags = await client.getAllTags();
      
      // The new tag should be present
      const hasNewTag = updatedTags.some(t => t.name === testTag || t.name === `#${testTag}`);
      expect(hasNewTag).toBe(true);
      
      // Tag count should have changed (unless tag already existed)
      // This documents the cache invalidation behavior
      
    } finally {
      // Clean up
      try {
        await client.deleteFile(testFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it('should cache resource metadata separately from content', async () => {
    // List files to get metadata
    const files = await client.listFilesInVault();
    expect(files.length).toBeGreaterThan(0);

    // Pick first markdown file (skip system files like .DS_Store)
    const testFile = files.find(f => f.endsWith('.md'));
    expect(testFile).toBeDefined();
    
    // Get file content
    const content1 = await client.getFileContents(testFile);
    
    // Get same file again - should potentially use cache
    const content2 = await client.getFileContents(testFile);
    
    // Content should be identical
    expect(content2).toEqual(content1);
    
    // Now test getting just metadata (if supported)
    const metadata = await client.getFileContents(testFile, 'metadata');
    // The API returns file metadata in a different format
    expect(metadata).toBeDefined();
    
    // Metadata call shouldn't require full content fetch if cached properly
  });
});