import { describe, it, expect } from 'vitest';
import { ObsidianClient } from '../ObsidianClient.js';
import type { IObsidianClient } from '../interfaces/IObsidianClient.js';

describe('IObsidianClient Interface', () => {
  it('ObsidianClient should implement IObsidianClient interface', () => {
    const client = new ObsidianClient({
      apiKey: 'test-key',
      host: '127.0.0.1',
      port: 27124
    });
    
    // Type check - this should compile without errors
    const typedClient: IObsidianClient = client;
    expect(typedClient).toBeDefined();
  });

  it('should have all file operation methods', () => {
    const client = new ObsidianClient({
      apiKey: 'test-key'
    });
    
    expect(client.listFilesInVault).toBeDefined();
    expect(client.listFilesInDir).toBeDefined();
    expect(client.getFileContents).toBeDefined();
    expect(client.getBatchFileContents).toBeDefined();
    expect(client.createFile).toBeDefined();
    expect(client.updateFile).toBeDefined();
    expect(client.deleteFile).toBeDefined();
    expect(client.renameFile).toBeDefined();
    expect(client.moveFile).toBeDefined();
    expect(client.copyFile).toBeDefined();
    expect(client.checkPathExists).toBeDefined();
  });

  it('should have all directory operation methods', () => {
    const client = new ObsidianClient({
      apiKey: 'test-key'
    });
    
    expect(client.createDirectory).toBeDefined();
    expect(client.deleteDirectory).toBeDefined();
    expect(client.moveDirectory).toBeDefined();
    expect(client.copyDirectory).toBeDefined();
  });

  it('should have all search operation methods', () => {
    const client = new ObsidianClient({
      apiKey: 'test-key'
    });
    
    expect(client.search).toBeDefined();
    expect(client.complexSearch).toBeDefined();
    expect(client.advancedSearch).toBeDefined();
  });

  it('should have all tag management methods', () => {
    const client = new ObsidianClient({
      apiKey: 'test-key'
    });
    
    expect(client.getAllTags).toBeDefined();
    expect(client.getFilesByTag).toBeDefined();
    expect(client.renameTag).toBeDefined();
    expect(client.manageFileTags).toBeDefined();
  });

  it('should have all periodic notes methods', () => {
    const client = new ObsidianClient({
      apiKey: 'test-key'
    });
    
    expect(client.getPeriodicNote).toBeDefined();
    expect(client.getRecentPeriodicNotes).toBeDefined();
    expect(client.getRecentChanges).toBeDefined();
  });

  it('should have all content editing methods', () => {
    const client = new ObsidianClient({
      apiKey: 'test-key'
    });
    
    expect(client.patchContent).toBeDefined();
    expect(client.appendContent).toBeDefined();
  });
});