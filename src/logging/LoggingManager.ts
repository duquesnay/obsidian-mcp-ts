import {
  LogEntry,
  LogLevel,
  LoggingConfig,
  LOG_LEVEL_SEVERITY,
} from './types.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<LoggingConfig> = {
  maxEntries: 1000,
  minLevel: 'debug',
  sendToClient: true,
  logToConsole: false,
};

/**
 * Manages log entries with circular buffer and level filtering
 *
 * Features:
 * - Circular buffer with configurable max size
 * - Log level filtering
 * - Performance: <1ms overhead per log entry
 */
export class LoggingManager {
  private entries: LogEntry[] = [];
  private config: Required<LoggingConfig>;
  private head = 0; // Index of oldest entry
  private size = 0; // Current number of entries

  constructor(config: LoggingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a log entry to the buffer
   * @param entry Log entry to add
   * @returns true if entry was added, false if filtered out
   */
  public log(entry: LogEntry): boolean {
    // Filter by level
    if (!this.shouldLog(entry.level)) {
      return false;
    }

    // Optional console logging for debugging
    if (this.config.logToConsole) {
      this.logToConsole(entry);
    }

    // Add to circular buffer
    if (this.size < this.config.maxEntries) {
      // Buffer not full yet, just append
      this.entries.push(entry);
      this.size++;
    } else {
      // Buffer full, overwrite oldest entry
      this.entries[this.head] = entry;
      this.head = (this.head + 1) % this.config.maxEntries;
    }

    return true;
  }

  /**
   * Convenience method to log a message
   */
  public logMessage(
    level: LogLevel,
    message: string,
    toolName?: string,
    context?: Record<string, unknown>
  ): boolean {
    return this.log({
      timestamp: new Date(),
      level,
      message,
      toolName,
      context,
    });
  }

  /**
   * Convenience method to log an error
   */
  public logError(
    message: string,
    error: Error,
    toolName?: string,
    context?: Record<string, unknown>
  ): boolean {
    return this.log({
      timestamp: new Date(),
      level: 'error',
      message,
      toolName,
      context,
      error,
    });
  }

  /**
   * Get all log entries in chronological order
   */
  public getEntries(): LogEntry[] {
    if (this.size < this.config.maxEntries) {
      // Buffer not full, return all entries
      return [...this.entries];
    } else {
      // Buffer full, return in correct order (oldest to newest)
      return [
        ...this.entries.slice(this.head),
        ...this.entries.slice(0, this.head),
      ];
    }
  }

  /**
   * Get entries filtered by level
   */
  public getEntriesByLevel(minLevel: LogLevel): LogEntry[] {
    const minSeverity = LOG_LEVEL_SEVERITY[minLevel];
    return this.getEntries().filter(
      (entry) => LOG_LEVEL_SEVERITY[entry.level] >= minSeverity
    );
  }

  /**
   * Get entries for a specific tool
   */
  public getEntriesByTool(toolName: string): LogEntry[] {
    return this.getEntries().filter((entry) => entry.toolName === toolName);
  }

  /**
   * Clear all log entries
   */
  public clear(): void {
    this.entries = [];
    this.head = 0;
    this.size = 0;
  }

  /**
   * Get statistics about logged entries
   */
  public getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byTool: Record<string, number>;
  } {
    const entries = this.getEntries();
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      notice: 0,
      warning: 0,
      error: 0,
      critical: 0,
      alert: 0,
      emergency: 0,
    };
    const byTool: Record<string, number> = {};

    for (const entry of entries) {
      byLevel[entry.level]++;
      if (entry.toolName) {
        byTool[entry.toolName] = (byTool[entry.toolName] || 0) + 1;
      }
    }

    return {
      total: entries.length,
      byLevel,
      byTool,
    };
  }

  /**
   * Update configuration
   */
  public setConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): Required<LoggingConfig> {
    return { ...this.config };
  }

  /**
   * Check if a log level should be captured
   */
  private shouldLog(level: LogLevel): boolean {
    const entrySeverity = LOG_LEVEL_SEVERITY[level];
    const minSeverity = LOG_LEVEL_SEVERITY[this.config.minLevel];
    return entrySeverity >= minSeverity;
  }

  /**
   * Log entry to console for debugging
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}]`;
    const tool = entry.toolName ? ` [${entry.toolName}]` : '';
    const message = `${prefix}${tool} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
      case 'info':
      case 'notice':
        console.log(message, entry.context || '');
        break;
      case 'warning':
        console.warn(message, entry.context || '');
        break;
      case 'error':
      case 'critical':
      case 'alert':
      case 'emergency':
        console.error(message, entry.context || '', entry.error || '');
        break;
    }
  }
}
