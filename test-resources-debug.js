#!/usr/bin/env node
import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

console.log('Starting server...');

// Capture all output
let stdout = '';
let stderr = '';

server.stdout.on('data', (data) => {
  stdout += data.toString();
  console.log('STDOUT:', data.toString());
});

server.stderr.on('data', (data) => {
  stderr += data.toString();
  console.log('STDERR:', data.toString());
});

// Send initialize
const initRequest = {
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
};

console.log('Sending:', JSON.stringify(initRequest));
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Wait a bit then send list resources
setTimeout(() => {
  const listRequest = {
    jsonrpc: "2.0",
    method: "resources/list",
    params: {},
    id: 2
  };
  console.log('Sending:', JSON.stringify(listRequest));
  server.stdin.write(JSON.stringify(listRequest) + '\n');
  
  // Exit after a bit
  setTimeout(() => {
    server.kill();
    process.exit(0);
  }, 1000);
}, 1000);