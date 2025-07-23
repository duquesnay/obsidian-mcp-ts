import { BaseResourceHandler } from './BaseResourceHandler.js';

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
    } catch (error: any) {
      // Handle specific error for missing daily note
      if (error?.response?.status === 404) {
        throw new Error(`Daily note not found: ${date}`);
      }
      throw error;
    }
  }
  
  private extractDateParameter(uri: string): string {
    const prefix = 'vault://daily/';
    
    // Handle edge cases
    if (uri === prefix.slice(0, -1) || uri === prefix) {
      return 'today';
    }
    
    // Extract date parameter and remove trailing slash if present
    let dateParam = uri.substring(prefix.length);
    if (dateParam.endsWith('/')) {
      dateParam = dateParam.slice(0, -1);
    }
    
    return dateParam || 'today';
  }
  
  private validateAndNormalizeDate(dateParam: string): string {
    // Handle special case for 'today'
    if (dateParam === 'today') {
      return new Date().toISOString().split('T')[0];
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD or "today"');
    }
    
    // Validate that it's a real date
    const date = new Date(dateParam + 'T00:00:00');
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD or "today"');
    }
    
    return dateParam;
  }
}