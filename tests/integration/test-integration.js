import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '../../dist/index.js');

console.log('Testing MCP server startup...');

const server = spawn('node', [serverPath], {
  stdio: 'pipe',
  env: {
    ...process.env,
    OBSIDIAN_API_KEY: 'test-key',
  }
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.error('Server error:', data.toString());
});

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '0.1.0',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Wait for response
setTimeout(() => {
  console.log('Server output:', output);
  if (errorOutput) {
    console.error('Server errors:', errorOutput);
  }
  
  // Send list tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  setTimeout(() => {
    console.log('Final output:', output);
    server.kill();
    
    // Check if we got a proper response
    if (output.includes('"result"') && output.includes('obsidian_list_files_in_vault')) {
      console.log('✅ Server started successfully and returned tools list');
      process.exit(0);
    } else {
      console.error('❌ Server did not return expected response');
      process.exit(1);
    }
  }, 1000);
}, 1000);