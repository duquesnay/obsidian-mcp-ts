import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PeriodicNotesClient } from '../src/obsidian/services/PeriodicNotesClient';
import { IPeriodicNotesClient } from '../src/obsidian/interfaces/IPeriodicNotesClient';
import axios, { AxiosInstance } from 'axios';

vi.mock('axios');

describe('PeriodicNotesClient', () => {
  let client: IPeriodicNotesClient;
  let mockAxios: AxiosInstance;

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    } as any;

    vi.mocked(axios.create).mockReturnValue(mockAxios);

    client = new PeriodicNotesClient({
      host: 'localhost',
      port: 27124,
      apiKey: 'test-key',
      secure: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPeriodicNote', () => {
    it('should fetch daily periodic note', async () => {
      const mockResponse = {
        content: '# Daily Note\n\nToday\'s tasks...',
        metadata: {
          path: 'Daily Notes/2024-01-24.md',
          created: '2024-01-24T08:00:00Z',
          modified: '2024-01-24T12:00:00Z',
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await client.getPeriodicNote('daily');

      expect(mockAxios.get).toHaveBeenCalledWith('/periodic/daily');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch weekly periodic note', async () => {
      const mockResponse = {
        content: '# Weekly Review\n\nThis week\'s goals...',
        metadata: {
          path: 'Weekly Notes/2024-W04.md',
          created: '2024-01-22T08:00:00Z',
          modified: '2024-01-24T12:00:00Z',
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await client.getPeriodicNote('weekly');

      expect(mockAxios.get).toHaveBeenCalledWith('/periodic/weekly');
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when fetching periodic note', async () => {
      vi.mocked(mockAxios.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getPeriodicNote('daily')).rejects.toThrow('Network error');
    });
  });

  describe('getRecentPeriodicNotes', () => {
    it('should fetch recent daily notes', async () => {
      const mockResponse = [
        {
          content: '# Daily Note 1',
          metadata: { path: 'Daily Notes/2024-01-24.md' },
        },
        {
          content: '# Daily Note 2',
          metadata: { path: 'Daily Notes/2024-01-23.md' },
        },
      ];

      vi.mocked(mockAxios.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await client.getRecentPeriodicNotes('daily', 7);

      expect(mockAxios.get).toHaveBeenCalledWith('/periodic/daily/recent', {
        params: { days: 7 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch recent weekly notes', async () => {
      const mockResponse = [
        {
          content: '# Week 4',
          metadata: { path: 'Weekly Notes/2024-W04.md' },
        },
        {
          content: '# Week 3',
          metadata: { path: 'Weekly Notes/2024-W03.md' },
        },
      ];

      vi.mocked(mockAxios.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await client.getRecentPeriodicNotes('weekly', 4);

      expect(mockAxios.get).toHaveBeenCalledWith('/periodic/weekly/recent', {
        params: { days: 4 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should use default days if not provided', async () => {
      vi.mocked(mockAxios.get).mockResolvedValueOnce({ data: [] });

      await client.getRecentPeriodicNotes('monthly');

      expect(mockAxios.get).toHaveBeenCalledWith('/periodic/monthly/recent', {
        params: { days: undefined },
      });
    });

    it('should handle errors when fetching recent periodic notes', async () => {
      vi.mocked(mockAxios.get).mockRejectedValueOnce(new Error('API error'));

      await expect(client.getRecentPeriodicNotes('daily', 7)).rejects.toThrow('API error');
    });
  });
});