import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Resource metadata included in _meta field
 * Per MCP spec, _meta is optional and can contain arbitrary metadata
 */
export interface ResourceMetadata {
  /** File size in bytes */
  size: number;
  /** Human-readable file size (e.g., "1.5 KB") */
  sizeFormatted: string;
  /** Last modified timestamp in ISO 8601 format (UTC) */
  lastModified: string;
}

/**
 * MCP Resource definition
 * The _meta field is optional per MCP spec and contains resource metadata
 */
export interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  /** Optional metadata about the resource */
  _meta?: ResourceMetadata;
}

export type ResourceHandler = (uri: string, server?: any) => Promise<ReadResourceResult>;