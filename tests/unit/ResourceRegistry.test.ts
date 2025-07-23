import { describe, it, expect } from 'vitest';
import { ResourceRegistry } from '../../src/resources/ResourceRegistry.js';
import { Resource, ResourceHandler } from '../../src/resources/types.js';

describe('ResourceRegistry', () => {
  describe('registerResource', () => {
    it('should register a static resource', () => {
      const registry = new ResourceRegistry();
      const resource: Resource = {
        uri: 'vault://tags',
        name: 'Vault Tags',
        description: 'All tags in the vault with usage counts',
        mimeType: 'application/json'
      };
      
      const handler: ResourceHandler = async () => ({
        contents: [{
          uri: 'vault://tags',
          mimeType: 'application/json',
          text: JSON.stringify({ tags: [] })
        }]
      });
      
      registry.registerResource(resource, handler);
      
      // Should be able to list the resource
      const resources = registry.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0]).toEqual(resource);
    });
    
    it('should register a dynamic resource with pattern', () => {
      const registry = new ResourceRegistry();
      const resource: Resource = {
        uri: 'vault://note/{path}',
        name: 'Note',
        description: 'Individual note by path',
        mimeType: 'text/markdown'
      };
      
      const handler: ResourceHandler = async (uri: string) => {
        const path = uri.substring('vault://note/'.length);
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: `Content of ${path}`
          }]
        };
      };
      
      registry.registerResource(resource, handler);
      
      const resources = registry.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('vault://note/{path}');
    });
  });
  
  describe('getHandler', () => {
    it('should return handler for exact match', () => {
      const registry = new ResourceRegistry();
      const handler: ResourceHandler = async () => ({
        contents: [{
          uri: 'vault://tags',
          mimeType: 'application/json',
          text: '{}'
        }]
      });
      
      registry.registerResource({
        uri: 'vault://tags',
        name: 'Tags',
        description: 'Tags',
        mimeType: 'application/json'
      }, handler);
      
      const foundHandler = registry.getHandler('vault://tags');
      expect(foundHandler).toBe(handler);
    });
    
    it('should return handler for dynamic pattern match', () => {
      const registry = new ResourceRegistry();
      const handler: ResourceHandler = async () => ({
        contents: [{
          uri: 'vault://note/test.md',
          mimeType: 'text/markdown',
          text: 'content'
        }]
      });
      
      registry.registerResource({
        uri: 'vault://note/{path}',
        name: 'Note',
        description: 'Note',
        mimeType: 'text/markdown'
      }, handler);
      
      const foundHandler = registry.getHandler('vault://note/Daily/2024-01-01.md');
      expect(foundHandler).toBe(handler);
    });
    
    it('should return null for no match', () => {
      const registry = new ResourceRegistry();
      const foundHandler = registry.getHandler('vault://unknown');
      expect(foundHandler).toBeNull();
    });
    
    it('should handle multiple dynamic patterns correctly', () => {
      const registry = new ResourceRegistry();
      
      const noteHandler: ResourceHandler = async () => ({
        contents: [{ uri: '', mimeType: 'text/markdown', text: 'note' }]
      });
      
      const folderHandler: ResourceHandler = async () => ({
        contents: [{ uri: '', mimeType: 'application/json', text: 'folder' }]
      });
      
      registry.registerResource({
        uri: 'vault://note/{path}',
        name: 'Note',
        description: 'Note',
        mimeType: 'text/markdown'
      }, noteHandler);
      
      registry.registerResource({
        uri: 'vault://folder/{path}',
        name: 'Folder',
        description: 'Folder',
        mimeType: 'application/json'
      }, folderHandler);
      
      expect(registry.getHandler('vault://note/test.md')).toBe(noteHandler);
      expect(registry.getHandler('vault://folder/Projects')).toBe(folderHandler);
    });
  });
  
  describe('extractPathParameter', () => {
    it('should extract path from dynamic URI', () => {
      const registry = new ResourceRegistry();
      registry.registerResource({
        uri: 'vault://note/{path}',
        name: 'Note',
        description: 'Note',
        mimeType: 'text/markdown'
      }, async () => ({ contents: [] }));
      
      const path = registry.extractPathParameter('vault://note/{path}', 'vault://note/Daily/2024-01-01.md');
      expect(path).toBe('Daily/2024-01-01.md');
    });
    
    it('should handle root folder edge cases', () => {
      const registry = new ResourceRegistry();
      registry.registerResource({
        uri: 'vault://folder/{path}',
        name: 'Folder',
        description: 'Folder',
        mimeType: 'application/json'
      }, async () => ({ contents: [] }));
      
      expect(registry.extractPathParameter('vault://folder/{path}', 'vault://folder')).toBe('');
      expect(registry.extractPathParameter('vault://folder/{path}', 'vault://folder/')).toBe('');
    });
  });
});