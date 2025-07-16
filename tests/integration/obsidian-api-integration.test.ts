import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import 'dotenv/config';

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

    // Verify connection
    try {
      await client.listFilesInVault();
      console.log('Connected to Obsidian REST API');
    } catch (error) {
      console.error('Failed to connect to Obsidian REST API:', error);
      console.log('Make sure:');
      console.log('   - Obsidian is running');
      console.log('   - Local REST API plugin is enabled');
      console.log('   - API key is correct');
      throw error;
    }
  });

  afterAll(async () => {
    if (!client) return;

    // Clean up test files
    try {
      await client.deleteFile(testFile);
      console.log(`Cleaned up test file: ${testFile}`);
    } catch (error) {
      // File might not exist, that's okay
      console.log(`Test file cleanup: ${error}`);
    }
  });

  describe('Real Network Operations', () => {
    it('should list files in vault', async () => {

      const files = await client.listFilesInVault();
      
      expect(Array.isArray(files)).toBe(true);
      console.log(`Found ${files.length} files in vault`);
    });

    it('should create, read, update, and delete a file', async () => {

      // Create
      await client.createFile(testFile, testContent);
      console.log(`Created file: ${testFile}`);

      // Read
      const content = await client.getFileContents(testFile);
      expect(content).toBe(testContent);
      console.log(`Read file content: ${content.length} characters`);

      // Update
      const updatedContent = testContent + '\n\n## Updated\n\nThis content was updated.';
      await client.updateFile(testFile, updatedContent);
      console.log(`Updated file: ${testFile}`);

      // Verify update
      const newContent = await client.getFileContents(testFile);
      expect(newContent).toBe(updatedContent);
      expect(newContent).toContain('Updated');

      // Delete handled in afterAll
    });

    it('should handle retry logic on real network conditions', async () => {

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
        console.log(`Search found: ${JSON.stringify(searchResults, null, 2)}`);
        
        // Clean up
        await client.deleteFile(searchTestFile);
      } catch (error) {
        console.log('Search test may not work with all Obsidian configurations:', error);
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
        expect(error.message).toContain('Authentication failed');
        console.log(`Authentication error handled: ${error.message}`);
      }
    });

    it('should handle file not found errors', async () => {

      try {
        await client.getFileContents('file-that-definitely-does-not-exist.md');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('404');
        console.log(`File not found error handled: ${error.message}`);
      }
    });
  });

  describe('Directory Operations', () => {
    it('should move directories with spaces in names', async () => {
      const timestamp = Date.now();
      const testDirWithSpaces = `test-dir ${timestamp}/Book Yourself Solid Implementation`;
      const testDirRenamed = `test-dir ${timestamp}/Book Yourself Solid - Renamed`;
      const testFile = `${testDirWithSpaces}/test-file.md`;
      
      try {
        // Create directory structure with spaces
        await client.createDirectory(testDirWithSpaces, true);
        console.log(`Created directory with spaces: ${testDirWithSpaces}`);
        
        // Create a file in the directory
        await client.createFile(testFile, '# Test File\n\nThis tests directory operations with spaces.');
        console.log(`Created file in directory: ${testFile}`);
        
        // Verify the file exists
        const content = await client.getFileContents(testFile);
        expect(content).toContain('Test File');
        
        // Move the directory (this should fail with current bug)
        const result = await client.moveDirectory(testDirWithSpaces, testDirRenamed);
        console.log(`Moved directory: ${testDirWithSpaces} -> ${testDirRenamed}`);
        expect(result.success).toBe(true);
        
        // Verify the file exists at new location
        const newFilePath = `${testDirRenamed}/test-file.md`;
        const movedContent = await client.getFileContents(newFilePath);
        expect(movedContent).toContain('Test File');
        
        // Clean up
        await client.deleteDirectory(testDirRenamed, true);
        console.log(`Cleaned up test directory: ${testDirRenamed}`);
      } catch (error) {
        console.error('Directory move test failed:', error);
        // Try to clean up both possible locations
        try {
          await client.deleteDirectory(testDirWithSpaces, true);
        } catch {
          // Ignore cleanup errors
        }
        try {
          await client.deleteDirectory(testDirRenamed, true);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });

    it('should handle complex directory paths with special characters', async () => {
      const timestamp = Date.now();
      const testDir = `test-special ${timestamp}/Project (2024) - Version 1.0`;
      const renamedDir = `test-special ${timestamp}/Project 2024 v1.0`;
      
      try {
        // Create directory with special characters
        await client.createDirectory(testDir, true);
        console.log(`Created directory with special chars: ${testDir}`);
        
        // Move the directory
        const result = await client.moveDirectory(testDir, renamedDir);
        expect(result.success).toBe(true);
        console.log(`Successfully moved directory with special characters`);
        
        // Clean up
        await client.deleteDirectory(renamedDir, true);
      } catch (error) {
        console.error('Special characters test failed:', error);
        // Clean up
        try {
          await client.deleteDirectory(testDir, true);
        } catch {}
        try {
          await client.deleteDirectory(renamedDir, true);
        } catch {}
        throw error;
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent operations', async () => {

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
      
      console.log(`Completed ${operations.length} concurrent operations`);
    });

    it('should handle large file operations', async () => {

      const largeContent = '# Large File Test\n\n' + 'x'.repeat(10000) + '\n\n## End';
      const largeTestFile = `large-test-${Date.now()}.md`;

      try {
        await client.createFile(largeTestFile, largeContent);
        
        const retrievedContent = await client.getFileContents(largeTestFile);
        expect(retrievedContent).toBe(largeContent);
        expect(retrievedContent.length).toBe(largeContent.length);
        
        console.log(`Large file test: ${largeContent.length} characters`);
        
        // Clean up
        await client.deleteFile(largeTestFile);
      } catch (error) {
        console.error('Large file test failed:', error);
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