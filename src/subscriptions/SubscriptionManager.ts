/**
 * Manages resource subscriptions for live update notifications
 */
export class SubscriptionManager {
  private clientSubscriptions: Map<string, Set<string>> = new Map();
  private resourceSubscribers: Map<string, Set<string>> = new Map();
  private testMode: boolean = false;

  // Resources that support subscriptions (frequently changing resources)
  private static readonly SUBSCRIBABLE_RESOURCES = new Set([
    'vault://recent',
    'vault://stats', 
    'vault://tags',
    'vault://structure' // Added structure as it changes with file operations
  ]);

  /**
   * Enable test mode to allow any resource to be subscribable
   */
  enableTestMode(): void {
    this.testMode = true;
  }

  /**
   * Disable test mode
   */
  disableTestMode(): void {
    this.testMode = false;
  }

  /**
   * Subscribe a client to resource updates
   */
  subscribe(clientId: string, resourceUri: string): void {
    this.validateResourceUri(resourceUri);
    this.validateSubscribableResource(resourceUri);

    // Add to client subscriptions
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Set());
    }
    this.clientSubscriptions.get(clientId)!.add(resourceUri);

    // Add to resource subscribers
    if (!this.resourceSubscribers.has(resourceUri)) {
      this.resourceSubscribers.set(resourceUri, new Set());
    }
    this.resourceSubscribers.get(resourceUri)!.add(clientId);
  }

  /**
   * Unsubscribe a client from resource updates
   */
  unsubscribe(clientId: string, resourceUri: string): void {
    // Remove from client subscriptions
    const clientSubs = this.clientSubscriptions.get(clientId);
    if (clientSubs) {
      clientSubs.delete(resourceUri);
      if (clientSubs.size === 0) {
        this.clientSubscriptions.delete(clientId);
      }
    }

    // Remove from resource subscribers
    const resourceSubs = this.resourceSubscribers.get(resourceUri);
    if (resourceSubs) {
      resourceSubs.delete(clientId);
      if (resourceSubs.size === 0) {
        this.resourceSubscribers.delete(resourceUri);
      }
    }
  }

  /**
   * Unsubscribe a client from all resources
   */
  unsubscribeAll(clientId: string): void {
    const subscriptions = this.getSubscriptions(clientId);
    for (const resourceUri of subscriptions) {
      this.unsubscribe(clientId, resourceUri);
    }
  }

  /**
   * Get all resources a client is subscribed to
   */
  getSubscriptions(clientId: string): string[] {
    const subscriptions = this.clientSubscriptions.get(clientId);
    return subscriptions ? Array.from(subscriptions) : [];
  }

  /**
   * Get all clients subscribed to a resource
   */
  getSubscribedClients(resourceUri: string): string[] {
    const subscribers = this.resourceSubscribers.get(resourceUri);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Check if a resource supports subscriptions
   */
  isSubscribable(resourceUri: string): boolean {
    if (this.testMode) {
      // In test mode, any valid vault:// URI is subscribable
      return resourceUri.startsWith('vault://') && resourceUri !== 'vault://';
    }
    return SubscriptionManager.SUBSCRIBABLE_RESOURCES.has(resourceUri);
  }

  private validateResourceUri(resourceUri: string): void {
    if (!resourceUri || resourceUri.trim() === '') {
      throw new Error('Resource URI cannot be empty');
    }

    if (!resourceUri.startsWith('vault://') || resourceUri === 'vault://') {
      throw new Error('Invalid resource URI format');
    }
  }

  private validateSubscribableResource(resourceUri: string): void {
    if (!this.isSubscribable(resourceUri)) {
      throw new Error(`Resource ${resourceUri} is not subscribable`);
    }
  }

  /**
   * Cleanup all subscriptions and resources
   */
  cleanup(): void {
    this.clientSubscriptions.clear();
    this.resourceSubscribers.clear();
  }
}