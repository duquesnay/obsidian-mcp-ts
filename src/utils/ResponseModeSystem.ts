/**
 * Shared response mode system for handling content processing across all resources
 */

import { LRUCache } from './Cache.js';
import { RESPONSE_MODE_LIMITS, TIME_CONSTANTS, CACHE_DEFAULTS } from '../constants.js';

export type ResponseMode = 'summary' | 'preview' | 'full';

export interface ResponseContent {
  full: string;
  summary?: string;
  preview?: string;
}

export interface ModeResponse {
  mode: ResponseMode;
  content: string;
}

// Use imported constants from central constants file

/**
 * Shared system for processing content in different response modes
 */
export class ResponseModeSystem {
  private static previewCache = new LRUCache<string, string>({ 
    maxSize: CACHE_DEFAULTS.MAX_SIZE, 
    ttl: CACHE_DEFAULTS.STABLE_TTL
  });
  
  private static summaryCache = new LRUCache<string, string>({ 
    maxSize: CACHE_DEFAULTS.MAX_SIZE, 
    ttl: CACHE_DEFAULTS.STABLE_TTL
  });

  /**
   * Parse and validate response mode parameter
   */
  static parseMode(mode: string | null | undefined): ResponseMode {
    const validModes: ResponseMode[] = ['summary', 'preview', 'full'];
    
    if (mode && validModes.includes(mode as ResponseMode)) {
      return mode as ResponseMode;
    }
    
    return 'summary'; // Default mode
  }

  /**
   * Extract response mode from URI query parameters
   */
  static extractModeFromUri(uri: string): ResponseMode {
    try {
      const url = new URL(uri, 'vault://');
      const modeParam = url.searchParams.get('mode');
      return this.parseMode(modeParam);
    } catch (error) {
      return 'summary'; // Default on parse error
    }
  }

  /**
   * Create optimized summary (under 500 characters)
   */
  static createSummary(content: string, cacheKey?: string): string {
    // Check cache first if key provided
    if (cacheKey) {
      const cached = this.summaryCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    let result: string;
    
    if (content.length <= RESPONSE_MODE_LIMITS.SUMMARY_MAX_LENGTH) {
      result = content;
    } else {
      const maxContentLength = RESPONSE_MODE_LIMITS.SUMMARY_MAX_LENGTH - RESPONSE_MODE_LIMITS.TRUNCATION_INDICATOR.length;
      result = content.substring(0, maxContentLength) + RESPONSE_MODE_LIMITS.TRUNCATION_INDICATOR;
    }

    // Cache if key provided
    if (cacheKey) {
      this.summaryCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Create optimized preview (under 2000 characters)
   */
  static createPreview(content: string, cacheKey?: string): string {
    // Check cache first if key provided
    if (cacheKey) {
      const cached = this.previewCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    let result: string;
    
    if (content.length <= RESPONSE_MODE_LIMITS.PREVIEW_MAX_LENGTH) {
      result = content;
    } else {
      const maxContentLength = RESPONSE_MODE_LIMITS.PREVIEW_MAX_LENGTH - RESPONSE_MODE_LIMITS.TRUNCATION_INDICATOR.length;
      result = content.substring(0, maxContentLength) + RESPONSE_MODE_LIMITS.TRUNCATION_INDICATOR;
    }

    // Cache if key provided
    if (cacheKey) {
      this.previewCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Process content based on response mode with auto-generation of missing modes
   */
  static processContent(content: ResponseContent, mode: ResponseMode): string {
    switch (mode) {
      case 'full':
        return content.full;
        
      case 'preview':
        return content.preview || this.createPreview(content.full);
        
      case 'summary':
        return content.summary || this.createSummary(content.full);
        
      default:
        return content.summary || this.createSummary(content.full);
    }
  }

  /**
   * Create a structured response with mode information
   */
  static createModeResponse(content: ResponseContent, mode: ResponseMode): ModeResponse {
    return {
      mode,
      content: this.processContent(content, mode)
    };
  }

  /**
   * Clear all caches (useful for testing)
   */
  static clearCache(): void {
    this.previewCache.clear();
    this.summaryCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return {
      preview: {
        size: this.previewCache.size(),
        hitRate: this.previewCache.getHitRate()
      },
      summary: {
        size: this.summaryCache.size(),
        hitRate: this.summaryCache.getHitRate()
      }
    };
  }
}