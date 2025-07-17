export class ObsidianError extends Error {
  public code: number;

  constructor(message: string, code: number = -1) {
    super(message);
    this.name = 'ObsidianError';
    this.code = code;
  }
}

// Simplified error response structure
export interface SimplifiedError {
  success: false;
  error: string;
  tool: string;
  suggestion?: string;
  example?: Record<string, unknown>;
}