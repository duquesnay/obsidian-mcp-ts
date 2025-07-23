/**
 * Utility for manually triggering resource update notifications
 * This is a simple implementation - in production, this would be integrated
 * with file watching or other change detection mechanisms
 */

import { notifyResourceUpdate } from './registerSubscriptions.js';

// Extended server interface for notification triggers
interface ServerWithNotifications {
  subscriptionHandlers?: {
    notifyResourceUpdate(resourceUri: string): Promise<void>;
  };
}

/**
 * Manually trigger resource update notifications
 * Use this when you know a resource has changed and want to notify subscribers
 */
export class NotificationTrigger {
  private server: ServerWithNotifications;

  constructor(server: ServerWithNotifications) {
    this.server = server;
  }

  /**
   * Notify subscribers that vault://recent has been updated
   * Call this after file operations that would change recent files
   */
  async notifyRecentFilesChanged(): Promise<void> {
    await this.notifyResourceUpdate('vault://recent');
  }

  /**
   * Notify subscribers that vault://stats has been updated
   * Call this after operations that would change vault statistics
   */
  async notifyVaultStatsChanged(): Promise<void> {
    await this.notifyResourceUpdate('vault://stats');
  }

  /**
   * Notify subscribers that vault://tags has been updated
   * Call this after operations that would change tags
   */
  async notifyTagsChanged(): Promise<void> {
    await this.notifyResourceUpdate('vault://tags');
  }

  /**
   * Generic method to notify about any resource update
   */
  async notifyResourceUpdate(resourceUri: string): Promise<void> {
    if (this.server.subscriptionHandlers) {
      await this.server.subscriptionHandlers.notifyResourceUpdate(resourceUri);
    }
  }
}

/**
 * Create a notification trigger for a server instance
 */
export function createNotificationTrigger(server: ServerWithNotifications): NotificationTrigger {
  return new NotificationTrigger(server);
}