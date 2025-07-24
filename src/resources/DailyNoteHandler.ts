import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { ResourceValidationUtil } from '../utils/ResourceValidationUtil.js';

export class DailyNoteHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const dateParam = this.extractDateParameter(uri);
    const date = this.validateAndNormalizeDate(dateParam);
    
    const client = this.getObsidianClient(server);
    
    try {
      // Get the daily note from Obsidian
      const noteData = await client.getPeriodicNote('daily');
      
      // For now, we're getting the current daily note
      // In the future, we might need to handle specific dates differently
      // if the API supports it
      
      // Return the content directly
      return noteData.content || '';
    } catch (error: unknown) {
      // Handle 404 errors with special format for compatibility
      if (error?.response?.status === 404) {
        throw new Error(`Resource not found: Daily note at ${date}`);
      }
      throw error;
    }
  }
  
  private extractDateParameter(uri: string): string {
    const prefix = 'vault://daily/';
    const dateParam = ResourceValidationUtil.extractUriParameter(uri, prefix, 'date');
    return dateParam || 'today';
  }
  
  private validateAndNormalizeDate(dateParam: string): string {
    // Handle special case for 'today'
    if (dateParam === 'today') {
      return new Date().toISOString().split('T')[0];
    }
    
    // Validate date format
    if (!ResourceValidationUtil.validateDateFormat(dateParam)) {
      throw new Error('Invalid date format: Expected YYYY-MM-DD or "today"');
    }
    
    return dateParam;
  }
}