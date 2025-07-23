import { BaseResourceHandler } from './BaseResourceHandler.js';

export class TagNotesHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const tagName = this.extractTagParameter(uri);
    
    if (!tagName) {
      throw new Error('Tag name is required');
    }
    
    const client = this.getObsidianClient(server);
    
    try {
      // Get files with the specified tag
      const files = await client.getFilesByTag(tagName);
      
      // Return the data in a consistent format
      return {
        tag: tagName,
        fileCount: files.length,
        files: files
      };
    } catch (error: any) {
      // Re-throw the error as-is for now
      throw error;
    }
  }
  
  private extractTagParameter(uri: string): string {
    const prefix = 'vault://tag/';
    
    // Handle edge cases
    if (uri === prefix || uri === prefix.slice(0, -1)) {
      return '';
    }
    
    // Extract tag parameter and remove trailing slash if present
    let tagParam = uri.substring(prefix.length);
    if (tagParam.endsWith('/')) {
      tagParam = tagParam.slice(0, -1);
    }
    
    // Handle URL decoding
    tagParam = decodeURIComponent(tagParam);
    
    // Remove # prefix if present (normalize the tag)
    if (tagParam.startsWith('#')) {
      tagParam = tagParam.substring(1);
    }
    
    return tagParam;
  }
}