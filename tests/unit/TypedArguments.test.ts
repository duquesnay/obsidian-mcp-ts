import { describe, it, expect } from 'vitest';
import { GetFileContentsArgs } from '../../src/tools/types/GetFileContentsArgs.js';
import { AppendContentArgs } from '../../src/tools/types/AppendContentArgs.js';
import { DeleteFileArgs } from '../../src/tools/types/DeleteFileArgs.js';
import { SimpleSearchArgs } from '../../src/tools/types/SimpleSearchArgs.js';

describe('Typed Arguments', () => {
  describe('GetFileContentsArgs', () => {
    it('should have required filepath property', () => {
      const args: GetFileContentsArgs = {
        filepath: 'notes/example.md'
      };
      
      expect(args.filepath).toBe('notes/example.md');
      expect(args.format).toBeUndefined();
    });

    it('should allow optional format property', () => {
      const args: GetFileContentsArgs = {
        filepath: 'notes/example.md',
        format: 'content'
      };
      
      expect(args.format).toBe('content');
    });
  });

  describe('AppendContentArgs', () => {
    it('should have required properties', () => {
      const args: AppendContentArgs = {
        filepath: 'notes/journal.md',
        content: 'New content'
      };
      
      expect(args.filepath).toBe('notes/journal.md');
      expect(args.content).toBe('New content');
      expect(args.createIfNotExists).toBeUndefined();
    });

    it('should allow optional createIfNotExists', () => {
      const args: AppendContentArgs = {
        filepath: 'notes/journal.md',
        content: 'New content',
        createIfNotExists: false
      };
      
      expect(args.createIfNotExists).toBe(false);
    });
  });

  describe('DeleteFileArgs', () => {
    it('should have required filepath property', () => {
      const args: DeleteFileArgs = {
        filepath: 'notes/to-delete.md'
      };
      
      expect(args.filepath).toBe('notes/to-delete.md');
    });
  });

  describe('SimpleSearchArgs', () => {
    it('should have required query property', () => {
      const args: SimpleSearchArgs = {
        query: 'search term'
      };
      
      expect(args.query).toBe('search term');
      expect(args.contextLength).toBeUndefined();
      expect(args.limit).toBeUndefined();
      expect(args.offset).toBeUndefined();
    });

    it('should allow optional properties', () => {
      const args: SimpleSearchArgs = {
        query: 'search term',
        contextLength: 50,
        limit: 20,
        offset: 10
      };
      
      expect(args.contextLength).toBe(50);
      expect(args.limit).toBe(20);
      expect(args.offset).toBe(10);
    });
  });
});