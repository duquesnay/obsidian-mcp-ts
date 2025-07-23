#!/usr/bin/env node

/**
 * Example demonstrating resource subscription functionality
 * This shows how to use the subscription system in practice
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerResources } from '../src/resources/index.js';
import { registerSubscriptions, createNotificationTrigger } from '../src/subscriptions/index.js';

async function runSubscriptionExample() {
  // Create server with subscription capabilities
  const server = new Server(
    {
      name: 'obsidian-mcp-subscription-example',
      version: '1.0.0',
      description: 'Example of subscription functionality',
    },
    {
      capabilities: {
        resources: {
          subscribe: true
        },
      },
    }
  );

  // Register resources and subscriptions
  await registerResources(server);
  await registerSubscriptions(server);

  // Create notification trigger for manual notifications
  const trigger = createNotificationTrigger(server as any);

  console.error('=== Subscription Example ===');
  console.error('Server started with subscription capabilities');
  console.error('Subscribable resources: vault://recent, vault://stats, vault://tags');
  console.error('');

  // Example: Simulate resource changes and notifications
  setTimeout(async () => {
    console.error('Simulating vault://recent update...');
    await trigger.notifyRecentFilesChanged();
  }, 5000);

  setTimeout(async () => {
    console.error('Simulating vault://stats update...');
    await trigger.notifyVaultStatsChanged();
  }, 10000);

  setTimeout(async () => {
    console.error('Simulating vault://tags update...');
    await trigger.notifyTagsChanged();
  }, 15000);

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Example MCP client interaction:
/*
1. Client subscribes:
{
  "method": "resources/subscribe",
  "params": {
    "uri": "vault://recent"
  }
}

2. Server responds:
{}

3. Later, when resource changes, server sends notification:
{
  "method": "notifications/resources/updated", 
  "params": {
    "uri": "vault://recent"
  }
}

4. Client can unsubscribe:
{
  "method": "resources/unsubscribe",
  "params": {
    "uri": "vault://recent"
  }
}
*/

if (require.main === module) {
  runSubscriptionExample().catch(console.error);
}

export { runSubscriptionExample };