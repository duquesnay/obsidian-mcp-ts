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
    
    // If URI contains parameters, create a pattern for matching
    if (resource.uri.includes('{path}') || resource.uri.includes('{date}') || resource.uri.includes('{tagname}')) {
      // Convert vault://note/{path} or vault://daily/{date} or vault://tag/{tagname} to a regex that matches anything after prefix
      const paramMatch = resource.uri.match(/\{[^}]+\}/);
      if (paramMatch) {
        const prefix = resource.uri.substring(0, resource.uri.indexOf(paramMatch[0]));
        entry.pattern = new RegExp(`^${this.escapeRegex(prefix)}.*$`);
      }
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
        const paramMatch = template.match(/\{[^}]+\}/);
        if (paramMatch) {
          const prefix = template.substring(0, template.indexOf(paramMatch[0]));
          
          // Match if URI starts with prefix (including edge cases like vault://folder)
          if (uri === prefix.slice(0, -1) || uri.startsWith(prefix)) {
            return entry.handler;
          }
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