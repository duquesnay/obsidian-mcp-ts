import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SubscribeRequestSchema, UnsubscribeRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SubscriptionManager } from './SubscriptionManager.js';

export interface NotificationSender {
  (notification: any, clientId?: string): Promise<void>;
}

/**
 * Handles MCP subscription requests and manages notifications
 */
export class SubscriptionHandlers {
  private subscriptionManager: SubscriptionManager;
  private notificationSender: NotificationSender;

  // For now, we'll use a default client ID since MCP doesn't provide client identification
  // This could be enhanced in the future to track multiple clients
  private static readonly DEFAULT_CLIENT_ID = 'default-client';

  constructor(subscriptionManager: SubscriptionManager, notificationSender: NotificationSender) {
    this.subscriptionManager = subscriptionManager;
    this.notificationSender = notificationSender;
  }

  /**
   * Register subscription request handlers with the MCP server
   */
  registerHandlers(server: Server): void {
    // Handle subscription requests
    server.setRequestHandler(SubscribeRequestSchema, async (request) => {
      const { uri } = request.params || {};
      
      if (!uri) {
        throw new Error('URI parameter is required');
      }

      // Subscribe the client to the resource
      this.subscriptionManager.subscribe(SubscriptionHandlers.DEFAULT_CLIENT_ID, uri);
      
      return {};
    });

    // Handle unsubscription requests  
    server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
      const { uri } = request.params || {};
      
      if (!uri) {
        throw new Error('URI parameter is required');
      }

      // Unsubscribe the client from the resource
      this.subscriptionManager.unsubscribe(SubscriptionHandlers.DEFAULT_CLIENT_ID, uri);
      
      return {};
    });
  }

  /**
   * Notify all subscribed clients about a resource update
   */
  async notifyResourceUpdate(resourceUri: string): Promise<void> {
    const subscribedClients = this.subscriptionManager.getSubscribedClients(resourceUri);
    
    if (subscribedClients.length === 0) {
      return;
    }

    const notification = {
      method: 'notifications/resources/updated',
      params: {
        uri: resourceUri
      }
    };

    // Send notification to all subscribed clients
    const notificationPromises = subscribedClients.map(clientId => 
      this.notificationSender(notification, clientId)
    );

    await Promise.all(notificationPromises);
  }

  /**
   * Get the subscription manager instance (for testing/debugging)
   */
  getSubscriptionManager(): SubscriptionManager {
    return this.subscriptionManager;
  }
}