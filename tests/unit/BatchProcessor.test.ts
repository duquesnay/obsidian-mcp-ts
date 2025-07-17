import { describe, it, expect, vi } from 'vitest';
import { BatchProcessor } from '../../src/utils/BatchProcessor.js';

describe('BatchProcessor', () => {
  describe('processBatch', () => {
    it('should process items in batches of specified size', async () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      const processor = vi.fn().mockImplementation(async (item: string) => item.toUpperCase());
      
      const results = await BatchProcessor.processBatch(items, processor, 2);
      
      expect(results).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(processor).toHaveBeenCalledTimes(5);
      expect(processor).toHaveBeenCalledWith('a');
      expect(processor).toHaveBeenCalledWith('b');
      expect(processor).toHaveBeenCalledWith('c');
      expect(processor).toHaveBeenCalledWith('d');
      expect(processor).toHaveBeenCalledWith('e');
    });

    it('should handle errors gracefully', async () => {
      const items = ['a', 'b', 'c'];
      const processor = vi.fn()
        .mockResolvedValueOnce('A')
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce('C');
      
      const results = await BatchProcessor.processBatch(items, processor, 2);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toBe('A');
      expect(results[1]).toBeInstanceOf(Error);
      expect(results[1].message).toBe('Processing failed');
      expect(results[2]).toBe('C');
    });

    it('should respect batch size', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      
      const processor = vi.fn().mockImplementation(async (item: number) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        currentConcurrent--;
        return item * 2;
      });
      
      await BatchProcessor.processBatch(items, processor, 3);
      
      expect(maxConcurrent).toBeLessThanOrEqual(3);
      expect(processor).toHaveBeenCalledTimes(10);
    });

    it('should handle empty array', async () => {
      const items: string[] = [];
      const processor = vi.fn();
      
      const results = await BatchProcessor.processBatch(items, processor);
      
      expect(results).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    it('should use default batch size of 5', async () => {
      const items = Array.from({ length: 12 }, (_, i) => i);
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      
      const processor = vi.fn().mockImplementation(async (item: number) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        currentConcurrent--;
        return item;
      });
      
      await BatchProcessor.processBatch(items, processor);
      
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });
  });

  describe('processBatchWithFormat', () => {
    it('should process and format results', async () => {
      const items = ['file1.md', 'file2.md', 'file3.md'];
      const processor = vi.fn().mockImplementation(async (file: string) => `Content of ${file}`);
      const formatter = vi.fn().mockImplementation((file: string, content: string) => {
        return `# ${file}\n\n${content}\n\n---\n\n`;
      });
      
      const result = await BatchProcessor.processBatchWithFormat(
        items,
        processor,
        formatter,
        2
      );
      
      expect(result).toBe(
        '# file1.md\n\nContent of file1.md\n\n---\n\n' +
        '# file2.md\n\nContent of file2.md\n\n---\n\n' +
        '# file3.md\n\nContent of file3.md\n\n---\n\n'
      );
    });

    it('should format errors', async () => {
      const items = ['file1.md', 'file2.md'];
      const processor = vi.fn()
        .mockResolvedValueOnce('Content 1')
        .mockRejectedValueOnce(new Error('File not found'));
      const formatter = vi.fn().mockImplementation((file: string, content: string | Error) => {
        if (content instanceof Error) {
          return `# ${file}\n\nError: ${content.message}\n\n---\n\n`;
        }
        return `# ${file}\n\n${content}\n\n---\n\n`;
      });
      
      const result = await BatchProcessor.processBatchWithFormat(
        items,
        processor,
        formatter
      );
      
      expect(result).toContain('Content 1');
      expect(result).toContain('Error: File not found');
    });
  });
});