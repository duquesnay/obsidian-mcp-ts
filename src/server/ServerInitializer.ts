import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from '../tools/index.js';
import { registerResources } from '../resources/index.js';
import { registerSubscriptions } from '../subscriptions/index.js';
import { registerLogging, LoggingHandler } from '../logging/index.js';

/**
 * Configuration for subscription settings
 */
export interface SubscriptionConfig {
  enableSubscriptions: boolean;
  maxSubscriptions: number;
  defaultSubscriptions: string[];
}

/**
 * Extended server interface to include subscription and logging components
 */
interface ServerWithSubscriptions extends Server {
  subscriptionManager?: any;
  subscriptionHandlers?: any;
  loggingHandler?: LoggingHandler;
  capabilities?: any;
}

/**
 * Create a server instance with subscription capabilities enabled
 */
export function createServerWithConfig(): ServerWithSubscriptions {
  const server = new Server(
    {
      name: 'obsidian-mcp',
      version: '2.2.0',
      description: 'Obsidian vault operations. All tools work exclusively with vault notes, not general filesystem files. Use Read/Write/Edit tools for project files. Links auto-update on moves/renames. Tags support inline (#tag) and frontmatter formats.',
    },
    {
      capabilities: {
        tools: {},
        resources: {
          subscribe: true
        },
      },
    }
  );

  return server as ServerWithSubscriptions;
}

/**
 * Initialize server with all components including subscriptions
 */
export async function initializeServer(server: ServerWithSubscriptions): Promise<void> {
  // Load subscription configuration
  const config = loadSubscriptionConfig();
  
  // Validate configuration
  validateSubscriptionConfig(config);

  // Register components in order
  // Important: registerSubscriptions must come before registerResources
  // because resources need subscriptionHandlers to be available for cache invalidation
  await registerTools(server);
  await registerSubscriptions(server);
  await registerResources(server);

  // Register logging (after tools to capture tool usage)
  const loggingHandler = await registerLogging(server, {
    maxEntries: 1000,
    minLevel: 'debug',
    sendToClient: true,
    logToConsole: false,
  });
  server.loggingHandler = loggingHandler;

  // Register completions (after resources to ensure cached handlers are available)
  const { registerCompletions } = await import('../completions/index.js');
  await registerCompletions(server);

  // Configure default subscriptions if specified
  if (config.defaultSubscriptions.length > 0 && server.subscriptionManager) {
    // For now, we just validate the URIs. Actual subscription setup would happen
    // when clients connect and request subscriptions
    for (const uri of config.defaultSubscriptions) {
      if (!uri.startsWith('vault://')) {
        throw new Error(`Invalid default subscription URI: ${uri}`);
      }
    }
  }
}

/**
 * Shutdown server and cleanup resources
 */
export async function shutdownServer(server: ServerWithSubscriptions): Promise<void> {
  try {
    // Cleanup subscription components
    if (server.subscriptionManager?.cleanup) {
      await server.subscriptionManager.cleanup();
    }
    
    if (server.subscriptionHandlers?.cleanup) {
      await server.subscriptionHandlers.cleanup();
    }

    // Close server connection if available
    if (server.close) {
      await server.close();
    }
  } catch (error) {
    console.error('Error during server shutdown:', error);
    // Don't re-throw to allow graceful shutdown
  }
}

/**
 * Load subscription configuration from environment variables
 */
export function loadSubscriptionConfig(): SubscriptionConfig {
  return {
    enableSubscriptions: process.env.OBSIDIAN_ENABLE_SUBSCRIPTIONS !== 'false', // Default true
    maxSubscriptions: parseInt(process.env.OBSIDIAN_MAX_SUBSCRIPTIONS || '100', 10),
    defaultSubscriptions: process.env.OBSIDIAN_DEFAULT_SUBSCRIPTIONS
      ? process.env.OBSIDIAN_DEFAULT_SUBSCRIPTIONS.split(',').map(s => s.trim())
      : []
  };
}

/**
 * Validate subscription configuration
 */
export function validateSubscriptionConfig(config: SubscriptionConfig): void {
  if (config.maxSubscriptions < 0) {
    throw new Error('maxSubscriptions must be non-negative');
  }

  for (const uri of config.defaultSubscriptions) {
    if (!uri.startsWith('vault://')) {
      throw new Error(`Invalid subscription URI format: ${uri}. Must start with 'vault://'`);
    }
    
    if (uri === 'vault://') {
      throw new Error('Subscription URI cannot be just "vault://"');
    }
  }
}

/**
 * Create and start the complete server
 */
export async function createAndStartServer(): Promise<ServerWithSubscriptions> {
  const server = createServerWithConfig();
  
  try {
    await initializeServer(server);
    
    // Create and connect transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    return server;
  } catch (error) {
    console.error('Server startup error:', error);
    throw error;
  }
}