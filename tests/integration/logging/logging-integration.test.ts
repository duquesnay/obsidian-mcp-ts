import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerLogging } from '../../../src/logging/index.js';
import { LoggingHandler } from '../../../src/logging/LoggingHandler.js';

describe('Logging Integration', () => {
  let server: Server;
  let loggingHandler: LoggingHandler;

  beforeEach(async () => {
    // Create a test server
    server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          logging: {},
        },
      }
    );

    // Register logging
    loggingHandler = await registerLogging(server, {
      maxEntries: 100,
      minLevel: 'debug',
      sendToClient: false, // Don't attempt to send during tests
      logToConsole: false,
    });
  });

  describe('registerLogging()', () => {
    it('should create and configure logging handler', () => {
      expect(loggingHandler).toBeDefined();
      expect(loggingHandler.getManager()).toBeDefined();
    });

    it('should log initialization message', () => {
      const entries = loggingHandler.getManager().getEntries();
      expect(entries.length).toBeGreaterThan(0);

      const initLog = entries.find((e) => e.message.includes('Logging system initialized'));
      expect(initLog).toBeDefined();
      expect(initLog?.level).toBe('info');
    });
  });

  describe('LoggingHandler', () => {
    it('should log messages with correct metadata', async () => {
      await loggingHandler.logMessage('info', 'Test message', 'TestTool', {
        testKey: 'testValue',
      });

      const entries = loggingHandler.getManager().getEntries();
      const testLog = entries.find((e) => e.message === 'Test message');

      expect(testLog).toBeDefined();
      expect(testLog?.level).toBe('info');
      expect(testLog?.toolName).toBe('TestTool');
      expect(testLog?.context).toEqual({ testKey: 'testValue' });
    });

    it('should log errors with error details', async () => {
      const testError = new Error('Test error message');
      await loggingHandler.logError('Error occurred', testError, 'ToolName');

      const entries = loggingHandler.getManager().getEntries();
      const errorLog = entries.find((e) => e.message === 'Error occurred');

      expect(errorLog).toBeDefined();
      expect(errorLog?.level).toBe('error');
      expect(errorLog?.error).toBe(testError);
      expect(errorLog?.toolName).toBe('ToolName');
    });
  });

  describe('Level filtering', () => {
    it('should respect minimum log level', async () => {
      // Reconfigure with higher minimum level
      loggingHandler.getManager().setConfig({ minLevel: 'warning' });

      await loggingHandler.logMessage('debug', 'Debug message');
      await loggingHandler.logMessage('info', 'Info message');
      await loggingHandler.logMessage('warning', 'Warning message');
      await loggingHandler.logMessage('error', 'Error message');

      const entries = loggingHandler.getManager().getEntries();

      // Should only have warning and error (plus any initialization logs that were warning+)
      const debugLog = entries.find((e) => e.message === 'Debug message');
      const infoLog = entries.find((e) => e.message === 'Info message');
      const warningLog = entries.find((e) => e.message === 'Warning message');
      const errorLog = entries.find((e) => e.message === 'Error message');

      expect(debugLog).toBeUndefined();
      expect(infoLog).toBeUndefined();
      expect(warningLog).toBeDefined();
      expect(errorLog).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should track statistics across multiple log operations', async () => {
      await loggingHandler.logMessage('info', 'Message 1', 'Tool1');
      await loggingHandler.logMessage('info', 'Message 2', 'Tool1');
      await loggingHandler.logMessage('warning', 'Message 3', 'Tool2');
      await loggingHandler.logError('Message 4', new Error('test'), 'Tool1');

      const stats = loggingHandler.getManager().getStats();

      expect(stats.byTool.Tool1).toBeGreaterThanOrEqual(3);
      expect(stats.byTool.Tool2).toBeGreaterThanOrEqual(1);
      expect(stats.byLevel.info).toBeGreaterThan(0);
      expect(stats.byLevel.warning).toBeGreaterThan(0);
      expect(stats.byLevel.error).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should use provided configuration', async () => {
      const customHandler = await registerLogging(server, {
        maxEntries: 50,
        minLevel: 'warning',
        sendToClient: false,
        logToConsole: false,
      });

      const config = customHandler.getManager().getConfig();
      expect(config.maxEntries).toBe(50);
      expect(config.minLevel).toBe('warning');
      expect(config.sendToClient).toBe(false);
      expect(config.logToConsole).toBe(false);
    });
  });
});
