import { describe, it, expect } from 'vitest';
import { DeduplicationKeyGenerator } from './deduplicationKeyGenerator';

describe('DeduplicationKeyGenerator', () => {
  describe('serializeValue type safety', () => {
    it('should handle string values', () => {
      const generator = DeduplicationKeyGenerator as any;
      expect(generator.serializeValue('test')).toBe('test');
    });

    it('should handle number values', () => {
      const generator = DeduplicationKeyGenerator as any;
      expect(generator.serializeValue(123)).toBe('123');
    });

    it('should handle boolean values', () => {
      const generator = DeduplicationKeyGenerator as any;
      expect(generator.serializeValue(true)).toBe('true');
      expect(generator.serializeValue(false)).toBe('false');
    });

    it('should handle array values', () => {
      const generator = DeduplicationKeyGenerator as any;
      expect(generator.serializeValue(['a', 'b', 'c'])).toBe('a,b,c');
      expect(generator.serializeValue([1, 2, 3])).toBe('1,2,3');
    });

    it('should handle object values', () => {
      const generator = DeduplicationKeyGenerator as any;
      const obj = { key: 'value', num: 42 };
      expect(generator.serializeValue(obj)).toBe(JSON.stringify(obj));
    });

    it('should handle null values', () => {
      const generator = DeduplicationKeyGenerator as any;
      expect(generator.serializeValue(null)).toBe('null');
    });

    it('should handle undefined values', () => {
      const generator = DeduplicationKeyGenerator as any;
      expect(generator.serializeValue(undefined)).toBe('undefined');
    });
  });

  describe('generateBatchHash type safety', () => {
    it('should handle array of strings', () => {
      const items = ['item1', 'item2', 'item3'];
      const hash = DeduplicationKeyGenerator.generateBatchHash(items);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle array of objects', () => {
      const items = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }];
      const hash = DeduplicationKeyGenerator.generateBatchHash(items);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle mixed type arrays', () => {
      const items = ['string', 123, { key: 'value' }, true];
      const hash = DeduplicationKeyGenerator.generateBatchHash(items);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate consistent hash for same items in different order', () => {
      const items1 = ['a', 'b', 'c'];
      const items2 = ['c', 'a', 'b'];
      const hash1 = DeduplicationKeyGenerator.generateBatchHash(items1);
      const hash2 = DeduplicationKeyGenerator.generateBatchHash(items2);
      expect(hash1).toBe(hash2);
    });
  });
});