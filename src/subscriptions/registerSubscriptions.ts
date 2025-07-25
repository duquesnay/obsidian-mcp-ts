import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SubscriptionManager } from './SubscriptionManager.js';
import { SubscriptionHandlers, type NotificationSender } from './SubscriptionHandlers.js';

// Extended server interface to include subscription manager
interface ServerWithSubscriptions extends Server {
  subscriptionManager?: SubscriptionManager;
  subscriptionHandlers?: SubscriptionHandlers;
}

/**
 * Register subscription capabilities with the MCP server
 */
export async function registerSubscriptions(server: ServerWithSubscriptions): Promise<void> {
  // Create subscription manager (or use existing one for testing)
  const subscriptionManager = server.subscriptionManager || new SubscriptionManager();
  
  // Create notification sender that uses the server's notification method
  const notificationSender: NotificationSender = async (notification, clientId) => {
    // For now, send to all clients since MCP doesn't distinguish clients
    // Cast to any since we know the notification structure is valid
    await server.notification(notification as any);
  };
  
  // Create subscription handlers 
  const subscriptionHandlers = server.subscriptionHandlers || new SubscriptionHandlers(subscriptionManager, notificationSender);
  
  // Store references for potential access
  server.subscriptionManager = subscriptionManager;
  server.subscriptionHandlers = subscriptionHandlers;
  
  // Register the handlers with the server
  subscriptionHandlers.registerHandlers(server);
  
  // Add subscription capability to server capabilities if needed
  // Note: This depends on the MCP SDK implementation details
  // For now, we'll assume this is handled by registering the handlers
}

/**
 * Helper function to notify resource updates
 */
export async function notifyResourceUpdate(server: ServerWithSubscriptions, resourceUri: string): Promise<void> {
  if (server.subscriptionHandlers) {
    await server.subscriptionHandlers.notifyResourceUpdate(resourceUri);
  }
}