import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestDeduplicator } from './RequestDeduplicator';

// Type safety tests for RequestDeduplicator
describe('RequestDeduplicator type safety', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator();
  });

  it('should properly type dedupe return values', async () => {
    // String request
    const stringResult = await deduplicator.dedupe('string-key', async () => {
      return 'test-string';
    });
    // TypeScript should know this is a string
    const upperCase: string = stringResult.toUpperCase();
    expect(upperCase).toBe('TEST-STRING');
  });

  it('should handle number return types', async () => {
    // Number request  
    const numberResult = await deduplicator.dedupe('number-key', async () => {
      return 42;
    });
    // TypeScript should know this is a number
    const doubled: number = numberResult * 2;
    expect(doubled).toBe(84);
  });

  it('should handle object return types', async () => {
    interface User {
      id: number;
      name: string;
    }
    
    const userResult = await deduplicator.dedupe('user-key', async (): Promise<User> => {
      return { id: 1, name: 'Test User' };
    });
    // TypeScript should know this is a User
    const userName: string = userResult.name;
    expect(userName).toBe('Test User');
  });

  it('should handle array return types', async () => {
    const arrayResult = await deduplicator.dedupe('array-key', async () => {
      return [1, 2, 3];
    });
    // TypeScript should know this is a number array
    const sum: number = arrayResult.reduce((a, b) => a + b, 0);
    expect(sum).toBe(6);
  });

  it('should handle void return types', async () => {
    let sideEffect = false;
    
    await deduplicator.dedupe('void-key', async (): Promise<void> => {
      sideEffect = true;
    });
    
    expect(sideEffect).toBe(true);
  });

  it('should properly deduplicate concurrent requests of the same type', async () => {
    let callCount = 0;
    const expensiveOperation = async (): Promise<string> => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return `result-${callCount}`;
    };

    // Start two concurrent requests
    const promise1 = deduplicator.dedupe('same-key', expensiveOperation);
    const promise2 = deduplicator.dedupe('same-key', expensiveOperation);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(callCount).toBe(1); // Should only call once
    expect(result1).toBe('result-1');
    expect(result2).toBe('result-1'); // Same result
  });
});