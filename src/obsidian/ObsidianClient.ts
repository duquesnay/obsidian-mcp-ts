import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../types/errors.js';

export interface ObsidianClientConfig {
  apiKey: string;
  protocol?: string;
  host?: string;
  port?: number;
  verifySsl?: boolean;
}

export class ObsidianClient {
  private apiKey: string;
  private protocol: string;
  private host: string;
  private port: number;
  private verifySsl: boolean;
  private axiosInstance: AxiosInstance;

  constructor(config: ObsidianClientConfig) {
    this.apiKey = config.apiKey;
    this.protocol = config.protocol || 'https';
    this.host = config.host || '127.0.0.1';
    this.port = config.port || 27124;
    this.verifySsl = config.verifySsl || false;

    // Create axios instance with custom config
    this.axiosInstance = axios.create({
      baseURL: this.getBaseUrl(),
      timeout: 6000, // 6 second read timeout
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: this.verifySsl
      })
    });

    // Set connect timeout
    this.axiosInstance.defaults.timeout = 6000;
  }

  private getBaseUrl(): string {
    return `${this.protocol}://${this.host}:${this.port}`;
  }

  private async safeCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ errorCode?: number; message?: string }>;
        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          const code = errorData.errorCode || -1;
          const message = errorData.message || '<unknown>';
          throw new ObsidianError(`Error ${code}: ${message}`, code);
        }
        throw new ObsidianError(`Request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async listFilesInVault(): Promise<string[]> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get('/vault/');
      return response.data.files;
    });
  }

  async listFilesInDir(dirpath: string): Promise<string[]> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/vault/${dirpath}/`);
      return response.data.files;
    });
  }

  async getFileContents(filepath: string): Promise<string> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/vault/${filepath}`);
      return response.data;
    });
  }

  async getBatchFileContents(filepaths: string[]): Promise<string> {
    const results: string[] = [];
    
    for (const filepath of filepaths) {
      try {
        const content = await this.getFileContents(filepath);
        results.push(`# ${filepath}\n\n${content}\n\n---\n\n`);
      } catch (error) {
        results.push(`# ${filepath}\n\nError reading file: ${error instanceof Error ? error.message : String(error)}\n\n---\n\n`);
      }
    }
    
    return results.join('');
  }

  async search(query: string, contextLength: number = 100): Promise<any> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/simple/', {
        query,
        contextLength
      });
      return response.data;
    });
  }

  async complexSearch(query: any): Promise<any> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/', query);
      return response.data;
    });
  }

  async patchContent(
    filepath: string,
    content: string,
    options: {
      heading?: string;
      insertAfter?: boolean;
      insertBefore?: boolean;
      createIfNotExists?: boolean;
      blockRef?: string;
    } = {}
  ): Promise<any> {
    const payload: any = { content };
    
    if (options.heading) payload.heading = options.heading;
    if (options.insertAfter) payload.insertAfter = options.insertAfter;
    if (options.insertBefore) payload.insertBefore = options.insertBefore;
    if (options.createIfNotExists) payload.createIfNotExists = options.createIfNotExists;
    if (options.blockRef) payload.blockRef = options.blockRef;

    return this.safeCall(async () => {
      const response = await this.axiosInstance.patch(`/vault/${filepath}`, payload);
      return response.data;
    });
  }

  async appendContent(filepath: string, content: string, createIfNotExists: boolean = true): Promise<void> {
    const encodedPath = encodeURIComponent(filepath);
    
    return this.safeCall(async () => {
      if (createIfNotExists) {
        await this.axiosInstance.post(`/vault/${encodedPath}`, content, {
          headers: { 
            'Content-Type': 'text/markdown',
            'If-None-Match': '*'
          }
        });
      } else {
        const currentContent = await this.getFileContents(filepath);
        const newContent = currentContent ? `${currentContent}\n${content}` : content;
        await this.axiosInstance.put(`/vault/${encodedPath}`, newContent, {
          headers: { 'Content-Type': 'text/markdown' }
        });
      }
    });
  }

  async createFile(filepath: string, content: string): Promise<void> {
    const encodedPath = encodeURIComponent(filepath);
    
    return this.safeCall(async () => {
      await this.axiosInstance.put(`/vault/${encodedPath}`, content, {
        headers: { 'Content-Type': 'text/markdown' }
      });
    });
  }

  async updateFile(filepath: string, content: string): Promise<void> {
    return this.createFile(filepath, content);
  }

  async deleteFile(filepath: string): Promise<void> {
    const encodedPath = encodeURIComponent(filepath);
    
    return this.safeCall(async () => {
      await this.axiosInstance.delete(`/vault/${encodedPath}`);
    });
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    return this.safeCall(async () => {
      await this.axiosInstance.post('/vault/rename', {
        oldPath,
        newPath
      });
    });
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    return this.safeCall(async () => {
      await this.axiosInstance.post('/vault/move', {
        sourcePath,
        destinationPath
      });
    });
  }

  async getPeriodicNote(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<any> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/periodic-notes/', { period });
      return response.data;
    });
  }

  async getRecentPeriodicNotes(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    days?: number
  ): Promise<any> {
    const payload: any = { period };
    if (days !== undefined) payload.days = days;
    
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/periodic-notes/recent', payload);
      return response.data;
    });
  }

  async getRecentChanges(
    directory?: string,
    limit?: number,
    offset?: number,
    contentLength?: number
  ): Promise<any> {
    const params: any = {};
    if (directory) params.dir = directory;
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    if (contentLength !== undefined) params['content-length'] = contentLength;
    
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get('/vault/recent', { params });
      return response.data;
    });
  }
}