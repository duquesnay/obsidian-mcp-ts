#!/usr/bin/env tsx
/**
 * Script to refactor tools with pagination to use PAGINATION_SCHEMA
 */

import * as fs from 'fs';
import * as path from 'path';

const toolsDir = path.join(process.cwd(), 'src', 'tools');

const TOOLS_TO_UPDATE = [
  'GetAllTagsTool.ts',
  'GetRecentChangesTool.ts',
  'ListFilesInDirTool.ts',
  'ListFilesInVaultTool.ts'
];

async function refactorTool(fileName: string): Promise<void> {
  const filePath = path.join(toolsDir, fileName);
  let content = await fs.promises.readFile(filePath, 'utf-8');
  
  // Skip if already refactored
  if (content.includes('PAGINATION_SCHEMA')) {
    console.log(`  ${fileName} - Already refactored, skipping`);
    return;
  }

  // Add import if not present
  if (!content.includes("import { validateRequiredArgs") && !content.includes("} from '../utils/validation.js'")) {
    // Find the last import line
    const importLines = content.split('\n').filter(line => line.startsWith('import'));
    const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
    const insertPosition = content.indexOf('\n', lastImportIndex) + 1;
    
    content = content.slice(0, insertPosition) + 
      "import { PAGINATION_SCHEMA } from '../utils/validation.js';\n" + 
      content.slice(insertPosition);
  } else if (content.includes("import {") && content.includes("} from '../utils/validation.js'")) {
    // Add PAGINATION_SCHEMA to existing import
    content = content.replace(
      /import\s*{\s*([^}]+)\s*}\s*from\s*'\.\.\/utils\/validation\.js'/,
      (match, imports) => {
        if (!imports.includes('PAGINATION_SCHEMA')) {
          return `import { ${imports}, PAGINATION_SCHEMA } from '../utils/validation.js'`;
        }
        return match;
      }
    );
  }

  // Replace limit property
  content = content.replace(
    /limit:\s*{\s*type:\s*'integer'[^}]*}/gs,
    (match) => {
      // Check if it has custom max/default values
      const hasCustomMax = match.includes('maximum:') && !match.includes('maximum: 1000');
      const hasCustomDefault = match.includes('default:') && !match.includes('default: 100');
      
      if (hasCustomMax || hasCustomDefault) {
        // Extract custom values
        const maxMatch = match.match(/maximum:\s*([^,\s}]+)/);
        const defaultMatch = match.match(/default:\s*([^,\s}]+)/);
        
        let replacement = '{\n        ...PAGINATION_SCHEMA.limit';
        if (hasCustomDefault) {
          replacement += `,\n        default: ${defaultMatch![1]}`;
        }
        if (hasCustomMax) {
          replacement += `,\n        maximum: ${maxMatch![1]}`;
        }
        replacement += '\n      }';
        return replacement;
      } else {
        return 'PAGINATION_SCHEMA.limit';
      }
    }
  );

  // Replace offset property
  content = content.replace(
    /offset:\s*{\s*type:\s*'integer'[^}]*}/gs,
    'PAGINATION_SCHEMA.offset'
  );

  await fs.promises.writeFile(filePath, content);
  console.log(`  ${fileName} - Refactored successfully`);
}

async function main() {
  console.log('Refactoring tools with pagination parameters...\n');
  
  for (const tool of TOOLS_TO_UPDATE) {
    try {
      await refactorTool(tool);
    } catch (error) {
      console.error(`  ${tool} - Error: ${error}`);
    }
  }
  
  console.log('\nRefactoring complete!');
}

main().catch(console.error);