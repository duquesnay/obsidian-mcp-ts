#!/usr/bin/env node

/**
 * Test script for patch_content_v2 ergonomic improvements
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const MCP_PATH = './dist/index.js';

class MCPClient {
  constructor() {
    this.process = null;
    this.msgId = 0;
    this.responseHandlers = new Map();
  }

  async start() {
    console.log('Starting MCP server...');
    this.process = spawn('node', [MCP_PATH], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const msg = JSON.parse(line);
            if (msg.id !== undefined && this.responseHandlers.has(msg.id)) {
              const handler = this.responseHandlers.get(msg.id);
              this.responseHandlers.delete(msg.id);
              handler(msg);
            }
          } catch (e) {
            // Ignore non-JSON output
          }
        }
      }
    });

    this.process.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    // Initialize
    await this.sendRequest('initialize', {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'patch-v2-test',
        version: '1.0.0'
      }
    });
  }

  async sendRequest(method, params = {}) {
    const id = ++this.msgId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.responseHandlers.set(id, (response) => {
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      });

      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill();
    }
  }
}

async function testPatchContentV2() {
  const client = new MCPClient();
  
  try {
    await client.start();
    console.log('MCP server started successfully\n');

    // Test 1: Simple append operation
    console.log('Test 1: Simple append operation');
    try {
      const result = await client.sendRequest('tools/call', {
        name: 'obsidian_patch_content_v2',
        arguments: {
          filepath: 'test-notes/test.md',
          append: '\\n- New task added via simple append'
        }
      });
      console.log('✅ Simple append succeeded:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ Simple append failed:', error.message);
    }

    // Test 2: Content format error (the problematic case from analysis)
    console.log('\nTest 2: Testing content format handling');
    try {
      const result = await client.sendRequest('tools/call', {
        name: 'obsidian_patch_content_v2',
        arguments: {
          filepath: 'test-notes/test.md',
          append: [{type: 'text', text: 'This should auto-convert'}]
        }
      });
      console.log('✅ Content format auto-conversion succeeded:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ Content format handling failed:', error.message);
    }

    // Test 3: No operation specified
    console.log('\nTest 3: No operation error handling');
    try {
      const result = await client.sendRequest('tools/call', {
        name: 'obsidian_patch_content_v2',
        arguments: {
          filepath: 'test-notes/test.md'
        }
      });
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('Expected error with helpful message:', error.message);
    }

    // Test 4: File not found with helpful error
    console.log('\nTest 4: File not found error');
    try {
      const result = await client.sendRequest('tools/call', {
        name: 'obsidian_patch_content_v2',
        arguments: {
          filepath: 'non-existent-file.md',
          append: 'Some content'
        }
      });
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('Expected error with file creation hint:', error.message);
    }

    // Test 5: Insert after non-existent heading
    console.log('\nTest 5: Insert after non-existent heading');
    try {
      const result = await client.sendRequest('tools/call', {
        name: 'obsidian_patch_content_v2',
        arguments: {
          filepath: 'test-notes/test.md',
          insertAfterHeading: {
            heading: 'Non-Existent Heading',
            content: 'This should fail with helpful error'
          }
        }
      });
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('Expected error with heading suggestions:', error.message);
    }

    // Test 6: Dry run
    console.log('\nTest 6: Dry run operation');
    try {
      const result = await client.sendRequest('tools/call', {
        name: 'obsidian_patch_content_v2',
        arguments: {
          filepath: 'test-notes/test.md',
          replace: { find: 'old text', with: 'new text' },
          options: { dry_run: true }
        }
      });
      console.log('✅ Dry run succeeded:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ Dry run failed:', error.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.stop();
    console.log('\nTests completed');
  }
}

// Run tests
testPatchContentV2().catch(console.error);