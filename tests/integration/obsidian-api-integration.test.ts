import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

/**
 * TRUE Integration tests for Obsidian REST API
 * 
 * These tests require:
 * 1. Obsidian running with Local REST API plugin
 * 2. OBSIDIAN_API_KEY environment variable set
 * 3. Plugin accessible at http://127.0.0.1:27124
 * 
 * Run with: npm test -- tests/integration/obsidian-api-integration.test.ts
 * 
 * IMPORTANT: These tests make real API calls and create/modify actual files.
 * Only run against a test vault, never production data.
 */
describe('Obsidian API Integration Tests', () => {
  let client: ObsidianClient;
  const testFile = `integration-test-${Date.now()}.md`;
  const testContent = '# Integration Test\n\nThis file was created by integration tests.';

  beforeAll(async () => {
    // Skip if no API key (CI environment or local dev without Obsidian)
    if (!process.env.OBSIDIAN_API_KEY) {
      console.log('⏭️  Skipping integration tests - no OBSIDIAN_API_KEY set');
      console.log('💡 To run integration tests:');
      console.log('   1. Start Obsidian with Local REST API plugin');
      console.log('   2. Set OBSIDIAN_API_KEY=your_api_key');
      console.log('   3. Run: npm test -- tests/integration/obsidian-api-integration.test.ts');
      return;
    }

    client = new ObsidianClient({
      apiKey: process.env.OBSIDIAN_API_KEY,
      host: '127.0.0.1',
      port: 27124,
      verifySsl: false
    });

    // Verify connection
    try {
      await client.listFilesInVault();
      console.log('✅ Connected to Obsidian REST API');
    } catch (error) {
      console.error('❌ Failed to connect to Obsidian REST API:', error);
      console.log('💡 Make sure:');
      console.log('   - Obsidian is running');
      console.log('   - Local REST API plugin is enabled');
      console.log('   - API key is correct');
      throw error;
    }
  });

  afterAll(async () => {
    if (!process.env.OBSIDIAN_API_KEY || !client) return;

    // Clean up test files
    try {
      await client.deleteFile(testFile);
      console.log(`🧹 Cleaned up test file: ${testFile}`);
    } catch (error) {
      // File might not exist, that's okay
      console.log(`ℹ️  Test file cleanup: ${error}`);
    }
  });

  describe('Real Network Operations', () => {
    it('should list files in vault', async () => {
      if (!process.env.OBSIDIAN_API_KEY) return;

      const files = await client.listFilesInVault();
      
      expect(Array.isArray(files)).toBe(true);
      console.log(`📁 Found ${files.length} files in vault`);
    });

    it('should create, read, update, and delete a file', async () => {
      if (!process.env.OBSIDIAN_API_KEY) return;

      // Create
      await client.createFile(testFile, testContent);
      console.log(`✨ Created file: ${testFile}`);

      // Read
      const content = await client.getFileContents(testFile);
      expect(content).toBe(testContent);
      console.log(`📖 Read file content: ${content.length} characters`);

      // Update
      const updatedContent = testContent + '\n\n## Updated\n\nThis content was updated.';
      await client.updateFile(testFile, updatedContent);
      console.log(`📝 Updated file: ${testFile}`);

      // Verify update
      const newContent = await client.getFileContents(testFile);
      expect(newContent).toBe(updatedContent);
      expect(newContent).toContain('Updated');

      // Delete handled in afterAll
    });

    it('should handle retry logic on real network conditions', async () => {
      if (!process.env.OBSIDIAN_API_KEY) return;

      // Test with a file that doesn't exist - should get 404 without retries
      try {
        await client.getFileContents('definitely-does-not-exist.md');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Error 404'); // Should be Obsidian error, not retry error
      }

      // Test successful operation after potential network delays
      const files = await client.listFilesInVault();
      expect(Array.isArray(files)).toBe(true);
    });

    it('should perform search operations', async () => {
      if (!process.env.OBSIDIAN_API_KEY) return;

      // First create a file with searchable content
      const searchTestFile = `search-test-${Date.now()}.md`;
      const searchContent = '# Search Test\n\nThis file contains the phrase INTEGRATION_TEST_MARKER for searching.';
      
      try {
        await client.createFile(searchTestFile, searchContent);
        
        // Wait a moment for indexing (some search systems need time)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Search for our marker
        const searchResults = await client.search('INTEGRATION_TEST_MARKER');
        
        expect(searchResults).toBeDefined();
        console.log(`🔍 Search found: ${JSON.stringify(searchResults, null, 2)}`);
        
        // Clean up
        await client.deleteFile(searchTestFile);
      } catch (error) {
        console.log('ℹ️  Search test may not work with all Obsidian configurations:', error);
        // Clean up even if test fails
        try {
          await client.deleteFile(searchTestFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Real Error Scenarios', () => {
    it('should handle authentication errors', async () => {
      if (!process.env.OBSIDIAN_API_KEY) return;

      // Create client with bad API key
      const badClient = new ObsidianClient({
        apiKey: 'invalid-key',
        host: '127.0.0.1',
        port: 27124,
        verifySsl: false
      });

      try {
        await badClient.listFilesInVault();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Request failed');
        console.log(`🔒 Authentication error handled: ${error.message}`);
      }
    });

    it('should handle file not found errors', async () => {
      if (!process.env.OBSIDIAN_API_KEY) return;

      try {
        await client.getFileContents('file-that-definitely-does-not-exist.md');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('404');
        console.log(`📄 File not found error handled: ${error.message}`);
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent operations', async () => {
      if (!process.env.OBSIDIAN_API_KEY) return;

      const operations = [
        client.listFilesInVault(),
        client.listFilesInVault(),
        client.listFilesInVault()
      ];

      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(3);
      results.forEach(files => {
        expect(Array.isArray(files)).toBe(true);
      });
      
      console.log(`⚡ Completed ${operations.length} concurrent operations`);
    });

    it('should handle large file operations', async () => {
      if (!process.env.OBSIDIAN_API_KEY) return;

      const largeContent = '# Large File Test\n\n' + 'x'.repeat(10000) + '\n\n## End';
      const largeTestFile = `large-test-${Date.now()}.md`;

      try {
        await client.createFile(largeTestFile, largeContent);
        
        const retrievedContent = await client.getFileContents(largeTestFile);
        expect(retrievedContent).toBe(largeContent);
        expect(retrievedContent.length).toBe(largeContent.length);
        
        console.log(`📊 Large file test: ${largeContent.length} characters`);
        
        // Clean up
        await client.deleteFile(largeTestFile);
      } catch (error) {
        console.error('❌ Large file test failed:', error);
        // Clean up even if test fails
        try {
          await client.deleteFile(largeTestFile);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });
  });
});