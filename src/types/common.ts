/**
 * Common type definitions used throughout the codebase
 */

import type { ObsidianClient } from '../obsidian/ObsidianClient.js';

/**
 * HTTP error response structure
 */
export interface HttpError extends Error {
  response?: {
    status: number;
    statusText?: string;
    data?: unknown;
  };
}

/**
 * Server context passed to resource handlers
 */
export interface ServerContext {
  obsidianClient?: ObsidianClient;
  [key: string]: unknown;
}

/**
 * JSON-serializable data
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}

/**
 * Generic API response
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers?: Record<string, string>;
}

/**
 * File system error
 */
export interface FileSystemError extends Error {
  code?: string;
  path?: string;
  syscall?: string;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: Error;
  }>;
}