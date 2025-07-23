#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListResourcesRequestSchema, 
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';

// Load environment variables
config();

// Create server instance
const server = new Server(
  {
    name: 'obsidian-mcp',
    version: '0.3.0',
    description: 'OBSIDIAN VAULT MCP - For Obsidian Notes Only. This server ONLY accesses notes within your Obsidian vault. For general filesystem access, use filesystem MCP servers.',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Start server
async function main() {
  try {
    // Display startup warning on stderr (not stdout) to avoid breaking JSON-RPC protocol
    console.error('OBSIDIAN VAULT MCP - For Obsidian Notes Only');
    console.error('This server ONLY accesses notes within your Obsidian vault');
    console.error('For general filesystem access, use filesystem MCP servers');
    
    // Register all tools
    await registerTools(server);
    
    // Register resources
    await registerResources(server);
    
    // Create and connect transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});