import { describe, it, expect } from 'vitest';
import { OBSIDIAN_DEFAULTS, TIMEOUTS } from './constants.js';

describe('Timeout Constants', () => {
  it('should export TIMEOUTS object with all required timeout values', () => {
    expect(TIMEOUTS).toBeDefined();
    expect(TIMEOUTS.DEFAULT_REQUEST).toBe(6000);
    expect(TIMEOUTS.DIRECTORY_OPERATIONS).toBe(120000);
    expect(TIMEOUTS.SEARCH_OPERATIONS).toBe(30000);
  });

  it('should have meaningful timeout values', () => {
    // Default should be reasonable for most operations
    expect(TIMEOUTS.DEFAULT_REQUEST).toBeGreaterThanOrEqual(5000);
    expect(TIMEOUTS.DEFAULT_REQUEST).toBeLessThanOrEqual(10000);
    
    // Directory operations can be slow
    expect(TIMEOUTS.DIRECTORY_OPERATIONS).toBeGreaterThanOrEqual(60000);
    
    // Search operations need more time than default
    expect(TIMEOUTS.SEARCH_OPERATIONS).toBeGreaterThan(TIMEOUTS.DEFAULT_REQUEST);
  });

  it('should have consistent naming convention', () => {
    const timeoutKeys = Object.keys(TIMEOUTS);
    timeoutKeys.forEach(key => {
      // All timeout keys should be uppercase with underscores
      expect(key).toMatch(/^[A-Z_]+$/);
      // All values should be numbers
      expect(typeof TIMEOUTS[key as keyof typeof TIMEOUTS]).toBe('number');
    });
  });
});