import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { validateRequiredArgs, validatePeriod, PERIOD_SCHEMA } from '../utils/validation.js';
import { GetRecentPeriodicNotesArgs } from './types/GetRecentPeriodicNotesArgs.js';

export class GetRecentPeriodicNotesTool extends BaseTool<GetRecentPeriodicNotesArgs> {
  name = 'obsidian_get_recent_periodic_notes';
  description = 'Get most recent periodic notes for the specified period type.';
  
  metadata: ToolMetadata = {
    category: 'periodic-notes',
    keywords: ['periodic', 'recent', 'daily', 'weekly', 'monthly', 'history'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      period: PERIOD_SCHEMA,
      days: {
        type: 'integer',
        description: 'Number of days to look back for notes. Default varies by period type.'
      }
    },
    required: ['period']
  };

  async executeTyped(args: GetRecentPeriodicNotesArgs): Promise<ToolResponse> {
    try {
      // Validate required arguments
      validateRequiredArgs(args, ['period']);
      validatePeriod(args.period);
      
      const client = this.getClient();
      const periodicNotesClient = client.getPeriodicNotesClient();
      const result = await periodicNotesClient.getRecentPeriodicNotes(args.period, args.days);
      
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}