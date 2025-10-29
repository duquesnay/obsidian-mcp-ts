/**
 * MCP logging levels (from SDK specification)
 * Ordered by severity: debug < info < notice < warning < error < critical < alert < emergency
 */
export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

/**
 * Numeric severity for log level filtering
 */
export const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  notice: 2,
  warning: 3,
  error: 4,
  critical: 5,
  alert: 6,
  emergency: 7,
};

/**
 * Log entry structure stored in the circular buffer
 */
export interface LogEntry {
  /** Timestamp when the log was created */
  timestamp: Date;

  /** Log severity level */
  level: LogLevel;

  /** Log message */
  message: string;

  /** Tool name if this log is related to a tool call */
  toolName?: string;

  /** Additional context data */
  context?: Record<string, unknown>;

  /** Optional error if this is an error log */
  error?: Error;
}

/**
 * Configuration for the logging manager
 */
export interface LoggingConfig {
  /** Maximum number of log entries to keep in memory (default: 1000) */
  maxEntries?: number;

  /** Minimum log level to capture (default: 'debug') */
  minLevel?: LogLevel;

  /** Whether to send logs to MCP client (default: true) */
  sendToClient?: boolean;

  /** Whether to log to console for debugging (default: false) */
  logToConsole?: boolean;
}
