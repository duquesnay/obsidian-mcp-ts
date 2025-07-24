#!/usr/bin/env tsx
/**
 * Script to analyze validation patterns across all tools
 * Helps identify tools that can be refactored to use the new validation utilities
 */

import * as fs from 'fs';
import * as path from 'path';

const toolsDir = path.join(process.cwd(), 'src', 'tools');

interface ValidationPattern {
  file: string;
  patterns: {
    requiredArgsCheck: string[];
    periodValidation: boolean;
    pathValidation: boolean;
    paginationParams: boolean;
    tagsValidation: boolean;
  };
}

async function analyzeFile(filePath: string): Promise<ValidationPattern | null> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  
  // Skip non-tool files
  if (!content.includes('extends BaseTool') || filePath.includes('.test.')) {
    return null;
  }

  const fileName = path.basename(filePath);
  const pattern: ValidationPattern = {
    file: fileName,
    patterns: {
      requiredArgsCheck: [],
      periodValidation: false,
      pathValidation: false,
      paginationParams: false,
      tagsValidation: false
    }
  };

  // Check for required args validation patterns
  const requiredArgsPatterns = [
    /if\s*\(\s*!args\.(\w+)\s*\)/g,
    /(\w+)\s+argument\s+missing\s+in\s+arguments/g,
    /throw\s+new\s+Error\s*\(\s*['"](\w+)\s+argument\s+missing/g
  ];

  requiredArgsPatterns.forEach(regex => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const argName = match[1];
      if (argName && !pattern.patterns.requiredArgsCheck.includes(argName)) {
        pattern.patterns.requiredArgsCheck.push(argName);
      }
    }
  });

  // Check for period validation
  if (/validPeriods\s*=\s*\[.*daily.*weekly.*monthly/.test(content) || 
      /period.*daily.*weekly.*monthly/.test(content)) {
    pattern.patterns.periodValidation = true;
  }

  // Check for path validation
  if (/PathValidationUtil\.validate/.test(content)) {
    pattern.patterns.pathValidation = true;
  }

  // Check for pagination parameters
  if (/limit:\s*{[\s\S]*?type:\s*['"]integer/.test(content) && 
      /offset:\s*{[\s\S]*?type:\s*['"]integer/.test(content)) {
    pattern.patterns.paginationParams = true;
  }

  // Check for tags validation
  if (/tags.*must\s+be.*array/.test(content) || 
      /Array\.isArray\(.*tags/.test(content)) {
    pattern.patterns.tagsValidation = true;
  }

  return pattern;
}

async function main() {
  const files = await fs.promises.readdir(toolsDir);
  const toolFiles = files.filter(f => f.endsWith('.ts') && f !== 'base.ts');
  
  const results: ValidationPattern[] = [];
  
  for (const file of toolFiles) {
    const result = await analyzeFile(path.join(toolsDir, file));
    if (result) {
      results.push(result);
    }
  }

  console.log('=== Validation Pattern Analysis ===\n');
  
  console.log('Tools with required args validation:');
  results
    .filter(r => r.patterns.requiredArgsCheck.length > 0)
    .forEach(r => {
      console.log(`  ${r.file}: ${r.patterns.requiredArgsCheck.join(', ')}`);
    });

  console.log('\nTools with period validation:');
  results
    .filter(r => r.patterns.periodValidation)
    .forEach(r => console.log(`  ${r.file}`));

  console.log('\nTools with path validation:');
  results
    .filter(r => r.patterns.pathValidation)
    .forEach(r => console.log(`  ${r.file}`));

  console.log('\nTools with pagination parameters:');
  results
    .filter(r => r.patterns.paginationParams)
    .forEach(r => console.log(`  ${r.file}`));

  console.log('\nTools with tags validation:');
  results
    .filter(r => r.patterns.tagsValidation)
    .forEach(r => console.log(`  ${r.file}`));

  // Summary
  const totalTools = results.length;
  const needsRefactoring = results.filter(r => 
    r.patterns.requiredArgsCheck.length > 0 ||
    r.patterns.periodValidation ||
    r.patterns.paginationParams ||
    r.patterns.tagsValidation
  ).length;

  console.log(`\n=== Summary ===`);
  console.log(`Total tools analyzed: ${totalTools}`);
  console.log(`Tools that could benefit from refactoring: ${needsRefactoring}`);
}

main().catch(console.error);