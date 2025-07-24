import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Resource Documentation', () => {
  const docsPath = join(process.cwd(), 'docs', 'RESOURCES.md');
  const readmePath = join(process.cwd(), 'README.md');
  const examplePath = join(process.cwd(), 'examples', 'resource-usage.ts');

  it('should have RESOURCES.md documentation file', () => {
    expect(existsSync(docsPath)).toBe(true);
  });

  it('should have comprehensive content in RESOURCES.md', () => {
    const content = readFileSync(docsPath, 'utf-8');
    
    // Check for main sections
    expect(content).toContain('# MCP Resources Guide');
    expect(content).toContain('## Overview');
    expect(content).toContain('## Available Resources');
    expect(content).toContain('## URI Format and Parameters');
    expect(content).toContain('## Usage Examples');
    expect(content).toContain('## Common Use Cases');
    expect(content).toContain('## Integration Guide');
    expect(content).toContain('## Troubleshooting');
    expect(content).toContain('## Best Practices');
    
    // Check for all 9 resources
    const resources = [
      'vault://tags',
      'vault://stats',
      'vault://recent',
      'vault://structure',
      'vault://note/{path}',
      'vault://folder/{path}',
      'vault://daily/{date}',
      'vault://tag/{tagname}',
      'vault://search/{query}'
    ];
    
    resources.forEach(resource => {
      expect(content).toContain(resource);
    });
    
    // Check for important topics
    expect(content).toContain('Resources vs Tools');
    expect(content).toContain('Cache Behavior');
    expect(content).toContain('Parameter Encoding');
    expect(content).toContain('Claude Desktop Configuration');
    expect(content).toContain('Error Handling');
    expect(content).toContain('Performance Optimization');
  });

  it('should have updated README.md with resource information', () => {
    const content = readFileSync(readmePath, 'utf-8');
    
    // Check for resources section
    expect(content).toContain('MCP Resources Available');
    expect(content).toContain('Static Resources (Cached 5min)');
    expect(content).toContain('Dynamic Resources (Cached 1-2min)');
    
    // Check for link to detailed documentation
    expect(content).toContain('[Complete Resources Guide](docs/RESOURCES.md)');
    
    // Check all resources are listed (README uses example URIs, not templates)
    expect(content).toContain('vault://search/meeting%20notes');
    expect(content).toContain('Search vault for content');
  });

  it('should have resource usage examples', () => {
    expect(existsSync(examplePath)).toBe(true);
    
    const content = readFileSync(examplePath, 'utf-8');
    
    // Check for example content
    expect(content).toContain('Example: Using MCP Resources with Obsidian');
    expect(content).toContain('client.listResources()');
    expect(content).toContain('client.readResource');
    expect(content).toContain('vault://stats');
    expect(content).toContain('vault://tags');
    expect(content).toContain('vault://search');
    
    // Check for different usage patterns
    expect(content).toContain('Error handling');
    expect(content).toContain('Batch resource reading');
    expect(content).toContain('Progressive resource loading');
  });

  it('should have proper JSDoc documentation in source files', () => {
    const indexPath = join(process.cwd(), 'src', 'resources', 'index.ts');
    const content = readFileSync(indexPath, 'utf-8');
    
    // Check for module documentation
    expect(content).toContain('* MCP Resources for Obsidian');
    expect(content).toContain('* @module resources');
    expect(content).toContain('* Available resources:');
    expect(content).toContain('* @see {@link');
  });

  it('should document all resource handlers', () => {
    const content = readFileSync(docsPath, 'utf-8');
    
    // Check each resource has proper documentation
    const resourceDocs = [
      { name: 'Vault Tags', description: 'Returns all unique tags' },
      { name: 'Vault Statistics', description: 'Provides file and note counts' },
      { name: 'Recent Changes', description: 'Lists recently modified notes' },
      { name: 'Vault Structure', description: 'Returns the complete hierarchical structure' },
      { name: 'Individual Notes', description: 'Retrieves the content of a specific note' },
      { name: 'Folder Contents', description: 'Lists all files and subfolders' },
      { name: 'Daily Notes', description: 'Accesses daily notes by date' },
      { name: 'Notes by Tag', description: 'Finds all notes containing a specific tag' },
      { name: 'Search Results', description: 'Searches vault content and returns results' }
    ];
    
    resourceDocs.forEach(doc => {
      expect(content).toContain(doc.name);
      expect(content).toContain(doc.description);
    });
  });

  it('should include response format examples', () => {
    const content = readFileSync(docsPath, 'utf-8');
    
    // Check for JSON response examples
    expect(content).toContain('**Response format:**');
    expect(content).toContain('```json');
    expect(content).toContain('"tags":');
    expect(content).toContain('"totalNotes":');
    expect(content).toContain('"files":');
  });

  it('should cover integration scenarios', () => {
    const content = readFileSync(docsPath, 'utf-8');
    
    // Check for different integration patterns
    expect(content).toContain('Browse and Read Workflow');
    expect(content).toContain('Tag-Based Workflow');
    expect(content).toContain('Daily Review Workflow');
    expect(content).toContain('Context Preloading');
    expect(content).toContain('Progressive Enhancement');
  });
});