import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { terminateServer } from './test-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '../../dist/index.js');

interface JsonRpcRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: any;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface ResourceTemplate {
  name: string;
  uriTemplate: string;
  description?: string;
  mimeType?: string;
}

console.log('Testing MCP server resource templates...');

const server: ChildProcess = spawn('node', [serverPath], {
  stdio: 'pipe',
  env: {
    ...process.env,
    OBSIDIAN_API_KEY: 'test-key',
  }
});

let output = '';
let errorOutput = '';

server.stdout?.on('data', (data: Buffer) => {
  output += data.toString();
});

server.stderr?.on('data', (data: Buffer) => {
  errorOutput += data.toString();
});

// Parse JSON-RPC responses from accumulated output
function parseJsonRpcResponses(output: string): JsonRpcResponse[] {
  const responses: JsonRpcResponse[] = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.jsonrpc === '2.0') {
        responses.push(parsed);
      }
    } catch (e) {
      // Ignore non-JSON lines
    }
  }
  
  return responses;
}

// Test sequence
async function runTests() {
  // 1. Initialize the server
  const initRequest: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  server.stdin?.write(JSON.stringify(initRequest) + '\n');

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 500));

  // 2. Test resources/templates/list endpoint
  const templatesRequest: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'resources/templates/list',
    params: {}
  };

  server.stdin?.write(JSON.stringify(templatesRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 500));

  // 3. Parse and validate responses
  const responses = parseJsonRpcResponses(output);
  console.log('Received responses:', responses.length);

  // Find templates response
  const templatesResponse = responses.find(r => r.id === 2);
  
  if (!templatesResponse) {
    console.error('❌ No response to resources/templates/list request');
    console.error('Output:', output);
    console.error('Errors:', errorOutput);
    server.kill();
    process.exit(1);
  }

  if (templatesResponse.error) {
    console.error('❌ Error in resources/templates/list response:', templatesResponse.error);
    server.kill();
    process.exit(1);
  }

  if (!templatesResponse.result || !templatesResponse.result.resourceTemplates) {
    console.error('❌ Missing resourceTemplates in response');
    console.error('Response:', templatesResponse);
    server.kill();
    process.exit(1);
  }

  const templates: ResourceTemplate[] = templatesResponse.result.resourceTemplates;
  console.log(`✅ Found ${templates.length} resource templates`);

  // Validate expected templates
  const templateUris = templates.map(t => t.uriTemplate);
  const expectedUris = [
    'vault://note/{path}',
    'vault://folder/{path}',
    'vault://daily/{date}',
    'vault://tag/{tagname}'
  ];

  let allFound = true;
  for (const expectedUri of expectedUris) {
    if (!templateUris.includes(expectedUri)) {
      console.error(`❌ Missing expected template: ${expectedUri}`);
      allFound = false;
    } else {
      console.log(`✅ Found template: ${expectedUri}`);
    }
  }

  // Validate template metadata
  for (const template of templates) {
    if (!template.name) {
      console.error(`❌ Template ${template.uriTemplate} missing name`);
      allFound = false;
    }
    
    if (!template.description) {
      console.error(`❌ Template ${template.uriTemplate} missing description`);
      allFound = false;
    }
    
    if (!template.mimeType) {
      console.error(`❌ Template ${template.uriTemplate} missing mimeType`);
      allFound = false;
    }
    
    // Check that descriptions contain examples
    if (template.description && !template.description.includes('e.g.,')) {
      console.error(`❌ Template ${template.uriTemplate} description lacks examples`);
      allFound = false;
    }
  }

  await terminateServer(server);

  if (allFound) {
    console.log('✅ All resource templates tests passed');
    process.exit(0);
  } else {
    console.error('❌ Some resource template tests failed');
    process.exit(1);
  }
}

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited with code ${code}`);
    console.error('Error output:', errorOutput);
  }
});

// Start tests
runTests().catch(async (error) => {
  console.error('Test error:', error);
  await terminateServer(server);
  process.exit(1);
});