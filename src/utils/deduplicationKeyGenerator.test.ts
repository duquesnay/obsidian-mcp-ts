import { describe, it, expect } from 'vitest';
import { DeduplicationKeyGenerator } from './deduplicationKeyGenerator';

describe('DeduplicationKeyGenerator', () => {
  describe('generateKey', () => {
    it('should generate consistent keys for the same inputs', () => {
      const key1 = DeduplicationKeyGenerator.generateKey('vault-list', {});
      const key2 = DeduplicationKeyGenerator.generateKey('vault-list', {});
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different request types', () => {
      const key1 = DeduplicationKeyGenerator.generateKey('vault-list', {});
      const key2 = DeduplicationKeyGenerator.generateKey('file-content', { filepath: 'test.md' });
      expect(key1).not.toBe(key2);
    });

    describe('vault-list requests', () => {
      it('should generate simple key for vault listing', () => {
        const key = DeduplicationKeyGenerator.generateKey('vault-list', {});
        expect(key).toBe('vault-list');
      });

      it('should handle vault listing with path parameter', () => {
        const key = DeduplicationKeyGenerator.generateKey('vault-list', { path: '/notes' });
        expect(key).toBe('vault-list:/notes');
      });
    });

    describe('file-content requests', () => {
      it('should include filepath in key', () => {
        const key = DeduplicationKeyGenerator.generateKey('file-content', {
          filepath: 'test.md'
        });
        expect(key).toBe('file-content:test.md');
      });

      it('should include format when specified', () => {
        const key = DeduplicationKeyGenerator.generateKey('file-content', {
          filepath: 'test.md',
          format: 'html'
        });
        expect(key).toBe('file-content:test.md:html');
      });

      it('should handle special characters in filepath', () => {
        const key = DeduplicationKeyGenerator.generateKey('file-content', {
          filepath: 'path/with spaces/and:colons.md'
        });
        expect(key).toBe('file-content:path/with spaces/and:colons.md');
      });

      it('should encode problematic characters in filepath', () => {
        const key = DeduplicationKeyGenerator.generateKey('file-content', {
          filepath: 'path|with|pipes.md'
        });
        expect(key).toBe('file-content:path%7Cwith%7Cpipes.md');
      });
    });

    describe('search requests', () => {
      it('should serialize simple search parameters', () => {
        const key = DeduplicationKeyGenerator.generateKey('search', {
          query: 'test search'
        });
        expect(key).toBe('search:query=test search');
      });

      it('should serialize multiple search parameters in consistent order', () => {
        const key1 = DeduplicationKeyGenerator.generateKey('search', {
          query: 'test',
          limit: 10,
          offset: 20
        });
        const key2 = DeduplicationKeyGenerator.generateKey('search', {
          offset: 20,
          query: 'test',
          limit: 10
        });
        expect(key1).toBe(key2);
        expect(key1).toBe('search:limit=10&offset=20&query=test');
      });

      it('should handle complex search filters', () => {
        const key = DeduplicationKeyGenerator.generateKey('search', {
          query: 'test',
          filters: {
            tags: ['tag1', 'tag2'],
            frontmatter: { status: 'active' }
          }
        });
        expect(key).toContain('search:');
        expect(key).toContain('query=test');
        expect(key).toContain('filters=');
      });

      it('should handle undefined and null values', () => {
        const key = DeduplicationKeyGenerator.generateKey('search', {
          query: 'test',
          limit: undefined,
          offset: null
        });
        expect(key).toBe('search:query=test');
      });
    });

    describe('batch requests', () => {
      it('should generate hash for batch operations', () => {
        const key = DeduplicationKeyGenerator.generateKey('batch', {
          operation: 'read',
          items: ['file1.md', 'file2.md', 'file3.md']
        });
        expect(key).toMatch(/^batch:read:[a-f0-9]{8}$/);
      });

      it('should generate same hash for same items in different order', () => {
        const key1 = DeduplicationKeyGenerator.generateKey('batch', {
          operation: 'read',
          items: ['file1.md', 'file2.md', 'file3.md']
        });
        const key2 = DeduplicationKeyGenerator.generateKey('batch', {
          operation: 'read',
          items: ['file3.md', 'file1.md', 'file2.md']
        });
        expect(key1).toBe(key2);
      });

      it('should generate different hashes for different items', () => {
        const key1 = DeduplicationKeyGenerator.generateKey('batch', {
          operation: 'read',
          items: ['file1.md', 'file2.md']
        });
        const key2 = DeduplicationKeyGenerator.generateKey('batch', {
          operation: 'read',
          items: ['file1.md', 'file3.md']
        });
        expect(key1).not.toBe(key2);
      });

      it('should handle batch operations with complex items', () => {
        const key = DeduplicationKeyGenerator.generateKey('batch', {
          operation: 'update',
          items: [
            { file: 'file1.md', content: 'new content' },
            { file: 'file2.md', content: 'other content' }
          ]
        });
        expect(key).toMatch(/^batch:update:[a-f0-9]{8}$/);
      });
    });

    describe('custom request types', () => {
      it('should handle unknown request types gracefully', () => {
        const key = DeduplicationKeyGenerator.generateKey('custom-type', {
          param1: 'value1',
          param2: 'value2'
        });
        expect(key).toBe('custom-type:param1=value1&param2=value2');
      });
    });

    describe('edge cases', () => {
      it('should handle empty parameters', () => {
        const key = DeduplicationKeyGenerator.generateKey('test-type', {});
        expect(key).toBe('test-type');
      });

      it('should handle arrays in parameters', () => {
        const key = DeduplicationKeyGenerator.generateKey('test-type', {
          tags: ['tag1', 'tag2', 'tag3']
        });
        expect(key).toBe('test-type:tags=tag1,tag2,tag3');
      });

      it('should handle nested objects', () => {
        const key = DeduplicationKeyGenerator.generateKey('test-type', {
          config: {
            enabled: true,
            timeout: 5000
          }
        });
        expect(key).toContain('test-type:config=');
      });

      it('should be collision-resistant for similar inputs', () => {
        const key1 = DeduplicationKeyGenerator.generateKey('search', {
          query: 'ab'
        });
        const key2 = DeduplicationKeyGenerator.generateKey('search', {
          query: 'a',
          b: ''
        });
        expect(key1).not.toBe(key2);
      });
    });
  });

  describe('generateBatchHash', () => {
    it('should generate consistent hash for same items', () => {
      const items = ['a', 'b', 'c'];
      const hash1 = DeduplicationKeyGenerator.generateBatchHash(items);
      const hash2 = DeduplicationKeyGenerator.generateBatchHash(items);
      expect(hash1).toBe(hash2);
    });

    it('should generate same hash for items in different order', () => {
      const hash1 = DeduplicationKeyGenerator.generateBatchHash(['a', 'b', 'c']);
      const hash2 = DeduplicationKeyGenerator.generateBatchHash(['c', 'a', 'b']);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different items', () => {
      const hash1 = DeduplicationKeyGenerator.generateBatchHash(['a', 'b', 'c']);
      const hash2 = DeduplicationKeyGenerator.generateBatchHash(['a', 'b', 'd']);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle complex objects', () => {
      const items = [
        { id: 1, name: 'test' },
        { id: 2, name: 'another' }
      ];
      const hash = DeduplicationKeyGenerator.generateBatchHash(items);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });
  });
});