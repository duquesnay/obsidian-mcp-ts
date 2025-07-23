import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

export interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export type ResourceHandler = (uri: string, server?: any) => Promise<ReadResourceResult>;