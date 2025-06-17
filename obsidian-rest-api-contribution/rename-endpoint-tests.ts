// Test cases for the rename endpoint
// These would be added to the obsidian-local-rest-api test suite

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';

describe('Rename Endpoint Tests', () => {
  let apiKey: string;
  let baseUrl: string;
  
  beforeEach(() => {
    apiKey = process.env.TEST_API_KEY || 'test-api-key';
    baseUrl = 'https://localhost:27124';
  });

  describe('POST /vault/{oldPath}/rename', () => {
    it('should rename a file successfully', async () => {
      // Create a test file first
      await request(baseUrl)
        .put('/vault/test-file.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'text/markdown')
        .send('# Test File\nThis is a test file.')
        .expect(204);

      // Rename the file
      const response = await request(baseUrl)
        .post('/vault/test-file.md/rename')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ newPath: 'renamed-file.md' })
        .expect(200);

      expect(response.body).toEqual({
        message: 'File successfully renamed',
        oldPath: 'test-file.md',
        newPath: 'renamed-file.md'
      });

      // Verify old file doesn't exist
      await request(baseUrl)
        .get('/vault/test-file.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(404);

      // Verify new file exists with same content
      const newFileResponse = await request(baseUrl)
        .get('/vault/renamed-file.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(newFileResponse.text).toBe('# Test File\nThis is a test file.');

      // Cleanup
      await request(baseUrl)
        .delete('/vault/renamed-file.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(204);
    });

    it('should move a file to a different directory', async () => {
      // Create directory and file
      await request(baseUrl)
        .put('/vault/folder1/test.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'text/markdown')
        .send('Test content')
        .expect(204);

      await request(baseUrl)
        .put('/vault/folder2/.gitkeep')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'text/plain')
        .send('')
        .expect(204);

      // Move the file
      const response = await request(baseUrl)
        .post('/vault/folder1/test.md/rename')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ newPath: 'folder2/test.md' })
        .expect(200);

      expect(response.body.oldPath).toBe('folder1/test.md');
      expect(response.body.newPath).toBe('folder2/test.md');

      // Verify file moved
      await request(baseUrl)
        .get('/vault/folder2/test.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);
    });

    it('should return 404 for non-existent source file', async () => {
      const response = await request(baseUrl)
        .post('/vault/non-existent.md/rename')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ newPath: 'new-name.md' })
        .expect(404);
    });

    it('should return 409 if destination already exists', async () => {
      // Create two files
      await request(baseUrl)
        .put('/vault/file1.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'text/markdown')
        .send('File 1')
        .expect(204);

      await request(baseUrl)
        .put('/vault/file2.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'text/markdown')
        .send('File 2')
        .expect(204);

      // Try to rename file1 to file2
      const response = await request(baseUrl)
        .post('/vault/file1.md/rename')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ newPath: 'file2.md' })
        .expect(409);

      expect(response.body.message).toBe('Destination file already exists');
    });

    it('should return 400 for missing newPath', async () => {
      const response = await request(baseUrl)
        .post('/vault/test.md/rename')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({})
        .expect(400);

      expect(response.body.message).toBe('newPath is required in request body');
    });

    it('should return error for directory paths', async () => {
      const response = await request(baseUrl)
        .post('/vault/folder//rename')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ newPath: 'new-folder/' })
        .expect(405);
    });

    it('should handle special characters in filenames', async () => {
      // Create file with special characters
      await request(baseUrl)
        .put('/vault/file%20with%20spaces.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'text/markdown')
        .send('Content')
        .expect(204);

      // Rename it
      const response = await request(baseUrl)
        .post('/vault/file%20with%20spaces.md/rename')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ newPath: 'file-without-spaces.md' })
        .expect(200);

      expect(response.body.oldPath).toBe('file with spaces.md');
      expect(response.body.newPath).toBe('file-without-spaces.md');
    });
  });

  describe('MOVE /vault/{oldPath} (alternative implementation)', () => {
    it('should move a file using MOVE method', async () => {
      // Create a test file
      await request(baseUrl)
        .put('/vault/source.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'text/markdown')
        .send('Source content')
        .expect(204);

      // Move the file
      await request(baseUrl)
        .move('/vault/source.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Destination', '/vault/destination.md')
        .expect(204);

      // Verify file moved
      await request(baseUrl)
        .get('/vault/destination.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      await request(baseUrl)
        .get('/vault/source.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(404);
    });

    it('should handle absolute destination URLs', async () => {
      await request(baseUrl)
        .put('/vault/test.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'text/markdown')
        .send('Test')
        .expect(204);

      await request(baseUrl)
        .move('/vault/test.md')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Destination', 'https://localhost:27124/vault/moved.md')
        .expect(204);
    });
  });
});

// Integration test to verify link updates
describe('Link Update Integration Tests', () => {
  it('should update links when renaming a file', async () => {
    // Create two files where one links to the other
    await request(baseUrl)
      .put('/vault/linked-file.md')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('Content-Type', 'text/markdown')
      .send('# Linked File\nThis is the target file.')
      .expect(204);

    await request(baseUrl)
      .put('/vault/source.md')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('Content-Type', 'text/markdown')
      .send('# Source\nThis links to [[linked-file]].')
      .expect(204);

    // Rename the linked file
    await request(baseUrl)
      .post('/vault/linked-file.md/rename')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ newPath: 'renamed-linked-file.md' })
      .expect(200);

    // Check that the link was updated in the source file
    const sourceContent = await request(baseUrl)
      .get('/vault/source.md')
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200);

    expect(sourceContent.text).toContain('[[renamed-linked-file]]');
  });
});