/**
 * Integration tests for notification system with file operations
 * Tests that file operations trigger appropriate cache invalidation events
 * 
 * IMPORTANT: These tests make real API calls to test actual integration behavior.
 * They require a running Obsidian instance with Local REST API plugin.
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { NotificationManager } from '../../src/utils/NotificationManager.js';
import { SUBSCRIPTION_EVENTS } from '../../src/constants.js';
import { AppendContentTool } from '../../src/tools/AppendContentTool.js';
import { DeleteFileTool } from '../../src/tools/DeleteFileTool.js';
import { SimpleReplaceTool } from '../../src/tools/SimpleReplaceTool.js';
import { CreateDirectoryTool } from '../../src/tools/CreateDirectoryTool.js';
import { DeleteDirectoryTool } from '../../src/tools/DeleteDirectoryTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { ConfigLoader } from '../../src/utils/configLoader.js';
import 'dotenv/config';

describe('Notification Integration with File Operations', () => {
  let notificationManager: NotificationManager;
  let mockCallback: ReturnType<typeof vi.fn>;
  let client: ObsidianClient;
  let testFilesCreated: string[] = [];
  let testDirsCreated: string[] = [];
  let skipTests = false;

  beforeAll(async () => {
    // Skip tests if no API key - integration tests should be explicit
    if (!process.env.OBSIDIAN_API_KEY) {
      console.log('⚠️  Skipping notification integration tests - OBSIDIAN_API_KEY not set');
      skipTests = true;
      return;
    }

    client = new ObsidianClient({
      apiKey: process.env.OBSIDIAN_API_KEY,
      host: '127.0.0.1',
      port: 27124,
      verifySsl: false
    });

    // Verify connection works
    try {
      await client.listFilesInVault();
      console.log('✅ Connected to Obsidian REST API for notification tests');
    } catch (error) {
      console.log('⚠️  Cannot connect to Obsidian API - skipping notification integration tests');
      console.log('   Make sure Obsidian is running with Local REST API plugin enabled');
      skipTests = true;
      return;
    }
  });

  beforeEach(() => {
    // Skip setup if no API key or connection failed
    if (skipTests) return;
    
    // Reset notification manager and config loader to ensure clean state
    NotificationManager.reset();
    ConfigLoader.getInstance().reset();
    notificationManager = NotificationManager.getInstance();
    mockCallback = vi.fn();
  });

  afterEach(async () => {
    // Skip cleanup if tests are being skipped
    if (skipTests) return;
    
    NotificationManager.reset();
    ConfigLoader.getInstance().reset();
    
    // Clean up test files and directories
    for (const file of testFilesCreated) {
      try {
        await client.deleteFile(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    for (const dir of testDirsCreated) {
      try {
        await client.deleteDirectory(dir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    testFilesCreated = [];
    testDirsCreated = [];
  });

  describe('File Write Operations', () => {
    test('AppendContentTool should notify file updated event', async () => {
      // Skip if tests should be skipped
      if (skipTests) {
        console.log('⚠️  Skipping test - integration tests disabled');
        return;
      }

      // Subscribe to file updated events
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, mockCallback);
      
      const tool = new AppendContentTool();
      const testFile = `notification-test-append-${Date.now()}.md`;
      testFilesCreated.push(testFile);
      
      // Create initial file content
      await client.createFile(testFile, '# Test Note\n\nInitial content.');
      
      // Tools now use real ObsidianClient through normal configuration flow
      // No manual client injection needed - environment variables are set
      await tool.executeTyped({
        filepath: testFile,
        content: '\n\nAppended content via integration test'
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: testFile,
        key: testFile,
        timestamp: expect.any(Number),
        metadata: {
          operation: 'update', // AppendContent actually uses 'update' operation
          tool: 'obsidian_append_content',
          contentLength: expect.any(Number),
          createIfNotExists: expect.any(Boolean)
        }
      });
      
      // Verify the content was actually appended
      const updatedContent = await client.getFileContents(testFile);
      expect(updatedContent).toContain('Appended content via integration test');
    });

    test('SimpleReplaceTool should notify file updated event', async () => {
      // Skip if tests should be skipped
      if (skipTests) {
        console.log('⚠️  Skipping test - integration tests disabled');
        return;
      }

      // Subscribe to file updated events
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, mockCallback);
      
      const tool = new SimpleReplaceTool();
      const testFile = `notification-test-replace-${Date.now()}.md`;
      testFilesCreated.push(testFile);
      
      // Create file with content to replace
      await client.createFile(testFile, '# Test Note\n\nContent with old text here.');
      
      // Tools now use real ObsidianClient through normal configuration flow
      // No manual client injection needed - environment variables are set
      await tool.executeTyped({
        filepath: testFile,
        find: 'old text',
        replace: 'new text'
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: testFile,
        key: testFile, 
        timestamp: expect.any(Number),
        metadata: {
          operation: 'replace',
          tool: 'obsidian_simple_replace',
          findLength: expect.any(Number),
          replaceLength: expect.any(Number),
          contentLengthChange: expect.any(Number)
        }
      });
      
      // Verify the content was actually replaced
      const updatedContent = await client.getFileContents(testFile);
      expect(updatedContent).toContain('new text');
      expect(updatedContent).not.toContain('old text');
    });
  });

  describe('File Delete Operations', () => {
    test('DeleteFileTool should notify file deleted event', async () => {
      // Skip if tests should be skipped
      if (skipTests) {
        console.log('⚠️  Skipping test - integration tests disabled');
        return;
      }

      // Subscribe to file deleted events
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_DELETED, mockCallback);
      
      const tool = new DeleteFileTool();
      const testFile = `notification-test-delete-${Date.now()}.md`;
      
      // Create file to delete
      await client.createFile(testFile, '# Test Note\n\nThis file will be deleted.');
      
      // Tools now use real ObsidianClient through normal configuration flow
      // No manual client injection needed - environment variables are set
      await tool.executeTyped({
        filepath: testFile
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: testFile,
        key: testFile,
        timestamp: expect.any(Number),
        metadata: {
          operation: 'delete',
          tool: 'obsidian_delete_file'
        }
      });
      
      // Verify the file was actually deleted
      try {
        await client.getFileContents(testFile);
        // If we get here, the file wasn't deleted
        expect.fail('File should have been deleted');
      } catch (error) {
        // Expected - file should not exist
        expect(error).toBeDefined();
      }
    });
  });

  describe('Directory Operations', () => {
    test.skip('CreateDirectoryTool should notify directory created event', async () => {
      // TODO: Re-enable when Obsidian REST API directory creation bug is fixed
      // The API returns success but directory is not actually created
      // Skip if tests should be skipped
      if (skipTests) {
        console.log('⚠️  Skipping test - integration tests disabled');
        return;
      }

      // Subscribe to directory created events
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.DIRECTORY_CREATED, mockCallback);
      
      const tool = new CreateDirectoryTool();
      const testDir = `notification-test-create-${Date.now()}`;
      testDirsCreated.push(testDir);
      
      // Tools now use real ObsidianClient through normal configuration flow
      // No manual client injection needed - environment variables are set
      const result = await tool.executeTyped({
        directoryPath: testDir
      });
      
      // Note: This test currently fails due to underlying Obsidian REST API issues
      // The directory creation API returns success but directory is not created
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: testDir,
        key: testDir,
        timestamp: expect.any(Number),
        metadata: {
          operation: 'create',
          tool: 'obsidian_create_directory',
          createParents: expect.any(Boolean),
          parentsCreated: expect.any(Boolean)
        }
      });
      
      // Verify directory was actually created 
      const checkResult = await client.checkPathExists(testDir);
      expect(checkResult.exists).toBe(true);
      expect(checkResult.type).toBe('directory');
    });

    test('DeleteDirectoryTool should notify directory deleted event', async () => {
      // Skip if no API key
      if (!process.env.OBSIDIAN_API_KEY) {
        console.log('⚠️  Skipping test - no API key');
        return;
      }

      // Subscribe to directory deleted events
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.DIRECTORY_DELETED, mockCallback);
      
      const tool = new DeleteDirectoryTool();
      const testDir = `notification-test-delete-${Date.now()}`;
      
      // Create directory to delete
      await client.createDirectory(testDir);
      
      // Tools now use real ObsidianClient through normal configuration flow
      // Environment variable OBSIDIAN_API_KEY is already set
      
      await tool.executeTyped({
        directoryPath: testDir
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: testDir,
        key: testDir,
        timestamp: expect.any(Number),
        metadata: {
          operation: 'delete',
          tool: 'obsidian_delete_directory',
          permanent: expect.any(Boolean),
          recursive: expect.any(Boolean),
          filesDeleted: expect.any(Number)
        }
      });
      
      // Verify directory was actually deleted
      try {
        await client.listFilesInDir(testDir);
        // If we get here, the directory wasn't deleted
        expect.fail('Directory should have been deleted');
      } catch (error) {
        // Expected - directory should not exist
        expect(error).toBeDefined();
      }
    });
  });
});