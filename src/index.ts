#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from 'dotenv';
import { registerTools } from './tools/index.js';

// Load environment variables
config();

// Create server instance
const server = new Server(
  {
    name: 'obsidian-mcp',
    version: '0.2.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Start server
async function main() {
  try {
    // Register all tools
    await registerTools(server);
    
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