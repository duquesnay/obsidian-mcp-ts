import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  ListResourceTemplatesRequestSchema,
  ResourceTemplate 
} from '@modelcontextprotocol/sdk/types.js';
import { registerResources } from '../../src/resources/index.js';
import { ResourceRegistry } from '../../src/resources/ResourceRegistry.js';

describe('Resource Templates', () => {
  let server: Server;
  let registry: ResourceRegistry;

  beforeEach(() => {
    server = new Server(
      {
        name: 'obsidian-mcp-test',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
        },
      }
    );
    registry = new ResourceRegistry();
    (server as any).resourceRegistry = registry;
  });

  describe('resource templates endpoint', () => {
    it('should register templates during resource registration', async () => {
      // Register resources with templates
      await registerResources(server);

      // Access templates through the registry
      const templates = registry.listResourceTemplates();
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return resource templates for parameterized resources', async () => {
      await registerResources(server);
      const templates: ResourceTemplate[] = registry.listResourceTemplates();

      // Should have templates for all parameterized resources
      const templateUris = templates.map(t => t.uriTemplate);
      
      expect(templateUris).toContain('vault://note/{path}');
      expect(templateUris).toContain('vault://folder/{path}');
      expect(templateUris).toContain('vault://daily/{date}');
      expect(templateUris).toContain('vault://tag/{tagname}');
    });

    it('should provide proper template metadata', async () => {
      await registerResources(server);
      const templates: ResourceTemplate[] = registry.listResourceTemplates();

      // Find note template
      const noteTemplate = templates.find(t => t.uriTemplate === 'vault://note/{path}');
      expect(noteTemplate).toBeDefined();
      expect(noteTemplate!.name).toBe('Note');
      expect(noteTemplate!.description).toContain('Individual note by path');
      expect(noteTemplate!.description).toContain('vault://note/Daily/2024-01-01.md');
      expect(noteTemplate!.mimeType).toBe('text/markdown');

      // Find tag template
      const tagTemplate = templates.find(t => t.uriTemplate === 'vault://tag/{tagname}');
      expect(tagTemplate).toBeDefined();
      expect(tagTemplate!.name).toBe('Notes by Tag');
      expect(tagTemplate!.description).toContain('vault://tag/project');
      expect(tagTemplate!.mimeType).toBe('application/json');
    });
  });

  describe('ResourceRegistry template support', () => {
    it('should allow registering resource templates', () => {
      const template: ResourceTemplate = {
        name: 'Test Template',
        uriTemplate: 'vault://test/{param}',
        description: 'Test template with parameter',
        mimeType: 'application/json'
      };

      registry.registerResourceTemplate(template);
      const templates = registry.listResourceTemplates();
      
      expect(templates).toHaveLength(1);
      expect(templates[0]).toEqual(template);
    });

    it('should not duplicate resource templates', () => {
      const template: ResourceTemplate = {
        name: 'Test Template',
        uriTemplate: 'vault://test/{param}',
        description: 'Test template'
      };

      registry.registerResourceTemplate(template);
      registry.registerResourceTemplate(template); // Register again
      
      const templates = registry.listResourceTemplates();
      expect(templates).toHaveLength(1);
    });
  });
});