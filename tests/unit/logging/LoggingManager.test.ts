import { describe, it, expect, beforeEach } from 'vitest';
import { LoggingManager } from '../../../src/logging/LoggingManager.js';
import { LogLevel } from '../../../src/logging/types.js';

describe('LoggingManager', () => {
  let manager: LoggingManager;

  beforeEach(() => {
    manager = new LoggingManager();
  });

  describe('log()', () => {
    it('should add log entry to buffer', () => {
      const result = manager.log({
        timestamp: new Date(),
        level: 'info',
        message: 'Test message',
      });

      expect(result).toBe(true);
      expect(manager.getEntries()).toHaveLength(1);
      expect(manager.getEntries()[0].message).toBe('Test message');
    });

    it('should filter logs below minimum level', () => {
      manager.setConfig({ minLevel: 'warning' });

      const infoResult = manager.log({
        timestamp: new Date(),
        level: 'info',
        message: 'Info message',
      });

      const warningResult = manager.log({
        timestamp: new Date(),
        level: 'warning',
        message: 'Warning message',
      });

      expect(infoResult).toBe(false);
      expect(warningResult).toBe(true);
      expect(manager.getEntries()).toHaveLength(1);
      expect(manager.getEntries()[0].message).toBe('Warning message');
    });

    it('should include error details when provided', () => {
      const error = new Error('Test error');
      manager.log({
        timestamp: new Date(),
        level: 'error',
        message: 'Error occurred',
        error,
      });

      const entries = manager.getEntries();
      expect(entries[0].error).toBeDefined();
      expect(entries[0].error?.message).toBe('Test error');
    });
  });

  describe('Circular buffer behavior', () => {
    it('should respect maxEntries limit', () => {
      manager = new LoggingManager({ maxEntries: 3 });

      for (let i = 0; i < 5; i++) {
        manager.log({
          timestamp: new Date(),
          level: 'info',
          message: `Message ${i}`,
        });
      }

      const entries = manager.getEntries();
      expect(entries).toHaveLength(3);
      // Should keep the newest 3 entries
      expect(entries[0].message).toBe('Message 2');
      expect(entries[1].message).toBe('Message 3');
      expect(entries[2].message).toBe('Message 4');
    });

    it('should maintain chronological order after buffer wraps', () => {
      manager = new LoggingManager({ maxEntries: 3 });

      const timestamps: Date[] = [];
      for (let i = 0; i < 5; i++) {
        const ts = new Date(Date.now() + i * 1000);
        timestamps.push(ts);
        manager.log({
          timestamp: ts,
          level: 'info',
          message: `Message ${i}`,
        });
      }

      const entries = manager.getEntries();
      // Verify entries are in chronological order
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          entries[i - 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Convenience methods', () => {
    it('logMessage() should create entry with all fields', () => {
      manager.logMessage('info', 'Test message', 'TestTool', { key: 'value' });

      const entries = manager.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('info');
      expect(entries[0].message).toBe('Test message');
      expect(entries[0].toolName).toBe('TestTool');
      expect(entries[0].context).toEqual({ key: 'value' });
    });

    it('logError() should create error entry', () => {
      const error = new Error('Test error');
      manager.logError('Error occurred', error, 'TestTool', { attempt: 1 });

      const entries = manager.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('error');
      expect(entries[0].error).toBe(error);
    });
  });

  describe('Filtering methods', () => {
    beforeEach(() => {
      // Add various log entries
      manager.logMessage('debug', 'Debug message');
      manager.logMessage('info', 'Info message', 'Tool1');
      manager.logMessage('warning', 'Warning message', 'Tool2');
      manager.logError('Error message', new Error('test'), 'Tool1');
    });

    it('getEntriesByLevel() should filter by minimum level', () => {
      const warningAndAbove = manager.getEntriesByLevel('warning');
      expect(warningAndAbove).toHaveLength(2);
      expect(warningAndAbove[0].level).toBe('warning');
      expect(warningAndAbove[1].level).toBe('error');
    });

    it('getEntriesByTool() should filter by tool name', () => {
      const tool1Entries = manager.getEntriesByTool('Tool1');
      expect(tool1Entries).toHaveLength(2);
      expect(tool1Entries.every((e) => e.toolName === 'Tool1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('getStats() should return accurate statistics', () => {
      manager.logMessage('info', 'Message 1', 'Tool1');
      manager.logMessage('info', 'Message 2', 'Tool1');
      manager.logMessage('warning', 'Message 3', 'Tool2');
      manager.logMessage('error', 'Message 4');

      const stats = manager.getStats();
      expect(stats.total).toBe(4);
      expect(stats.byLevel.info).toBe(2);
      expect(stats.byLevel.warning).toBe(1);
      expect(stats.byLevel.error).toBe(1);
      expect(stats.byTool.Tool1).toBe(2);
      expect(stats.byTool.Tool2).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = manager.getConfig();
      expect(config.maxEntries).toBe(1000);
      expect(config.minLevel).toBe('debug');
      expect(config.sendToClient).toBe(true);
      expect(config.logToConsole).toBe(false);
    });

    it('should accept custom configuration', () => {
      manager = new LoggingManager({
        maxEntries: 500,
        minLevel: 'warning',
        sendToClient: false,
        logToConsole: true,
      });

      const config = manager.getConfig();
      expect(config.maxEntries).toBe(500);
      expect(config.minLevel).toBe('warning');
      expect(config.sendToClient).toBe(false);
      expect(config.logToConsole).toBe(true);
    });

    it('should allow runtime configuration updates', () => {
      manager.setConfig({ minLevel: 'error' });
      expect(manager.getConfig().minLevel).toBe('error');

      // Verify filtering works with new config
      manager.logMessage('info', 'Info message');
      manager.logMessage('error', 'Error message');

      expect(manager.getEntries()).toHaveLength(1);
      expect(manager.getEntries()[0].level).toBe('error');
    });
  });

  describe('clear()', () => {
    it('should remove all log entries', () => {
      manager.logMessage('info', 'Message 1');
      manager.logMessage('info', 'Message 2');
      expect(manager.getEntries()).toHaveLength(2);

      manager.clear();
      expect(manager.getEntries()).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should log entries in less than 1ms each', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        manager.log({
          timestamp: new Date(),
          level: 'info',
          message: `Message ${i}`,
        });
      }

      const duration = Date.now() - start;
      const avgPerLog = duration / iterations;

      // Should average less than 1ms per log entry
      expect(avgPerLog).toBeLessThan(1);
    });
  });
});
