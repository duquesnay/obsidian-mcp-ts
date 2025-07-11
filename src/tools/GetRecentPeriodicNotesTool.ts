import { BaseTool } from './base.js';

export class GetRecentPeriodicNotesTool extends BaseTool {
  name = 'obsidian_get_recent_periodic_notes';
  description = 'Get most recent periodic notes for the specified period type.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      period: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        description: 'The type of periodic notes to retrieve.'
      },
      days: {
        type: 'integer',
        description: 'Number of days to look back for notes. Default varies by period type.'
      }
    },
    required: ['period']
  };

  async executeTyped(args: { 
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    days?: number;
  }): Promise<any> {
    try {
      if (!args.period) {
        throw new Error('period argument missing in arguments');
      }
      
      const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      if (!validPeriods.includes(args.period)) {
        throw new Error(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
      }
      
      const client = this.getClient();
      const result = await client.getRecentPeriodicNotes(args.period, args.days);
      
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}