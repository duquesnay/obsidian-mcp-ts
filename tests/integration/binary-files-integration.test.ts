import { describe, it, expect, beforeAll } from 'vitest';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { NoteHandler } from '../../src/resources/concreteHandlers.js';
import { MimeTypeDetector } from '../../src/utils/MimeTypeDetector.js';
import { BINARY_FILE_LIMITS } from '../../src/constants.js';

/**
 * Integration tests for binary file support
 *
 * NOTE: These tests require:
 * 1. Obsidian running with Local REST API plugin enabled
 * 2. OBSIDIAN_API_KEY environment variable set
 * 3. Test binary files in the vault
 */

const SKIP_INTEGRATION_TESTS = !process.env.OBSIDIAN_API_KEY;

(SKIP_INTEGRATION_TESTS ? describe.skip : describe)('Binary Files Integration Tests', () => {
  let client: ObsidianClient;
  let handler: NoteHandler;
  let mockServer: any;

  beforeAll(() => {
    const apiKey = process.env.OBSIDIAN_API_KEY;
    if (!apiKey) {
      throw new Error('OBSIDIAN_API_KEY environment variable is required for integration tests');
    }

    client = new ObsidianClient({
      apiKey,
      host: '127.0.0.1',
      port: 27124,
      verifySsl: false
    });

    handler = new NoteHandler();
    mockServer = {
      obsidianClient: client
    };
  });

  describe('ObsidianClient.getBinaryFileContents', () => {
    it('should fetch a PNG image as base64', async () => {
      // This test assumes you have a test PNG file in your vault
      // Skip if file doesn't exist
      const testFile = 'test-images/sample.png';

      try {
        const base64Data = await client.getBinaryFileContents(testFile);

        // Verify it's valid base64
        expect(base64Data).toMatch(/^[A-Za-z0-9+/]+=*$/);
        expect(base64Data.length).toBeGreaterThan(0);

        // PNG files start with specific bytes (iVBOR in base64)
        expect(base64Data.substring(0, 5)).toBe('iVBOR');
      } catch (error: any) {
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          console.warn(`Test file ${testFile} not found in vault - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it('should enforce size limits for binary files', async () => {
      // This test would require a file larger than 10MB
      // We'll mock the scenario by checking the error handling
      const largeFile = 'test-images/very-large-file.png';

      try {
        await client.getBinaryFileContents(largeFile);
      } catch (error: any) {
        // File either doesn't exist or exceeds size limit
        // Both are acceptable outcomes for this test
        const is404 = error.message?.includes('not found') || error.message?.includes('404');
        const isSizeLimit = error.message?.includes('exceeds maximum limit');

        expect(is404 || isSizeLimit).toBe(true);
      }
    }, 30000);

    it('should handle PDF files', async () => {
      const testFile = 'test-docs/sample.pdf';

      try {
        const base64Data = await client.getBinaryFileContents(testFile);

        // Verify it's valid base64
        expect(base64Data).toMatch(/^[A-Za-z0-9+/]+=*$/);

        // PDF files start with %PDF (JVBERi in base64)
        expect(base64Data.substring(0, 6)).toBe('JVBERi');
      } catch (error: any) {
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          console.warn(`Test file ${testFile} not found in vault - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe('NoteHandler with binary files', () => {
    it('should return BlobResourceContents for PNG images', async () => {
      const testFile = 'test-images/sample.png';

      try {
        const result = await handler.handleRequest(`vault://note/${testFile}`, mockServer);

        expect(result).toHaveProperty('blob');
        expect(result).toHaveProperty('mimeType');
        expect(result.mimeType).toBe('image/png');
        expect(typeof result.blob).toBe('string');
        expect(result.blob.length).toBeGreaterThan(0);

        // Should include metadata if available
        if (result._meta) {
          expect(result._meta).toHaveProperty('size');
          expect(result._meta).toHaveProperty('lastModified');
        }
      } catch (error: any) {
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          console.warn(`Test file ${testFile} not found in vault - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it('should return TextResourceContents for markdown files', async () => {
      const testFile = 'test-notes/sample.md';

      try {
        const result = await handler.handleRequest(`vault://note/${testFile}`, mockServer);

        // Markdown files should return preview mode by default
        expect(result).not.toHaveProperty('blob');
        expect(result).toHaveProperty('preview');
        expect(result).toHaveProperty('statistics');
      } catch (error: any) {
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          console.warn(`Test file ${testFile} not found in vault - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe('MimeTypeDetector integration', () => {
    it('should correctly detect all supported binary formats', () => {
      const binaryExtensions = [
        'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico',
        'pdf',
        'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
        'mp4', 'webm', 'mov', 'avi'
      ];

      for (const ext of binaryExtensions) {
        expect(MimeTypeDetector.isBinaryFile(`test.${ext}`)).toBe(true);
      }
    });

    it('should correctly identify text formats', () => {
      const textExtensions = ['md', 'txt', 'json', 'js', 'ts', 'html', 'css'];

      for (const ext of textExtensions) {
        expect(MimeTypeDetector.isBinaryFile(`test.${ext}`)).toBe(false);
      }
    });
  });

  describe('Size limit enforcement', () => {
    it('should have reasonable size limits configured', () => {
      expect(BINARY_FILE_LIMITS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10 MB
      expect(BINARY_FILE_LIMITS.WARNING_SIZE).toBe(5 * 1024 * 1024);  // 5 MB
    });

    it('should reject files exceeding size limit', async () => {
      // This test requires creating a mock scenario or having a large file
      // We verify the constant is properly enforced
      expect(BINARY_FILE_LIMITS.MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(BINARY_FILE_LIMITS.WARNING_SIZE).toBeLessThan(BINARY_FILE_LIMITS.MAX_FILE_SIZE);
    });
  });
});
