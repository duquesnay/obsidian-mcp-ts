import { describe, it, expect, vi } from 'vitest';
import { ResourceRegistry } from '../../../src/resources/ResourceRegistry.js';
import { createVaultStructureHandler } from '../../../src/resources/handlers.js';

describe('Vault Structure Resource', () => {
  it('should be registered and accessible through ResourceRegistry', async () => {
    const registry = new ResourceRegistry();
    
    // Register the vault structure resource
    registry.registerResource({
      uri: 'vault://structure',
      name: 'Vault Structure',
      description: 'Complete hierarchical structure of the vault with folders and files',
      mimeType: 'application/json'
    }, createVaultStructureHandler());
    
    // Verify resource is listed
    const resources = registry.listResources();
    const structureResource = resources.find(r => r.uri === 'vault://structure');
    expect(structureResource).toBeDefined();
    expect(structureResource?.name).toBe('Vault Structure');
    expect(structureResource?.mimeType).toBe('application/json');
    
    // Verify handler can be retrieved
    const handler = registry.getHandler('vault://structure');
    expect(handler).toBeDefined();
    
    // Test the handler with mock data
    const mockServer = {
      obsidianClient: {
        listFilesInVault: vi.fn().mockResolvedValue([
          'README.md',
          'Projects/project1.md',
          'Projects/SubProject/task.md',
          'Archive/old.md'
        ])
      }
    };
    
    const result = await handler!('vault://structure?mode=full', mockServer);
    expect(result).toBeDefined();
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');
    
    const data = JSON.parse(result.contents[0].text);
    expect(data).toHaveProperty('structure');
    expect(data).toHaveProperty('totalFiles', 4);
    expect(data).toHaveProperty('totalFolders', 3); // Projects, SubProject, Archive
    
    // Verify structure contains expected hierarchy
    expect(data.structure.files).toContain('README.md');
    expect(data.structure.folders).toHaveProperty('Projects');
    expect(data.structure.folders).toHaveProperty('Archive');
    expect(data.structure.folders.Projects.folders).toHaveProperty('SubProject');
  });
});