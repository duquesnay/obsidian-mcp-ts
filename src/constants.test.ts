import { describe, it, expect } from 'vitest';
import { 
  OBSIDIAN_DEFAULTS, 
  CACHE_DEFAULTS, 
  LRU_CACHE, 
  BATCH_PROCESSOR, 
  REQUEST_DEDUPLICATOR, 
  API_ENDPOINTS,
  PATH_VALIDATION,
  ERROR_MESSAGES,
  TIMEOUTS,
  REGEX_PATTERNS
} from './constants.js';

describe('Constants', () => {
  describe('OBSIDIAN_DEFAULTS', () => {
    it('should have correct default values', () => {
      expect(OBSIDIAN_DEFAULTS.PORT).toBe(27124);
      expect(OBSIDIAN_DEFAULTS.HOST).toBe('127.0.0.1');
      expect(OBSIDIAN_DEFAULTS.TIMEOUT_MS).toBe(6000);
      expect(OBSIDIAN_DEFAULTS.BATCH_SIZE).toBe(5);
      expect(OBSIDIAN_DEFAULTS.CONTEXT_LENGTH).toBe(100);
    });


    it('should have all uppercase keys', () => {
      Object.keys(OBSIDIAN_DEFAULTS).forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/);
      });
    });
  });

  describe('CACHE_DEFAULTS', () => {
    it('should have correct cache values', () => {
      expect(CACHE_DEFAULTS.MAX_SIZE).toBe(100);
      expect(CACHE_DEFAULTS.FAST_TTL).toBe(30000);
      expect(CACHE_DEFAULTS.STABLE_TTL).toBe(300000);
      expect(CACHE_DEFAULTS.NOTE_TTL).toBe(120000);
    });

    it('should have TTL values as numbers', () => {
      expect(typeof CACHE_DEFAULTS.FAST_TTL).toBe('number');
      expect(typeof CACHE_DEFAULTS.STABLE_TTL).toBe('number');
      expect(typeof CACHE_DEFAULTS.NOTE_TTL).toBe('number');
    });
  });

  describe('LRU_CACHE', () => {
    it('should have NO_EXPIRATION constant', () => {
      expect(LRU_CACHE.NO_EXPIRATION).toBe(0);
    });
  });

  describe('BATCH_PROCESSOR', () => {
    it('should have correct default values', () => {
      expect(BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS).toBe(2);
      expect(BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS).toBe(1000);
    });
  });

  describe('REQUEST_DEDUPLICATOR', () => {
    it('should have correct default TTL', () => {
      expect(REQUEST_DEDUPLICATOR.DEFAULT_TTL_MS).toBe(5000);
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have correct endpoint patterns', () => {
      expect(API_ENDPOINTS.BASE).toBe('https://{host}:{port}');
      expect(API_ENDPOINTS.VAULT).toBe('/vault');
      expect(API_ENDPOINTS.SEARCH).toBe('/search');
      expect(API_ENDPOINTS.PERIODIC_NOTES).toBe('/periodic-notes');
      expect(API_ENDPOINTS.TAGS).toBe('/tags');
    });
  });

  describe('PATH_VALIDATION', () => {
    it('should have correct max length', () => {
      expect(PATH_VALIDATION.MAX_LENGTH).toBe(1000);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all required error messages', () => {
      expect(ERROR_MESSAGES.MISSING_API_KEY).toBeDefined();
      expect(ERROR_MESSAGES.CONNECTION_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.FILE_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.PERMISSION_DENIED).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_PATH).toBeDefined();
    });

    it('should have string values', () => {
      Object.values(ERROR_MESSAGES).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('TIMEOUTS', () => {
    it('should have correct timeout values', () => {
      expect(TIMEOUTS.DEFAULT_REQUEST).toBe(6000);
      expect(TIMEOUTS.DIRECTORY_OPERATIONS).toBe(120000);
      expect(TIMEOUTS.SEARCH_OPERATIONS).toBe(30000);
    });

    it('should have all timeout values as positive numbers', () => {
      Object.values(TIMEOUTS).forEach(timeout => {
        expect(typeof timeout).toBe('number');
        expect(timeout).toBeGreaterThan(0);
      });
    });
  });

  describe('REGEX_PATTERNS', () => {
    it('should have URL_VALIDATION pattern', () => {
      expect(REGEX_PATTERNS.URL_VALIDATION).toBeDefined();
      expect(REGEX_PATTERNS.URL_VALIDATION).toBeInstanceOf(RegExp);
    });

    describe('URL_VALIDATION pattern', () => {
      const pattern = REGEX_PATTERNS.URL_VALIDATION;

      it('should match valid HTTP URLs', () => {
        expect('http://example.com').toMatch(pattern);
        expect('http://example.com:8080').toMatch(pattern);
        expect('http://example.com/path').toMatch(pattern);
        expect('http://example.com:8080/path').toMatch(pattern);
        expect('http://localhost').toMatch(pattern);
        expect('http://localhost:3000').toMatch(pattern);
        expect('http://127.0.0.1').toMatch(pattern);
        expect('http://127.0.0.1:27124').toMatch(pattern);
      });

      it('should match valid HTTPS URLs', () => {
        expect('https://example.com').toMatch(pattern);
        expect('https://example.com:8443').toMatch(pattern);
        expect('https://example.com/path').toMatch(pattern);
        expect('https://example.com:8443/path').toMatch(pattern);
        expect('https://localhost').toMatch(pattern);
        expect('https://localhost:3000').toMatch(pattern);
        expect('https://127.0.0.1').toMatch(pattern);
        expect('https://127.0.0.1:27124').toMatch(pattern);
      });

      it('should not match invalid URLs', () => {
        expect('ftp://example.com').not.toMatch(pattern);
        expect('file:///path/to/file').not.toMatch(pattern);
        expect('example.com').not.toMatch(pattern);
        expect('http://').not.toMatch(pattern);
        expect('https://').not.toMatch(pattern);
        expect('://example.com').not.toMatch(pattern);
        expect('http:/example.com').not.toMatch(pattern);
        expect('http//example.com').not.toMatch(pattern);
        expect('htp://example.com').not.toMatch(pattern);
      });

      it('should match URLs with query strings and fragments', () => {
        expect('http://example.com?query=value').toMatch(pattern);
        expect('http://example.com#fragment').toMatch(pattern);
        expect('http://example.com?query=value#fragment').toMatch(pattern);
        expect('https://example.com:8080/path?query=value#fragment').toMatch(pattern);
      });

      it('should match URLs with IP addresses', () => {
        expect('http://192.168.1.1').toMatch(pattern);
        expect('https://10.0.0.1:8080').toMatch(pattern);
        expect('http://255.255.255.255').toMatch(pattern);
        expect('https://0.0.0.0:3000').toMatch(pattern);
      });

      it('should match URLs with subdomains', () => {
        expect('http://sub.example.com').toMatch(pattern);
        expect('https://deep.sub.example.com').toMatch(pattern);
        expect('http://api.v2.example.com:8080').toMatch(pattern);
      });
    });
  });
});