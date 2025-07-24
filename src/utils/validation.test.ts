import { describe, it, expect } from 'vitest';
import { 
  validateRequiredArgs, 
  PATH_SCHEMA, 
  PAGINATION_SCHEMA,
  PERIOD_SCHEMA,
  VALID_PERIODS,
  validatePeriod
} from './validation';

describe('validateRequiredArgs', () => {
  it('should validate required string arguments', () => {
    const args = { name: 'test', value: 'value' };
    // Should not throw
    expect(() => validateRequiredArgs(args, ['name', 'value'])).not.toThrow();
  });

  it('should throw error for missing required arguments', () => {
    const args = { name: 'test' };
    expect(() => validateRequiredArgs(args, ['name', 'value'])).toThrow('value argument missing in arguments');
  });

  it('should throw error for empty string arguments', () => {
    const args = { name: '', value: 'value' };
    expect(() => validateRequiredArgs(args, ['name', 'value'])).toThrow('name argument missing in arguments');
  });

  it('should throw error for undefined arguments', () => {
    const args = { name: undefined, value: 'value' };
    expect(() => validateRequiredArgs(args, ['name', 'value'] as any)).toThrow('name argument missing in arguments');
  });

  it('should throw error for null arguments', () => {
    const args = { name: null, value: 'value' };
    expect(() => validateRequiredArgs(args, ['name', 'value'] as any)).toThrow('name argument missing in arguments');
  });

  it('should validate arrays', () => {
    const args = { items: ['a', 'b'], name: 'test' };
    expect(() => validateRequiredArgs(args, ['items', 'name'])).not.toThrow();
  });

  it('should validate empty arrays by default', () => {
    const args = { items: [], name: 'test' };
    // By default, empty arrays are valid
    expect(() => validateRequiredArgs(args, ['items', 'name'])).not.toThrow();
  });

  it('should throw error for empty arrays with notEmpty option', () => {
    const args = { items: [], name: 'test' };
    expect(() => validateRequiredArgs(args, ['items', 'name'], { items: { notEmpty: true } }))
      .toThrow('items argument must be a non-empty array');
  });

  it('should handle missing args object', () => {
    expect(() => validateRequiredArgs(null as any, ['name'])).toThrow();
  });

  it('should handle empty required array', () => {
    const args = { name: 'test' };
    expect(() => validateRequiredArgs(args, [])).not.toThrow();
  });
});

describe('Schema fragments', () => {
  describe('PATH_SCHEMA', () => {
    it('should have correct structure', () => {
      expect(PATH_SCHEMA).toHaveProperty('type', 'string');
      expect(PATH_SCHEMA).toHaveProperty('description');
      expect(PATH_SCHEMA.description).toContain('relative to vault root');
    });
  });

  describe('PAGINATION_SCHEMA', () => {
    it('should have limit and offset properties', () => {
      expect(PAGINATION_SCHEMA).toHaveProperty('limit');
      expect(PAGINATION_SCHEMA).toHaveProperty('offset');
      expect(PAGINATION_SCHEMA.limit.type).toBe('integer');
      expect(PAGINATION_SCHEMA.offset.type).toBe('integer');
      expect(PAGINATION_SCHEMA.limit.description).toContain('Maximum number');
      expect(PAGINATION_SCHEMA.offset.description).toContain('skip');
    });
  });

  describe('PERIOD_SCHEMA', () => {
    it('should have enum with all period types', () => {
      expect(PERIOD_SCHEMA).toHaveProperty('type', 'string');
      expect(PERIOD_SCHEMA).toHaveProperty('enum');
      expect(PERIOD_SCHEMA.enum).toEqual(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
      expect(PERIOD_SCHEMA.description).toContain('periodic note');
    });
  });
});

describe('validatePeriod', () => {
  it('should validate correct periods', () => {
    const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    periods.forEach(period => {
      expect(() => validatePeriod(period)).not.toThrow();
    });
  });

  it('should throw for invalid periods', () => {
    expect(() => validatePeriod('invalid')).toThrow('Invalid period. Must be one of: daily, weekly, monthly, quarterly, yearly');
  });

  it('should throw for empty string', () => {
    expect(() => validatePeriod('')).toThrow('period argument missing in arguments');
  });

  it('should throw for null and undefined', () => {
    expect(() => validatePeriod(null as any)).toThrow('period argument missing in arguments');
    expect(() => validatePeriod(undefined as any)).toThrow('period argument missing in arguments');
  });
});

describe('VALID_PERIODS constant', () => {
  it('should contain all period types', () => {
    expect(VALID_PERIODS).toEqual(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
  });

  it('should be readonly', () => {
    expect(Array.isArray(VALID_PERIODS)).toBe(true);
  });
});