import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerResources } from '../../src/resources/index.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('Daily Note Resource', () => {
  let mockServer: any;
  let mockClient: any;
  let readResourceHandler: any;

  beforeEach(() => {
    // Create mock ObsidianClient
    mockClient = {
      getPeriodicNote: vi.fn()
    };
    
    // Create mock server
    mockServer = {
      obsidianClient: mockClient,
      setRequestHandler: vi.fn()
    };
    
    // Register resources
    registerResources(mockServer);
    
    // Get the ReadResource handler
    readResourceHandler = mockServer.setRequestHandler.mock.calls
      .find((call: any) => call[0] === ReadResourceRequestSchema)?.[1];
  });

  it('should read daily note for specific date', async () => {
    const noteContent = '# Daily Note\n\n## Tasks\n- [ ] Review PR\n- [ ] Update docs';
    mockClient.getPeriodicNote.mockResolvedValue({
      date: '2024-01-15',
      content: noteContent,
      path: 'Daily Notes/2024-01-15.md'
    });

    const result = await readResourceHandler({
      params: { uri: 'vault://daily/2024-01-15' }
    });

    expect(mockClient.getPeriodicNote).toHaveBeenCalledWith('daily');
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]).toEqual({
      uri: 'vault://daily/2024-01-15',
      mimeType: 'text/markdown',
      text: noteContent
    });
  });

  it('should read today\'s daily note', async () => {
    const today = new Date().toISOString().split('T')[0];
    const noteContent = `# Today's Note\n\n## ${today}`;
    
    mockClient.getPeriodicNote.mockResolvedValue({
      date: today,
      content: noteContent,
      path: `Daily Notes/${today}.md`
    });

    const result = await readResourceHandler({
      params: { uri: 'vault://daily/today' }
    });

    expect(mockClient.getPeriodicNote).toHaveBeenCalledWith('daily');
    expect(result.contents[0].text).toBe(noteContent);
  });

  it('should handle missing daily note', async () => {
    // Clear cache to ensure clean test state
    const { clearAllCaches } = await import('../../src/resources/index.js');
    clearAllCaches();
    
    // Clear any previous mocks and set up rejection
    mockClient.getPeriodicNote.mockReset();
    mockClient.getPeriodicNote.mockRejectedValue({
      response: { status: 404 }
    });

    await expect(readResourceHandler({
      params: { uri: 'vault://daily/2024-01-15' }
    })).rejects.toThrow('Resource not found: Daily note at 2024-01-15');
  });

  it('should validate date format', async () => {
    await expect(readResourceHandler({
      params: { uri: 'vault://daily/not-a-date' }
    })).rejects.toThrow('Invalid date format: Expected YYYY-MM-DD or "today"');
  });

  it('should be listed in available resources', async () => {
    const listResourcesHandler = mockServer.setRequestHandler.mock.calls
      .find((call: any) => call[0] === ListResourcesRequestSchema)?.[1];
    
    const result = await listResourcesHandler({ method: 'resources/list' });
    
    const dailyNoteResource = result.resources.find((r: any) => r.uri === 'vault://daily/{date}');
    expect(dailyNoteResource).toBeDefined();
    expect(dailyNoteResource.name).toBe('Daily Note');
    expect(dailyNoteResource.description).toContain('vault://daily/2024-01-15');
    expect(dailyNoteResource.description).toContain('vault://daily/today');
    expect(dailyNoteResource.mimeType).toBe('text/markdown');
  });
});