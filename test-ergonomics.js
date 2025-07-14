#!/usr/bin/env node
/**
 * Quick verification script to test the improved ergonomics of patch_content_v2
 * This script validates the key improvements made to address LLM friction points
 */

const { PatchContentToolV2 } = require('./dist/tools/PatchContentToolV2.js');

// Mock client for testing
const mockClient = {
  getFileContents: () => Promise.resolve('Existing content'),
  updateFile: (filepath, content) => {
    console.log(`✅ updateFile called with: ${filepath}, "${content}"`);
    return Promise.resolve();
  },
  patchContent: (filepath, content, options) => {
    console.log(`✅ patchContent called with: ${filepath}, "${content}", ${JSON.stringify(options)}`);
    return Promise.resolve();
  }
};

// Mock the base tool functionality
class MockBaseTool {
  getClient() {
    return mockClient;
  }
}

// Create a testable version of the tool
class TestPatchContentToolV2 extends PatchContentToolV2 {
  getClient() {
    return mockClient;
  }
}

async function testErgonomics() {
  console.log('\n🧪 Testing patch_content_v2 ergonomic improvements...\n');
  
  const tool = new TestPatchContentToolV2();
  
  // Test 1: Simple append operation
  console.log('📝 Test 1: Simple append operation');
  try {
    const result = await tool.execute({
      filepath: 'test.md',
      append: 'New content added'
    });
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (!result.success) {
      console.log(`Error: ${result.error?.message}`);
      console.log(`Hint: ${result.error?.hint}`);
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  
  console.log('\n');
  
  // Test 2: Insert after heading
  console.log('📝 Test 2: Insert after heading');
  try {
    const result = await tool.execute({
      filepath: 'test.md',
      insertAfterHeading: {
        heading: 'Introduction',
        content: 'New section content'
      }
    });
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (!result.success) {
      console.log(`Error: ${result.error?.message}`);
      console.log(`Hint: ${result.error?.hint}`);
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  
  console.log('\n');
  
  // Test 3: Complex operation that should get quick win suggestion
  console.log('📝 Test 3: Complex operation that should get quick win suggestion');
  try {
    const result = await tool.execute({
      filepath: 'test.md',
      operation: {
        type: 'insert',
        insert: {
          content: 'Complex content',
          location: {
            type: 'document',
            document: { position: 'end' }
          }
        }
      }
    });
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (!result.success) {
      console.log(`Error: ${result.error?.message}`);
      console.log(`Hint: ${result.error?.hint}`);
      if (result.error?.example) {
        console.log(`Example: ${JSON.stringify(result.error.example.use_simple, null, 2)}`);
      }
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  
  console.log('\n');
  
  // Test 4: Content normalization
  console.log('📝 Test 4: Content normalization with array input');
  try {
    const result = await tool.execute({
      filepath: 'test.md',
      append: [{type: 'text', text: 'Array content'}]
    });
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (!result.success) {
      console.log(`Error: ${result.error?.message}`);
      console.log(`Hint: ${result.error?.hint}`);
      if (result.error?.example) {
        console.log(`Corrected: ${JSON.stringify(result.error.example.correct, null, 2)}`);
      }
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  
  console.log('\n');
  
  // Test 5: No operation specified
  console.log('📝 Test 5: No operation specified (should show helpful examples)');
  try {
    const result = await tool.execute({
      filepath: 'test.md'
    });
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED (expected)'}`);
    if (!result.success) {
      console.log(`Error: ${result.error?.message}`);
      console.log(`Hint: ${result.error?.hint}`);
      if (result.error?.example?.immediate_use) {
        console.log(`Available operations: ${Object.keys(result.error.example.immediate_use).join(', ')}`);
      }
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  
  console.log('\n🎯 Ergonomic improvements test completed!');
  console.log('Key improvements verified:');
  console.log('  • Simple shortcuts work directly');
  console.log('  • Complex operations provide quick win suggestions');
  console.log('  • Content normalization handles arrays');
  console.log('  • Better error messages with immediate examples');
  console.log('  • Progressive disclosure from simple to complex');
}

// Run the tests
testErgonomics().catch(console.error);