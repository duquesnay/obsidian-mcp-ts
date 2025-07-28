import { describe, it, expect, beforeEach } from 'vitest';
import { GetRecentChangesTool } from '../../src/tools/GetRecentChangesTool.js';

describe('GetRecentChangesTool', () => {
  let tool: GetRecentChangesTool;

  beforeEach(() => {
    tool = new GetRecentChangesTool();
  });

  describe('description', () => {
    it('should mention the vault://recent resource alternative with cache information', () => {
      const description = tool.description;
      
      // Check that it mentions the vault://recent resource
      expect(description.toLowerCase()).toContain('vault://recent');
      
      // Check that it mentions the cache duration
      expect(description).toMatch(/30\s*second|30s/i);
      
      // Check that it mentions performance benefit
      expect(description.toLowerCase()).toContain('performance');
    });
  });
});