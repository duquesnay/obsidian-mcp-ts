#!/usr/bin/env node
import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Initialize
server.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    protocolVersion: "0.1.0",
    capabilities: {
      experimental: {},
      sampling: {}
    }
  },
  id: 1
}) + '\n');

// List resources
setTimeout(() => {
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    method: "resources/list",
    params: {},
    id: 2
  }) + '\n');
}, 500);

// Collect output
let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
  try {
    const lines = output.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const parsed = JSON.parse(line);
      if (parsed.id === 1) {
        console.log('Initialize response:', JSON.stringify(parsed.result.capabilities, null, 2));
      } else if (parsed.id === 2) {
        console.log('Resources count:', parsed.result.resources.length);
        console.log('First few resources:');
        parsed.result.resources.slice(0, 3).forEach(r => {
          console.log(`  - ${r.uri}: ${r.name}`);
        });
        process.exit(0);
      }
    }
  } catch (e) {
    // Ignore partial JSON
  }
});

server.stderr.on('data', (data) => {
  // Ignore startup messages
});

setTimeout(() => {
  console.log('Timeout - no response');
  process.exit(1);
}, 3000);