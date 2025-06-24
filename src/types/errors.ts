export class ObsidianError extends Error {
  public code: number;

  constructor(message: string, code: number = -1) {
    super(message);
    this.name = 'ObsidianError';
    this.code = code;
  }
}