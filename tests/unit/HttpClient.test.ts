import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../../src/utils/HttpClient.js';
import axios, { AxiosError } from 'axios';
import { ObsidianError } from '../../src/types/errors.js';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn()
  }
}));

describe('HttpClient', () => {
  let httpClient: HttpClient;
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { timeout: 6000 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
    
    httpClient = new HttpClient({
      baseURL: 'https://api.example.com',
      headers: { 'Authorization': 'Bearer test-token' },
      timeout: 5000
    });
  });

  describe('constructor', () => {
    it('should create axios instance with provided config', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        headers: { 'Authorization': 'Bearer test-token' },
        timeout: 5000
      });
    });
  });

  describe('safeCall', () => {
    it('should return successful response data', async () => {
      const mockData = { result: 'success' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });

      const result = await httpClient.get('/test');
      
      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
    });

    it('should handle axios errors with response', async () => {
      const axiosError = new Error('Request failed') as AxiosError;
      axiosError.response = {
        status: 404,
        statusText: 'Not Found',
        data: { error: 'Resource not found' },
        headers: {},
        config: {} as any
      };
      axiosError.isAxiosError = true;
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      await expect(httpClient.get('/test')).rejects.toThrow(ObsidianError);
      await expect(httpClient.get('/test')).rejects.toThrow('Request failed');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(httpClient.get('/test')).rejects.toThrow('Network Error');
    });
  });

  describe('HTTP methods', () => {
    it('should make GET request', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      const result = await httpClient.get('/users', {
        params: { page: 1 }
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users', {
        params: { page: 1 }
      });
      expect(result).toEqual({ success: true });
    });

    it('should make POST request', async () => {
      const payload = { name: 'Test' };
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 1 } });

      const result = await httpClient.post('/users', payload);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', payload, undefined);
      expect(result).toEqual({ id: 1 });
    });

    it('should make PUT request', async () => {
      const payload = { name: 'Updated' };
      mockAxiosInstance.put.mockResolvedValue({ data: { updated: true } });

      const result = await httpClient.put('/users/1', payload);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/users/1', payload, undefined);
      expect(result).toEqual({ updated: true });
    });

    it('should make PATCH request', async () => {
      const payload = { status: 'active' };
      mockAxiosInstance.patch.mockResolvedValue({ data: { patched: true } });

      const result = await httpClient.patch('/users/1', payload, {
        headers: { 'X-Custom': 'header' }
      });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/users/1', payload, {
        headers: { 'X-Custom': 'header' }
      });
      expect(result).toEqual({ patched: true });
    });

    it('should make DELETE request', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { deleted: true } });

      const result = await httpClient.delete('/users/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/users/1', undefined);
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('setDefaultTimeout', () => {
    it('should update default timeout', () => {
      httpClient.setDefaultTimeout(10000);
      
      expect(mockAxiosInstance.defaults.timeout).toBe(10000);
    });
  });
});