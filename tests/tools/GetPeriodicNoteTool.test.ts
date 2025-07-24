import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPeriodicNoteTool } from '../../src/tools/GetPeriodicNoteTool.js';
import { ValidationError } from '../../src/utils/validation.js';

describe('GetPeriodicNoteTool', () => {
  let tool: GetPeriodicNoteTool;
  let mockClient: any;

  beforeEach(() => {
    tool = new GetPeriodicNoteTool();
    const mockPeriodicNotesClient = {
      getPeriodicNote: vi.fn()
    };
    mockClient = {
      getPeriodicNotesClient: vi.fn().mockReturnValue(mockPeriodicNotesClient)
    };
    // @ts-ignore - accessing protected method for testing
    tool.getClient = () => mockClient;
  });

  describe('validation', () => {
    it('should throw ValidationError when period is missing', async () => {
      const result = await tool.executeTyped({ period: '' as any });
      const response = JSON.parse(result.text);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('period argument missing');
    });

    it('should throw ValidationError when period is invalid', async () => {
      const result = await tool.executeTyped({ period: 'invalid' as any });
      const response = JSON.parse(result.text);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid period');
      expect(response.error).toContain('daily, weekly, monthly, quarterly, yearly');
    });
  });

  describe('successful execution', () => {
    it('should call client with correct period', async () => {
      const mockResult = { 
        content: 'Daily note content',
        path: 'Daily/2025-01-24.md'
      };
      mockClient.getPeriodicNotesClient().getPeriodicNote.mockResolvedValue(mockResult);

      const result = await tool.executeTyped({ period: 'daily' });
      
      expect(mockClient.getPeriodicNotesClient().getPeriodicNote).toHaveBeenCalledWith('daily');
      expect(result.type).toBe('text');
      
      const response = JSON.parse(result.text);
      expect(response).toEqual(mockResult);
    });

    it('should accept all valid periods', async () => {
      const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
      
      for (const period of periods) {
        mockClient.getPeriodicNotesClient().getPeriodicNote.mockResolvedValue({ path: `${period}.md` });
        
        const result = await tool.executeTyped({ period });
        const response = JSON.parse(result.text);
        
        expect(response.path).toBe(`${period}.md`);
      }
    });
  });

  describe('schema', () => {
    it('should use PERIOD_SCHEMA in inputSchema', () => {
      expect(tool.inputSchema.properties.period).toMatchObject({
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
      });
    });
  });
});