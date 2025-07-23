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
  
  describe('extractParameter', () => {
    it('should extract path parameter from dynamic URI', () => {
      const registry = new ResourceRegistry();
      
      const path = registry.extractParameter('vault://note/{path}', 'vault://note/Daily/2024-01-01.md', 'path');
      expect(path).toBe('Daily/2024-01-01.md');
    });
    
    it('should extract date parameter from dynamic URI', () => {
      const registry = new ResourceRegistry();
      
      const date = registry.extractParameter('vault://daily/{date}', 'vault://daily/2024-01-01', 'date');
      expect(date).toBe('2024-01-01');
    });
    
    it('should extract tagname parameter from dynamic URI', () => {
      const registry = new ResourceRegistry();
      
      const tagname = registry.extractParameter('vault://tag/{tagname}', 'vault://tag/important', 'tagname');
      expect(tagname).toBe('important');
    });
    
    it('should extract custom parameter from dynamic URI', () => {
      const registry = new ResourceRegistry();
      
      const value = registry.extractParameter('vault://custom/{myParam}', 'vault://custom/test-value', 'myParam');
      expect(value).toBe('test-value');
    });
    
    it('should handle root folder edge cases for any parameter', () => {
      const registry = new ResourceRegistry();
      
      expect(registry.extractParameter('vault://folder/{path}', 'vault://folder', 'path')).toBe('');
      expect(registry.extractParameter('vault://folder/{path}', 'vault://folder/', 'path')).toBe('');
      expect(registry.extractParameter('vault://daily/{date}', 'vault://daily', 'date')).toBe('');
    });
    
    it('should return empty string for non-matching parameter', () => {
      const registry = new ResourceRegistry();
      
      const value = registry.extractParameter('vault://note/{path}', 'vault://note/test.md', 'date');
      expect(value).toBe('');
    });
  });
  
  describe('generic parameter detection', () => {
    it('should detect any parameter pattern in URIs', () => {
      const registry = new ResourceRegistry();
      
      // Custom parameter names should work
      const customHandler: ResourceHandler = async () => ({
        contents: [{ uri: '', mimeType: 'application/json', text: '{}' }]
      });
      
      registry.registerResource({
        uri: 'vault://resource/{customParam}',
        name: 'Custom Resource',
        description: 'Resource with custom parameter',
        mimeType: 'application/json'
      }, customHandler);
      
      const foundHandler = registry.getHandler('vault://resource/test-value');
      expect(foundHandler).toBe(customHandler);
    });
    
    it('should handle multiple different parameter names', () => {
      const registry = new ResourceRegistry();
      
      const handler1: ResourceHandler = async () => ({ contents: [] });
      const handler2: ResourceHandler = async () => ({ contents: [] });
      const handler3: ResourceHandler = async () => ({ contents: [] });
      
      registry.registerResource({
        uri: 'vault://user/{userId}',
        name: 'User',
        description: 'User by ID',
        mimeType: 'application/json'
      }, handler1);
      
      registry.registerResource({
        uri: 'vault://project/{projectId}',
        name: 'Project',
        description: 'Project by ID',
        mimeType: 'application/json'
      }, handler2);
      
      registry.registerResource({
        uri: 'vault://category/{categoryName}',
        name: 'Category',
        description: 'Category by name',
        mimeType: 'application/json'
      }, handler3);
      
      expect(registry.getHandler('vault://user/123')).toBe(handler1);
      expect(registry.getHandler('vault://project/my-project')).toBe(handler2);
      expect(registry.getHandler('vault://category/work')).toBe(handler3);
    });
  });
});