import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BaseTool, AnyTool } from './base.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Dynamically discover and instantiate all tool classes in the tools directory
 */
export async function discoverTools(): Promise<AnyTool[]> {
  const tools: AnyTool[] = [];
  
  try {
    // Read all files in the tools directory
    const files = await readdir(__dirname);
    
    // Filter for Tool files (excluding base, index, types, and discovery)
    const toolFiles = files.filter(file => 
      file.endsWith('Tool.ts') && 
      file !== 'BaseTool.ts' &&
      !file.startsWith('base') &&
      !file.includes('.test.')
    );
    
    // Dynamically import and instantiate each tool
    for (const file of toolFiles) {
      try {
        const modulePath = `./${file.replace('.ts', '.js')}`;
        const module = await import(modulePath);
        
        // Find the exported tool class (should match filename)
        const className = file.replace('.ts', '');
        const ToolClass = module[className];
        
        if (ToolClass && typeof ToolClass === 'function') {
          const instance = new ToolClass();
          
          // Verify it's actually a tool
          if (instance instanceof BaseTool) {
            tools.push(instance);
          }
        }
      } catch (error) {
        console.error(`Failed to load tool from ${file}:`, error);
      }
    }
    
    // Sort tools by name for consistent ordering
    tools.sort((a, b) => a.name.localeCompare(b.name));
    
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