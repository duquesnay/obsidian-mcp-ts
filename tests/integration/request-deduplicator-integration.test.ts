import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { RequestDeduplicator } from '../../src/utils/RequestDeduplicator.js';
import 'dotenv/config';

/**
 * Integration tests for RequestDeduplicator with real ObsidianClient
 *
 * These tests verify that request deduplication works correctly when integrated
 * with the actual ObsidianClient making real API calls to Obsidian.
 *
 * Requirements:
 * 1. Obsidian running with Local REST API plugin
 * 2. OBSIDIAN_API_KEY environment variable set
 * 3. Plugin accessible at http://127.0.0.1:27124
 *
 * Run with: npm test -- tests/integration/request-deduplicator-integration.test.ts
 *
 * IMPORTANT: These tests make real API calls and may create/modify actual files.
 * Only run against a test vault, never production data.
 */
describe('RequestDeduplicator Integration Tests', () => {
  let client: ObsidianClient;
  let deduplicator: RequestDeduplicator;
  const testFiles: string[] = [];

  beforeAll(async () => {
    // Fail if no API key - integration tests should be explicit
    if (!process.env.OBSIDIAN_API_KEY) {
      throw new Error(
        '❌ Integration tests require OBSIDIAN_API_KEY environment variable\n' +
        '   Set it in .env file or skip integration tests with:\n' +
        '   npm test -- --exclude="**/integration/**"'
      );
    }

    client = new ObsidianClient({
      apiKey: process.env.OBSIDIAN_API_KEY,
      host: '127.0.0.1',
      port: 27124,
      verifySsl: false
    });

    // Verify connection before running tests
    try {
      await client.listFilesInVault();
      console.log('✅ Connected to Obsidian REST API for deduplication tests');
    } catch (error) {
      console.error('❌ Failed to connect to Obsidian REST API:', error);
      console.log('Make sure:');
      console.log('   - Obsidian is running');
      console.log('   - Local REST API plugin is enabled');
      console.log('   - API key is correct');
      throw error;
    }
  });

  beforeEach(() => {
    // Create a new deduplicator for each test with metrics enabled
    deduplicator = new RequestDeduplicator(5000, { enableMetricsLogging: true });
  });

  afterEach(() => {
    // Clear any pending requests
    deduplicator.clear();
  });

  afterAll(async () => {
    if (!client) return;

    // Clean up any test files created during tests
    for (const testFile of testFiles) {
      try {
        await client.deleteFile(testFile);
        console.log(`🧹 Cleaned up test file: ${testFile}`);
      } catch (error) {
        // File might not exist, that's okay
        console.log(`Test file cleanup: ${error}`);
      }
    }
  });

  describe('Concurrent File Operations Deduplication', () => {
    it('should deduplicate concurrent listFilesInVault requests', async () => {
      let apiCallCount = 0;
      
      // Create a custom client that counts API calls
      const originalListFiles = client.listFilesInVault.bind(client);
      const countingListFiles = vi.fn(async () => {
        apiCallCount++;
        console.log(`📂 API call #${apiCallCount} to listFilesInVault`);
        return originalListFiles();
      });

      // Replace the method to track calls
      client.listFilesInVault = countingListFiles;

      // Make multiple concurrent requests using the deduplicator
      const key = 'list-files-test';
      const promises = Array(5).fill(null).map((_, index) => {
        console.log(`🚀 Starting concurrent request #${index + 1}`);
        return deduplicator.dedupe(key, () => client.listFilesInVault());
      });

      // Wait for all requests to complete
      const results = await Promise.all(promises);

      // Verify all results are identical (same array reference)
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(Array.isArray(result)).toBe(true);
        expect(result).toBe(results[0]); // Same reference due to deduplication
        console.log(`✅ Result #${index + 1}: ${result.length} files`);
      });

      // Verify only one actual API call was made
      expect(apiCallCount).toBe(1);
      console.log(`🎯 Total API calls made: ${apiCallCount} (expected: 1)`);

      // Check deduplicator metrics
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(4); // 4 hits (requests 2-5)
      expect(stats.misses).toBe(1); // 1 miss (first request)
      expect(stats.hitRate).toBe(0.8); // 80% hit rate
      expect(stats.totalRequests).toBe(5);

      console.log('📊 Deduplicator metrics:');
      deduplicator.logMetrics();
    });

    it('should deduplicate concurrent file read requests', async () => {
      const timestamp = Date.now();
      const testFile = `dedup-test-${timestamp}.md`;
      const testContent = `# Deduplication Test\n\nThis file tests concurrent read deduplication.\n\nCreated at: ${new Date().toISOString()}`;
      
      testFiles.push(testFile);

      // Create test file first
      await client.createFile(testFile, testContent);
      console.log(`📝 Created test file: ${testFile}`);

      let apiCallCount = 0;
      
      // Track API calls to getFileContents
      const originalGetFile = client.getFileContents.bind(client);
      const countingGetFile = vi.fn(async (path: string) => {
        apiCallCount++;
        console.log(`📖 API call #${apiCallCount} to getFileContents(${path})`);
        return originalGetFile(path);
      });

      client.getFileContents = countingGetFile;

      // Make multiple concurrent read requests
      const key = `file-content:${testFile}`;
      const concurrentReads = 8;
      const promises = Array(concurrentReads).fill(null).map((_, index) => {
        console.log(`🚀 Starting concurrent read #${index + 1} for ${testFile}`);
        return deduplicator.dedupe(key, () => client.getFileContents(testFile));
      });

      // Wait for all reads to complete
      const results = await Promise.all(promises);

      // Verify all results are identical
      expect(results).toHaveLength(concurrentReads);
      results.forEach((content, index) => {
        expect(typeof content).toBe('string');
        expect(content).toBe(testContent); // Same content
        expect(content).toBe(results[0]); // Same reference due to deduplication
        console.log(`✅ Read #${index + 1}: ${content.length} characters`);
      });

      // Verify only one actual API call was made
      expect(apiCallCount).toBe(1);
      console.log(`🎯 Total API calls made: ${apiCallCount} (expected: 1)`);

      // Check deduplicator metrics
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(concurrentReads - 1); // All but first request
      expect(stats.misses).toBe(1); // Only first request
      expect(stats.hitRate).toBe((concurrentReads - 1) / concurrentReads);
      expect(stats.totalRequests).toBe(concurrentReads);

      console.log('📊 File read deduplication metrics:');
      deduplicator.logMetrics();
    });

    it('should deduplicate concurrent search requests', async () => {
      const searchQuery = 'integration test marker';
      
      let apiCallCount = 0;
      
      // Track API calls to search
      const originalSearch = client.search.bind(client);
      const countingSearch = vi.fn(async (query: string) => {
        apiCallCount++;
        console.log(`🔍 API call #${apiCallCount} to search("${query}")`);
        return originalSearch(query);
      });

      client.search = countingSearch;

      // Make multiple concurrent search requests
      const key = `search:${searchQuery}`;
      const concurrentSearches = 6;
      const promises = Array(concurrentSearches).fill(null).map((_, index) => {
        console.log(`🚀 Starting concurrent search #${index + 1} for "${searchQuery}"`);
        return deduplicator.dedupe(key, () => client.search(searchQuery));
      });

      // Wait for all searches to complete
      const results = await Promise.all(promises);

      // Verify all results are identical
      expect(results).toHaveLength(concurrentSearches);
      results.forEach((searchResult, index) => {
        expect(searchResult).toBeDefined();
        expect(searchResult).toBe(results[0]); // Same reference due to deduplication
        console.log(`✅ Search #${index + 1}:`, JSON.stringify(searchResult).substring(0, 100));
      });

      // Verify only one actual API call was made
      expect(apiCallCount).toBe(1);
      console.log(`🎯 Total API calls made: ${apiCallCount} (expected: 1)`);

      // Check deduplicator metrics
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(concurrentSearches - 1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe((concurrentSearches - 1) / concurrentSearches);

      console.log('📊 Search deduplication metrics:');
      deduplicator.logMetrics();
    });
  });

  describe('Error Propagation in Concurrent Scenarios', () => {
    it('should propagate errors to all concurrent requests', async () => {
      const nonExistentFile = `definitely-does-not-exist-${Date.now()}.md`;
      
      let apiCallCount = 0;
      
      // Track API calls
      const originalGetFile = client.getFileContents.bind(client);
      const countingGetFile = vi.fn(async (path: string) => {
        apiCallCount++;
        console.log(`📖 API call #${apiCallCount} to getFileContents(${path})`);
        return originalGetFile(path);
      });

      client.getFileContents = countingGetFile;

      // Make multiple concurrent requests for non-existent file
      const key = `file-content:${nonExistentFile}`;
      const concurrentRequests = 4;
      const promises = Array(concurrentRequests).fill(null).map((_, index) => {
        console.log(`🚀 Starting concurrent request #${index + 1} for non-existent file`);
        return deduplicator.dedupe(key, () => client.getFileContents(nonExistentFile));
      });

      // All requests should fail with the same error
      const errors: Error[] = [];
      for (const promise of promises) {
        try {
          await promise;
          expect.fail('Request should have failed');
        } catch (error) {
          errors.push(error as Error);
          console.log(`❌ Request failed as expected: ${(error as Error).message}`);
        }
      }

      // Verify all errors are present and similar
      expect(errors).toHaveLength(concurrentRequests);
      errors.forEach((error, index) => {
        expect(error.message).toContain('404');
        console.log(`✅ Error #${index + 1}: ${error.message}`);
      });

      // Verify only one actual API call was made (error is also deduplicated)
      expect(apiCallCount).toBe(1);
      console.log(`🎯 Total API calls made: ${apiCallCount} (expected: 1)`);

      // Check deduplicator metrics
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(concurrentRequests - 1);
      expect(stats.misses).toBe(1);

      console.log('📊 Error deduplication metrics:');
      deduplicator.logMetrics();
    });

    it('should allow new requests after error resolution', async () => {
      const nonExistentFile = `temp-error-test-${Date.now()}.md`;
      
      let apiCallCount = 0;
      
      // Track API calls
      const originalGetFile = client.getFileContents.bind(client);
      const countingGetFile = vi.fn(async (path: string) => {
        apiCallCount++;
        console.log(`📖 API call #${apiCallCount} to getFileContents(${path})`);
        return originalGetFile(path);
      });

      client.getFileContents = countingGetFile;

      // First request should fail
      const key = `file-content:${nonExistentFile}`;
      try {
        await deduplicator.dedupe(key, () => client.getFileContents(nonExistentFile));
        expect.fail('First request should have failed');
      } catch (error) {
        console.log(`❌ First request failed as expected: ${(error as Error).message}`);
      }

      expect(apiCallCount).toBe(1);

      // Create the file
      const testContent = '# Error Resolution Test\n\nThis file was created after error.';
      await client.createFile(nonExistentFile, testContent);
      testFiles.push(nonExistentFile);
      console.log(`📝 Created file: ${nonExistentFile}`);

      // Second request should succeed
      const content = await deduplicator.dedupe(key, () => client.getFileContents(nonExistentFile));
      expect(content).toBe(testContent);
      expect(apiCallCount).toBe(2);
      console.log(`✅ Second request succeeded: ${content.length} characters`);

      // Check final metrics
      const stats = deduplicator.getStats();
      expect(stats.misses).toBe(2); // Both requests were misses (no concurrent requests)
      expect(stats.hits).toBe(0);

      console.log('📊 Error recovery metrics:');
      deduplicator.logMetrics();
    });
  });

  describe('Timeout and TTL Behavior', () => {
    it('should handle requests that timeout with TTL expiration', async () => {
      // Create a deduplicator with very short TTL for this test
      const shortTtlDeduplicator = new RequestDeduplicator(100, { enableMetricsLogging: true }); // 100ms TTL
      
      let apiCallCount = 0;
      const resolvers: Array<(value: string[]) => void> = [];
      
      // Create a slow request that we can control
      const slowRequest = vi.fn(async () => {
        apiCallCount++;
        console.log(`🐌 Starting slow API call #${apiCallCount}`);
        return new Promise<string[]>((resolve) => {
          resolvers.push(resolve);
        });
      });

      // Start first request (won't complete immediately)
      const key = 'slow-request-test';
      const firstPromise = shortTtlDeduplicator.dedupe(key, slowRequest);
      console.log('🚀 Started first slow request');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log('⏰ TTL expired');

      // Start second request (should be new request, not deduplicated)
      const secondPromise = shortTtlDeduplicator.dedupe(key, slowRequest);
      console.log('🚀 Started second request after TTL expiration');

      // Verify two separate API calls were made
      expect(apiCallCount).toBe(2);
      console.log(`🎯 API calls made after TTL: ${apiCallCount} (expected: 2)`);

      // Complete both requests with different results to verify they're independent
      const testFiles1 = ['file1.md', 'file2.md'];
      const testFiles2 = ['file3.md', 'file4.md'];
      
      resolvers[0]!(testFiles1);
      resolvers[1]!(testFiles2);
      
      // Both should complete successfully with their respective results
      const [result1, result2] = await Promise.all([firstPromise, secondPromise]);
      expect(result1).toEqual(testFiles1);
      expect(result2).toEqual(testFiles2);
      console.log('✅ Both requests completed successfully with different results');

      // Check metrics
      const stats = shortTtlDeduplicator.getStats();
      expect(stats.misses).toBe(2); // Both were misses due to TTL expiration
      expect(stats.hits).toBe(0);

      console.log('📊 TTL expiration metrics:');
      shortTtlDeduplicator.logMetrics();
    }, 10000); // Increase timeout for this specific test

    it('should handle mixed concurrent and sequential requests', async () => {
      const testFile = `mixed-test-${Date.now()}.md`;
      const testContent = '# Mixed Request Test\n\nTesting concurrent and sequential patterns.';
      
      testFiles.push(testFile);
      await client.createFile(testFile, testContent);
      console.log(`📝 Created test file: ${testFile}`);

      let apiCallCount = 0;
      
      // Track API calls
      const originalGetFile = client.getFileContents.bind(client);
      const countingGetFile = vi.fn(async (path: string) => {
        apiCallCount++;
        console.log(`📖 API call #${apiCallCount} to getFileContents(${path})`);
        return originalGetFile(path);
      });

      client.getFileContents = countingGetFile;

      const key = `file-content:${testFile}`;

      // Phase 1: Concurrent requests (should be deduplicated)
      console.log('🚀 Phase 1: Concurrent requests');
      const concurrentPromises = Array(3).fill(null).map((_, index) => {
        console.log(`  Starting concurrent request #${index + 1}`);
        return deduplicator.dedupe(key, () => client.getFileContents(testFile));
      });

      const concurrentResults = await Promise.all(concurrentPromises);
      expect(apiCallCount).toBe(1);
      console.log(`✅ Phase 1 completed. API calls: ${apiCallCount}`);

      // Phase 2: Wait for requests to complete and start new sequential requests
      console.log('🚀 Phase 2: Sequential requests');
      
      const sequentialResult1 = await deduplicator.dedupe(key, () => client.getFileContents(testFile));
      expect(apiCallCount).toBe(2); // New request after previous completed
      console.log(`✅ Sequential request 1 completed. API calls: ${apiCallCount}`);

      const sequentialResult2 = await deduplicator.dedupe(key, () => client.getFileContents(testFile));
      expect(apiCallCount).toBe(3); // Another new request
      console.log(`✅ Sequential request 2 completed. API calls: ${apiCallCount}`);

      // Verify all results are correct
      [...concurrentResults, sequentialResult1, sequentialResult2].forEach((result, index) => {
        expect(result).toBe(testContent);
        console.log(`✅ Result #${index + 1} verified`);
      });

      // Check final metrics
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(2); // 2 hits from the concurrent requests
      expect(stats.misses).toBe(3); // 3 misses (first concurrent + 2 sequential)
      expect(stats.totalRequests).toBe(5);

      console.log('📊 Mixed request pattern metrics:');
      deduplicator.logMetrics();
    });
  });

  describe('Different Request Types Isolation', () => {
    it('should not deduplicate different request types with different keys', async () => {
      let listApiCallCount = 0;
      let searchApiCallCount = 0;
      
      // Track different types of API calls
      const originalListFiles = client.listFilesInVault.bind(client);
      const countingListFiles = vi.fn(async () => {
        listApiCallCount++;
        console.log(`📂 List API call #${listApiCallCount}`);
        return originalListFiles();
      });

      const originalSearch = client.search.bind(client);
      const countingSearch = vi.fn(async (query: string) => {
        searchApiCallCount++;
        console.log(`🔍 Search API call #${searchApiCallCount} for "${query}"`);
        return originalSearch(query);
      });

      client.listFilesInVault = countingListFiles;
      client.search = countingSearch;

      // Make concurrent requests of different types
      console.log('🚀 Starting mixed concurrent requests');
      const promises = [
        deduplicator.dedupe('list-files', () => client.listFilesInVault()),
        deduplicator.dedupe('search-test', () => client.search('test')),
        deduplicator.dedupe('list-files', () => client.listFilesInVault()), // Should be deduplicated
        deduplicator.dedupe('search-test', () => client.search('test')), // Should be deduplicated
        deduplicator.dedupe('search-other', () => client.search('other')), // Different search, not deduplicated
      ];

      const results = await Promise.all(promises);

      // Verify correct number of API calls
      expect(listApiCallCount).toBe(1); // Only one list call despite 2 requests
      expect(searchApiCallCount).toBe(2); // Two search calls for different queries
      console.log(`🎯 List API calls: ${listApiCallCount} (expected: 1)`);
      console.log(`🎯 Search API calls: ${searchApiCallCount} (expected: 2)`);

      // Verify results
      expect(results).toHaveLength(5);
      expect(Array.isArray(results[0])).toBe(true); // List result
      expect(results[0]).toBe(results[2]); // Same list result reference
      expect(results[1]).toBe(results[3]); // Same search result reference
      expect(results[1]).not.toBe(results[4]); // Different search results

      // Check metrics
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(2); // 2 deduplicated requests
      expect(stats.misses).toBe(3); // 3 unique requests
      expect(stats.totalRequests).toBe(5);

      console.log('📊 Request type isolation metrics:');
      deduplicator.logMetrics();
    });
  });

  describe('Real Network Timing', () => {
    it('should handle real network latency and race conditions', async () => {
      // This test uses real timers to ensure race conditions are handled properly
      vi.useRealTimers();

      let apiCallCount = 0;
      const requestTimes: number[] = [];
      
      // Track API calls with timing
      const originalListFiles = client.listFilesInVault.bind(client);
      const timedListFiles = vi.fn(async () => {
        const startTime = Date.now();
        apiCallCount++;
        console.log(`📂 Timed API call #${apiCallCount} started at ${startTime}`);
        
        const result = await originalListFiles();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        requestTimes.push(duration);
        console.log(`📂 Timed API call #${apiCallCount} completed in ${duration}ms`);
        
        return result;
      });

      client.listFilesInVault = timedListFiles;

      // Start multiple requests with slight delays to simulate real-world timing
      const key = 'timed-list-test';
      const promises: Promise<string[]>[] = [];
      
      for (let i = 0; i < 4; i++) {
        // Add small random delays to simulate different client timing
        setTimeout(() => {
          console.log(`🚀 Starting delayed request #${i + 1}`);
          promises.push(deduplicator.dedupe(key, () => client.listFilesInVault()));
        }, Math.random() * 10);
      }

      // Wait a bit for all requests to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Wait for all to complete
      const results = await Promise.all(promises);

      // Verify only one API call despite timing variations
      expect(apiCallCount).toBe(1);
      expect(requestTimes).toHaveLength(1);
      console.log(`🎯 Total API calls: ${apiCallCount} (expected: 1)`);
      console.log(`⏱️ Request duration: ${requestTimes[0]}ms`);

      // Verify all results are identical
      results.forEach((result, index) => {
        expect(result).toBe(results[0]);
        console.log(`✅ Result #${index + 1}: ${result.length} files`);
      });

      // Check metrics with real timing
      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      console.log(`📊 Average response time: ${stats.averageResponseTime.toFixed(2)}ms`);

      console.log('📊 Real timing deduplication metrics:');
      deduplicator.logMetrics();

      // Switch back to fake timers for other tests
      vi.useFakeTimers();
    });
  });
});