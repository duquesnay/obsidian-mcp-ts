/**
 * Type guards and utilities for error handling
 */

import type { ToolResponse } from '../tools/base.js';

/**
 * Interface for errors with HTTP response
 */
export interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

/**
 * Type guard to check if an error has a response property with status
 */
export function hasHttpResponse(error: unknown): error is ErrorWithResponse {
  return !!(
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as any).response &&
    typeof (error as any).response === 'object' &&
    'status' in (error as any).response &&
    typeof (error as any).response.status === 'number'
  );
}

/**
 * Type guard to check if an error has a message property
 */
export function hasMessage(error: unknown): error is { message: string } {
  return !!(
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

/**
 * Get the HTTP status code from an error if it exists
 */
export function getHttpStatus(error: unknown): number | undefined {
  if (hasHttpResponse(error)) {
    return error.response?.status;
  }
  return undefined;
}

/**
 * Get the error message from an error if it exists
 */
export function getErrorMessage(error: unknown): string {
  if (hasMessage(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Type guard to check if a value is a valid ToolResponse
 * ToolResponse must have exactly type: 'text' and text: string properties
 */
export function isToolResponse(value: unknown): value is ToolResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  // Check if it has exactly the required properties
  const keys = Object.keys(obj);
  if (keys.length !== 2 || !keys.includes('type') || !keys.includes('text')) {
    return false;
  }
  
  // Check if type is exactly 'text' and text is a string
  return obj.type === 'text' && typeof obj.text === 'string';
}