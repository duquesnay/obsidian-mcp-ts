import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationTrigger, createNotificationTrigger } from '../../../src/subscriptions/NotificationTrigger.js';

describe('NotificationTrigger', () => {
  let mockServer: any;
  let mockNotifyResourceUpdate: any;
  let notificationTrigger: NotificationTrigger;

  beforeEach(() => {
    mockNotifyResourceUpdate = vi.fn();
    mockServer = {
      subscriptionHandlers: {
        notifyResourceUpdate: mockNotifyResourceUpdate
      }
    };
    
    notificationTrigger = new NotificationTrigger(mockServer);
  });

  describe('constructor', () => {
    it('should create notification trigger with server', () => {
      expect(notificationTrigger).toBeDefined();
    });
  });

  describe('resource-specific notification methods', () => {
    it('should notify recent files changed', async () => {
      await notificationTrigger.notifyRecentFilesChanged();
      
      expect(mockNotifyResourceUpdate).toHaveBeenCalledWith('vault://recent');
    });

    it('should notify vault stats changed', async () => {
      await notificationTrigger.notifyVaultStatsChanged();
      
      expect(mockNotifyResourceUpdate).toHaveBeenCalledWith('vault://stats');
    });

    it('should notify tags changed', async () => {
      await notificationTrigger.notifyTagsChanged();
      
      expect(mockNotifyResourceUpdate).toHaveBeenCalledWith('vault://tags');
    });
  });

  describe('generic notification method', () => {
    it('should notify any resource update', async () => {
      const resourceUri = 'vault://custom-resource';
      
      await notificationTrigger.notifyResourceUpdate(resourceUri);
      
      expect(mockNotifyResourceUpdate).toHaveBeenCalledWith(resourceUri);
    });
  });

  describe('server without subscription handlers', () => {
    beforeEach(() => {
      mockServer = {};
      notificationTrigger = new NotificationTrigger(mockServer);
    });

    it('should handle server without subscription handlers gracefully', async () => {
      // Should not throw error
      await expect(notificationTrigger.notifyRecentFilesChanged()).resolves.toBeUndefined();
      await expect(notificationTrigger.notifyVaultStatsChanged()).resolves.toBeUndefined();
      await expect(notificationTrigger.notifyTagsChanged()).resolves.toBeUndefined();
      await expect(notificationTrigger.notifyResourceUpdate('vault://test')).resolves.toBeUndefined();
    });
  });

  describe('createNotificationTrigger factory function', () => {
    it('should create notification trigger instance', () => {
      const trigger = createNotificationTrigger(mockServer);
      
      expect(trigger).toBeInstanceOf(NotificationTrigger);
    });
  });
});