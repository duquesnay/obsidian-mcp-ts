import { Resource, ResourceHandler } from './types.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/types.js';

interface ResourceEntry {
  resource: Resource;
  handler: ResourceHandler;
  pattern?: RegExp;
}

export class ResourceRegistry {
  private resources: ResourceEntry[] = [];
  private resourceTemplates: ResourceTemplate[] = [];
  
  registerResource(resource: Resource, handler: ResourceHandler): void {
    const entry: ResourceEntry = {
      resource,
      handler
    };
    
    // If URI contains any parameters (generic pattern), create a pattern for matching
    const paramMatch = resource.uri.match(/\{[^}]+\}/);
    if (paramMatch) {
      // Convert vault://note/{path} or vault://daily/{date} or any vault://resource/{param} to a regex
      const prefix = resource.uri.substring(0, resource.uri.indexOf(paramMatch[0]));
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
  
  extractParameter(template: string, uri: string, paramName: string): string {
    const paramPlaceholder = `{${paramName}}`;
    
    if (!template.includes(paramPlaceholder)) {
      return '';
    }
    
    const prefix = template.substring(0, template.indexOf(paramPlaceholder));
    const suffix = template.substring(template.indexOf(paramPlaceholder) + paramPlaceholder.length);
    
    // Handle edge cases - if URI matches just the prefix or prefix with trailing slash
    if (uri === prefix.slice(0, -1) || uri === prefix) {
      return '';
    }
    
    // Extract the parameter value between prefix and suffix
    if (!uri.startsWith(prefix)) {
      return '';
    }
    
    let paramValue = uri.substring(prefix.length);
    
    // Remove suffix if present
    if (suffix && paramValue.endsWith(suffix)) {
      paramValue = paramValue.substring(0, paramValue.length - suffix.length);
    }
    
    return paramValue;
  }
  
  registerResourceTemplate(template: ResourceTemplate): void {
    // Check if template already exists to avoid duplicates
    const exists = this.resourceTemplates.some(t => t.uriTemplate === template.uriTemplate);
    if (!exists) {
      this.resourceTemplates.push(template);
    }
  }
  
  listResourceTemplates(): ResourceTemplate[] {
    return [...this.resourceTemplates];
  }
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}