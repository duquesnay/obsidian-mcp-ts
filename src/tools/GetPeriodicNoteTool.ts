import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { validateRequiredArgs, validatePeriod, PERIOD_SCHEMA, PeriodType } from '../utils/validation.js';

export class GetPeriodicNoteTool extends BaseTool {
  name = 'obsidian_get_periodic_note';
  description = 'Get current periodic note for the specified period (daily, weekly, monthly, quarterly, yearly).';
  
  metadata: ToolMetadata = {
    category: 'periodic-notes',
    keywords: ['periodic', 'daily', 'weekly', 'monthly', 'journal', 'note'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      period: PERIOD_SCHEMA
    },
    required: ['period']
  };

  async executeTyped(args: { period: PeriodType }): Promise<ToolResponse> {
    try {
      validateRequiredArgs(args, ['period']);
      validatePeriod(args.period);
      
      const client = this.getClient();
      const result = await client.getPeriodicNote(args.period);
      
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}