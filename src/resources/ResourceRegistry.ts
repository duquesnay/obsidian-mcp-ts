import { Resource, ResourceHandler } from './types.js';

interface ResourceEntry {
  resource: Resource;
  handler: ResourceHandler;
  pattern?: RegExp;
}

export class ResourceRegistry {
  private resources: ResourceEntry[] = [];
  
  registerResource(resource: Resource, handler: ResourceHandler): void {
    const entry: ResourceEntry = {
      resource,
      handler
    };
    
    // If URI contains {path}, create a pattern for matching
    if (resource.uri.includes('{path}')) {
      // Convert vault://note/{path} to a regex that matches vault://note/anything
      const prefix = resource.uri.substring(0, resource.uri.indexOf('{path}'));
      entry.pattern = new RegExp(`^${this.escapeRegex(prefix)}.*$`);
    }
    
    this.resources.push(entry);
  }
  
  listResources(): Resource[] {
    return this.resources.map(entry => entry.resource);
  }
  
  getHandler(uri: string): ResourceHandler | null {
    // First check for exact matches
    for (const entry of this.resources) {
      if (!entry.pattern && entry.resource.uri === uri) {
        return entry.handler;
      }
    }
    
    // Then check for pattern matches
    for (const entry of this.resources) {
      if (entry.pattern) {
        // Special handling for dynamic resources
        const template = entry.resource.uri;
        const prefix = template.substring(0, template.indexOf('{path}'));
        
        // Match if URI starts with prefix (including edge cases like vault://folder)
        if (uri === prefix.slice(0, -1) || uri.startsWith(prefix)) {
          return entry.handler;
        }
      }
    }
    
    return null;
  }
  
  extractPathParameter(template: string, uri: string): string {
    if (!template.includes('{path}')) {
      return '';
    }
    
    const prefix = template.substring(0, template.indexOf('{path}'));
    
    // Handle edge cases for folders
    if (uri === prefix.slice(0, -1) || uri === prefix) {
      return '';
    }
    
    return uri.substring(prefix.length);
  }
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}