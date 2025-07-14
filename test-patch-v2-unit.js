#!/usr/bin/env node

/**
 * Unit test for patch_content_v2 parameter validation and error handling
 */

import { PatchContentToolV2 } from './dist/tools/PatchContentToolV2.js';

async function testParameterValidation() {
  const tool = new PatchContentToolV2();
  
  console.log('Testing PatchContentToolV2 parameter validation and error handling\n');
  
  const testCases = [
    {
      name: 'Simple append operation',
      args: {
        filepath: 'test.md',
        append: '\n- New task added'
      },
      shouldPass: true
    },
    {
      name: 'Prepend operation',
      args: {
        filepath: 'test.md',
        prepend: '## New Section\n'
      },
      shouldPass: true
    },
    {
      name: 'Replace operation',
      args: {
        filepath: 'test.md',
        replace: { find: 'old', with: 'new' }
      },
      shouldPass: true
    },
    {
      name: 'Insert after heading',
      args: {
        filepath: 'test.md',
        insertAfterHeading: { heading: 'Introduction', content: 'New content' }
      },
      shouldPass: true
    },
    {
      name: 'Update frontmatter',
      args: {
        filepath: 'test.md',
        updateFrontmatter: { tags: ['done'], status: 'completed' }
      },
      shouldPass: true
    },
    {
      name: 'No operation specified',
      args: {
        filepath: 'test.md'
      },
      shouldPass: false,
      expectedError: 'No operation specified'
    },
    {
      name: 'Multiple operations specified',
      args: {
        filepath: 'test.md',
        append: 'text',
        prepend: 'other text'
      },
      shouldPass: false,
      expectedError: 'Only one operation'
    },
    {
      name: 'Invalid content format (array)',
      args: {
        filepath: 'test.md',
        append: [{type: 'text', text: 'content'}]
      },
      shouldPass: true  // Should auto-convert
    },
    {
      name: 'Advanced operation format',
      args: {
        filepath: 'test.md',
        operation: {
          type: 'replace',
          find: 'TODO',
          replace: 'DONE',
          all: true
        }
      },
      shouldPass: true
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    try {
      // Validate parameters
      const validation = tool.validateParameters(testCase.args);
      
      if (testCase.shouldPass) {
        console.log(`✅ Passed - Valid parameters`);
        console.log(`   Normalized args:`, JSON.stringify(validation, null, 2));
      } else {
        console.log(`❌ Failed - Expected error but validation passed`);
      }
    } catch (error) {
      if (!testCase.shouldPass && error.message.includes(testCase.expectedError)) {
        console.log(`✅ Passed - Got expected error: "${error.message}"`);
      } else {
        console.log(`❌ Failed - Unexpected error: "${error.message}"`);
      }
    }
    console.log('');
  }
}

// Run tests
testParameterValidation().catch(console.error);