import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BaseTool, AnyTool } from './base.js';
import { isTestEnvironment } from '../utils/environment.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type for validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Type guard to check if a value is a valid tool class constructor
 */
export function isValidToolClass(value: unknown): value is typeof BaseTool {
  // Must be a function (constructor)
  if (typeof value !== 'function') {
    return false;
  }
  
  // Must have a prototype
  if (!value.prototype) {
    return false;
  }
  
  // Try to create an instance and check if it extends BaseTool
  try {
    const instance = new (value as any)();
    return instance instanceof BaseTool;
  } catch {
    // If instantiation fails, it's not a valid tool class
    return false;
  }
}

/**
 * Validate that a tool instance has all required properties with correct types
 */
export function validateToolInstance(tool: unknown, className: string): ValidationResult {
  const errors: string[] = [];
  
  // Check if it's an instance of BaseTool
  if (!(tool instanceof BaseTool)) {
    errors.push('Tool must be an instance of BaseTool');
    return { isValid: false, errors };
  }
  
  // Check required properties
  const requiredProps: Array<[string, string]> = [
    ['name', 'string'],
    ['description', 'string'],
    ['inputSchema', 'object']
  ];
  
  for (const [prop, expectedType] of requiredProps) {
    if (!(prop in tool)) {
      errors.push(`Missing required property: ${prop}`);
    } else {
      const value = (tool as any)[prop];
      const actualType = typeof value;
      
      // Special handling for null values (typeof null === 'object')
      if (value === null || actualType !== expectedType) {
        errors.push(`Property "${prop}" must be a ${expectedType}`);
      }
    }
  }
  
  // Validate inputSchema structure - only if it's actually an object
  if ('inputSchema' in tool && typeof (tool as any).inputSchema === 'object' && (tool as any).inputSchema !== null) {
    const schema = (tool as any).inputSchema;
    
    // Check type property
    if (!schema.type || schema.type !== 'object') {
      errors.push('inputSchema.type must be "object"');
    }
    
    // Check properties object
    if (!schema.properties || typeof schema.properties !== 'object') {
      errors.push('inputSchema must have a "properties" object');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Dynamically discover and instantiate all tool classes in the tools directory
 */
export async function discoverTools(): Promise<AnyTool[]> {
  const tools: AnyTool[] = [];
  
  try {
    // Read all files in the tools directory
    const files = await readdir(__dirname);
    
    // Filter for Tool files (excluding base, index, types, and discovery)
    // In development, we have .ts files; in production, we have .js files
    const toolFiles = files.filter(file => 
      (file.endsWith('Tool.ts') || file.endsWith('Tool.js')) && 
      file !== 'BaseTool.ts' &&
      file !== 'BaseTool.js' &&
      !file.startsWith('base') &&
      !file.includes('.test.')
    );
    
    if (!isTestEnvironment()) {
      console.error(`Found ${toolFiles.length} tool files to load`);
    }
    
    // Dynamically import and instantiate each tool
    for (const file of toolFiles) {
      try {
        const modulePath = `./${file.replace('.ts', '.js').replace('.js.js', '.js')}`;
        const module = await import(modulePath);
        
        // Find the exported tool class (should match filename)
        const className = file.replace('.ts', '').replace('.js', '');
        const ToolClass = module[className];
        
        // Validate that it's a valid tool class
        if (!isValidToolClass(ToolClass)) {
          console.error(`${className} is not a valid tool class`, file);
          continue;
        }
        
        // Create instance with error handling
        let instance: unknown;
        try {
          instance = new ToolClass();
        } catch (constructorError) {
          console.error(`Failed to instantiate ${className}:`, constructorError);
          continue;
        }
        
        // Validate the instance has all required properties
        const validation = validateToolInstance(instance, className);
        if (!validation.isValid) {
          console.error(`Tool validation failed for ${className}:`, validation.errors);
          continue;
        }
        
        // Type assertion is safe after validation
        tools.push(instance as AnyTool);
      } catch (error) {
        console.error(`Failed to load tool from ${file}:`, error);
      }
    }
    
    // Sort tools by name for consistent ordering
    tools.sort((a, b) => a.name.localeCompare(b.name));
    
    if (!isTestEnvironment()) {
      console.error(`Successfully loaded ${tools.length} tools`);
    }
    return tools;
  } catch (error) {
    console.error('Failed to discover tools:', error);
    return [];
  }
}

/**
 * Get tool metadata for registration
 */
export function getToolMetadata(tool: AnyTool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
}

/**
 * Get tools grouped by category
 */
export function getToolsByCategory(tools: AnyTool[]): Map<string, AnyTool[]> {
  const categorized = new Map<string, AnyTool[]>();
  
  tools.forEach(tool => {
    const category = tool.metadata?.category || 'uncategorized';
    if (!categorized.has(category)) {
      categorized.set(category, []);
    }
    categorized.get(category)!.push(tool);
  });
  
  return categorized;
}