import { createHash } from 'crypto';
import { DEDUPLICATION_DEFAULTS } from '../constants';

export type RequestType = 'vault-list' | 'file-content' | 'search' | 'batch' | string;

export interface RequestParameters {
  [key: string]: any;
}

// Specific parameter types for better type safety
export interface VaultListParameters {
  path?: string;
}

export interface FileContentParameters {
  filepath: string;
  format?: string;
}

export interface SearchParameters {
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    tags?: string[];
    frontmatter?: Record<string, any>;
  };
}

export interface BatchParameters {
  operation: string;
  items: any[];
}

/**
 * Utility class for generating deduplication keys for different request types.
 * Ensures consistent key generation for request deduplication.
 */
export class DeduplicationKeyGenerator {
  /**
   * Generates a deduplication key for a given request type and parameters.
   * @param requestType The type of request
   * @param parameters The request parameters
   * @returns A consistent deduplication key
   */
  static generateKey(requestType: RequestType, parameters: RequestParameters): string {
    switch (requestType) {
      case 'vault-list':
        return this.generateVaultListKey(parameters);
      
      case 'file-content':
        return this.generateFileContentKey(parameters);
      
      case 'search':
        return this.generateSearchKey(parameters);
      
      case 'batch':
        return this.generateBatchKey(parameters);
      
      default:
        return this.generateGenericKey(requestType, parameters);
    }
  }

  /**
   * Generates a hash for batch items to ensure consistent ordering.
   * @param items Array of items to hash
   * @returns A short hash string
   */
  static generateBatchHash(items: any[]): string {
    // Sort items to ensure consistent hash regardless of order
    const sortedItems = [...items].sort((a, b) => {
      const strA = JSON.stringify(a);
      const strB = JSON.stringify(b);
      return strA.localeCompare(strB);
    });

    const hash = createHash('sha256');
    hash.update(JSON.stringify(sortedItems));
    return hash.digest('hex').substring(0, DEDUPLICATION_DEFAULTS.BATCH_HASH_LENGTH);
  }

  /**
   * Generates key for vault listing requests.
   * Format: 'vault-list' or 'vault-list:{path}'
   */
  private static generateVaultListKey(parameters: RequestParameters): string {
    if (parameters.path) {
      return `vault-list:${parameters.path}`;
    }
    return 'vault-list';
  }

  /**
   * Generates key for file content requests.
   * Format: 'file-content:{filepath}' or 'file-content:{filepath}:{format}'
   * Encodes problematic characters like pipes to prevent key parsing issues.
   */
  private static generateFileContentKey(parameters: RequestParameters): string {
    let key = 'file-content';
    
    if (parameters.filepath) {
      // Encode problematic characters that might interfere with key parsing
      const encodedPath = parameters.filepath.replace(/\|/g, '%7C');
      key += `:${encodedPath}`;
    }

    if (parameters.format) {
      key += `:${parameters.format}`;
    }

    return key;
  }

  private static generateSearchKey(parameters: RequestParameters): string {
    const filteredParams = this.filterUndefinedValues(parameters);
    
    if (Object.keys(filteredParams).length === 0) {
      return 'search';
    }

    // Sort keys to ensure consistent ordering
    const sortedKeys = Object.keys(filteredParams).sort();
    const paramStrings = sortedKeys.map(key => {
      const value = filteredParams[key];
      return `${key}=${this.serializeValue(value)}`;
    });

    return `search:${paramStrings.join('&')}`;
  }

  private static generateBatchKey(parameters: RequestParameters): string {
    const operation = parameters.operation || 'unknown';
    const items = parameters.items || [];
    const hash = this.generateBatchHash(items);
    
    return `batch:${operation}:${hash}`;
  }

  private static generateGenericKey(requestType: string, parameters: RequestParameters): string {
    const filteredParams = this.filterUndefinedValues(parameters);
    
    if (Object.keys(filteredParams).length === 0) {
      return requestType;
    }

    // Sort keys to ensure consistent ordering
    const sortedKeys = Object.keys(filteredParams).sort();
    const paramStrings = sortedKeys.map(key => {
      const value = filteredParams[key];
      return `${key}=${this.serializeValue(value)}`;
    });

    return `${requestType}:${paramStrings.join('&')}`;
  }

  private static filterUndefinedValues(obj: RequestParameters): RequestParameters {
    const filtered: RequestParameters = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  private static serializeValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(',');
    } else if (typeof value === 'object') {
      return JSON.stringify(value);
    } else {
      return String(value);
    }
  }
}