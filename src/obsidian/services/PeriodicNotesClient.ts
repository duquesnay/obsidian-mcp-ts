import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../../types/errors.js';
import { OBSIDIAN_DEFAULTS, TIMEOUTS } from '../../constants.js';
import type { IPeriodicNotesClient } from '../interfaces/IPeriodicNotesClient.js';
import type { ObsidianClientConfig } from '../ObsidianClient.js';

/**
 * Client for periodic notes operations in Obsidian vault.
 * Handles daily, weekly, monthly, quarterly, and yearly notes.
 */
export class PeriodicNotesClient implements IPeriodicNotesClient {
  private axiosInstance: AxiosInstance;

  constructor(config: ObsidianClientConfig) {
    const protocol = config.protocol || 'https';
    const host = config.host || OBSIDIAN_DEFAULTS.HOST;
    const port = config.port || OBSIDIAN_DEFAULTS.PORT;
    const verifySsl = config.verifySsl ?? true;

    this.axiosInstance = axios.create({
      baseURL: `${protocol}://${host}:${port}`,
      timeout: TIMEOUTS.DEFAULT_REQUEST,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: verifySsl
      })
    });
  }

  private async safeCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ errorCode?: number; message?: string }>;

        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          const code = errorData.errorCode || axiosError.response.status || -1;
          const message = errorData.message || axiosError.message || '<unknown>';
          throw new ObsidianError(`Periodic notes operation failed - Error ${code}: ${message}`, code);
        }

        throw new ObsidianError(
          `Periodic notes operation failed: ${axiosError.message}`,
          axiosError.response?.status || -1
        );
      }

      throw error;
    }
  }

  async getPeriodicNote(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<any> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/periodic/${period}`);
      return response.data;
    });
  }

  async getRecentPeriodicNotes(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    days?: number
  ): Promise<any[]> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/periodic/${period}/recent`, {
        params: { days },
      });
      return response.data;
    });
  }
}