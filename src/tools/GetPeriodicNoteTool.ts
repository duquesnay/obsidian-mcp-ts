import { BaseTool } from './base.js';

export class GetPeriodicNoteTool extends BaseTool {
  name = 'obsidian_get_periodic_note';
  description = 'Get current periodic note for the specified period (daily, weekly, monthly, quarterly, yearly).';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      period: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        description: 'The type of periodic note to retrieve.'
      }
    },
    required: ['period']
  };

  async execute(args: { period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' }): Promise<any> {
    try {
      if (!args.period) {
        throw new Error('period argument missing in arguments');
      }
      
      const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      if (!validPeriods.includes(args.period)) {
        throw new Error(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
      }
      
      const client = this.getClient();
      const result = await client.getPeriodicNote(args.period);
      
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}