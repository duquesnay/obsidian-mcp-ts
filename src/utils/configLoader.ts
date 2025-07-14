import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface ObsidianConfig {
  apiKey?: string;
  host?: string;
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: ObsidianConfig | null = null;
  
  private constructor() {}
  
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }
  
  /**
   * Load configuration with the following precedence:
   * 1. Environment variables (OBSIDIAN_API_KEY, OBSIDIAN_HOST)
   * 2. Config file specified by OBSIDIAN_CONFIG_FILE env var
   * 3. Default config file at ~/.config/mcp/obsidian.json
   */
  loadConfig(): ObsidianConfig {
    if (this.config) {
      return this.config;
    }
    
    // Start with environment variables
    this.config = {
      apiKey: process.env.OBSIDIAN_API_KEY,
      host: process.env.OBSIDIAN_HOST
    };
    
    // Try to load from config file
    const configFromFile = this.loadConfigFile();
    if (configFromFile) {
      // Config file values don't override env vars
      this.config = {
        apiKey: this.config.apiKey || configFromFile.apiKey,
        host: this.config.host || configFromFile.host
      };
    }
    
    return this.config;
  }
  
  private loadConfigFile(): ObsidianConfig | null {
    // Check for custom config file path
    const customPath = process.env.OBSIDIAN_CONFIG_FILE;
    if (customPath) {
      return this.readConfigFile(customPath);
    }
    
    // Check default location
    const defaultPath = join(homedir(), '.config', 'mcp', 'obsidian.json');
    return this.readConfigFile(defaultPath);
  }
  
  private readConfigFile(path: string): ObsidianConfig | null {
    try {
      if (!existsSync(path)) {
        return null;
      }
      
      const content = readFileSync(path, 'utf-8');
      const config = JSON.parse(content);
      
      // Validate config structure
      if (typeof config !== 'object') {
        // Only log config errors in non-test environments to avoid confusing test output
        if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
          console.warn(`Invalid config file at ${path}: not an object`);
        }
        return null;
      }
      
      // Extract only the fields we care about
      const result: ObsidianConfig = {};
      
      if (typeof config.apiKey === 'string') {
        result.apiKey = config.apiKey;
      }
      
      if (typeof config.host === 'string') {
        result.host = config.host;
      }
      
      return result;
    } catch (error) {
      // Only log config errors in non-test environments to avoid confusing test output
      if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
        console.warn(`Failed to read config file at ${path}:`, error);
      }
      return null;
    }
  }
  
  getApiKey(): string {
    const config = this.loadConfig();
    if (!config.apiKey) {
      throw new Error(
        'OBSIDIAN_API_KEY not found. Please provide it via:\n' +
        '1. OBSIDIAN_API_KEY environment variable\n' +
        '2. Config file at ~/.config/mcp/obsidian.json\n' +
        '3. Custom config file via OBSIDIAN_CONFIG_FILE environment variable'
      );
    }
    return config.apiKey;
  }
  
  getHost(): string {
    const config = this.loadConfig();
    return config.host || '127.0.0.1';
  }
  
  // For testing
  reset(): void {
    this.config = null;
  }
}