#!/usr/bin/env node
import { config } from 'dotenv';
import { createAndStartServer } from './server/ServerInitializer.js';

// Load environment variables
config();

// Start server
async function main() {
  try {
    // Display startup warning on stderr (not stdout) to avoid breaking JSON-RPC protocol
    console.error('OBSIDIAN VAULT MCP - For Obsidian Notes Only');
    console.error('This server ONLY accesses notes within your Obsidian vault');
    console.error('For general filesystem access, use filesystem MCP servers');
    
    // Create and start the server with subscription configuration
    const server = await createAndStartServer();
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.error('Received SIGINT, shutting down gracefully...');
      const { shutdownServer } = await import('./server/ServerInitializer.js');
      await shutdownServer(server);
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      const { shutdownServer } = await import('./server/ServerInitializer.js');
      await shutdownServer(server);
      process.exit(0);
    });
    
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