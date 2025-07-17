import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ObsidianError } from '../types/errors.js';

/**
 * Base HTTP client class for making API requests
 * Provides a wrapper around axios with error handling
 */
export class HttpClient {
  protected axiosInstance: AxiosInstance;

  constructor(config: AxiosRequestConfig) {
    this.axiosInstance = axios.create(config);
  }

  /**
   * Safely execute an HTTP request with error handling
   */
  protected async safeCall<T>(fn: () => Promise<{ data: T }>): Promise<T> {
    try {
      const response = await fn();
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          throw new ObsidianError(
            axiosError.message || `HTTP ${axiosError.response.status} error`,
            axiosError.response.status
          );
        } else if (axiosError.request) {
          // The request was made but no response was received
          throw new ObsidianError('No response from server', -1);
        }
      }
      throw error;
    }
  }

  /**
   * Make a GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.safeCall(() => this.axiosInstance.get<T>(url, config));
  }

  /**
   * Make a POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.safeCall(() => this.axiosInstance.post<T>(url, data, config));
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.safeCall(() => this.axiosInstance.put<T>(url, data, config));
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.safeCall(() => this.axiosInstance.patch<T>(url, data, config));
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.safeCall(() => this.axiosInstance.delete<T>(url, config));
  }

  /**
   * Set default timeout for all requests
   */
  setDefaultTimeout(timeout: number): void {
    this.axiosInstance.defaults.timeout = timeout;
  }
}