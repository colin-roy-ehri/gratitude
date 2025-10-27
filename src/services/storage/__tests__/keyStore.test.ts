/**
 * Tests for key storage service
 */

import * as SecureStore from 'expo-secure-store';
import { keyStoreService } from '../keyStore';

// Mock expo-secure-store
jest.mock('expo-secure-store');

describe('keyStoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveKeypair', () => {
    it('should save a keypair to secure storage', async () => {
      const messageId = 'test-message-id';
      const keypair = {
        publicKey: 'public-key-data',
        privateKey: 'private-key-data',
      };

      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await keyStoreService.saveKeypair(messageId, keypair);

      expect(result.success).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        '@gratitude:key:test-message-id',
        JSON.stringify(keypair)
      );
    });

    it('should handle storage errors', async () => {
      const messageId = 'test-message-id';
      const keypair = {
        publicKey: 'public-key-data',
        privateKey: 'private-key-data',
      };

      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('Secure storage error')
      );

      const result = await keyStoreService.saveKeypair(messageId, keypair);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Secure storage error');
      }
    });

    it('should overwrite existing keypair', async () => {
      const messageId = 'test-message-id';
      const oldKeypair = {
        publicKey: 'old-public',
        privateKey: 'old-private',
      };
      const newKeypair = {
        publicKey: 'new-public',
        privateKey: 'new-private',
      };

      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await keyStoreService.saveKeypair(messageId, oldKeypair);
      const result = await keyStoreService.saveKeypair(messageId, newKeypair);

      expect(result.success).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith(
        '@gratitude:key:test-message-id',
        JSON.stringify(newKeypair)
      );
    });
  });

  describe('getKeypair', () => {
    it('should retrieve a keypair from secure storage', async () => {
      const messageId = 'test-message-id';
      const keypair = {
        publicKey: 'public-key-data',
        privateKey: 'private-key-data',
      };

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(keypair)
      );

      const result = await keyStoreService.getKeypair(messageId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(keypair);
      }
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('@gratitude:key:test-message-id');
    });

    it('should return error if keypair not found', async () => {
      const messageId = 'non-existent-id';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await keyStoreService.getKeypair(messageId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should handle malformed JSON', async () => {
      const messageId = 'test-message-id';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('invalid json');

      const result = await keyStoreService.getKeypair(messageId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle storage errors', async () => {
      const messageId = 'test-message-id';

      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Secure storage error')
      );

      const result = await keyStoreService.getKeypair(messageId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Secure storage error');
      }
    });
  });

  describe('deleteKeypair', () => {
    it('should delete a keypair from secure storage', async () => {
      const messageId = 'test-message-id';

      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await keyStoreService.deleteKeypair(messageId);

      expect(result.success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        '@gratitude:key:test-message-id'
      );
    });

    it('should handle storage errors', async () => {
      const messageId = 'test-message-id';

      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error('Secure storage error')
      );

      const result = await keyStoreService.deleteKeypair(messageId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Secure storage error');
      }
    });

    it('should succeed even if keypair does not exist', async () => {
      const messageId = 'non-existent-id';

      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await keyStoreService.deleteKeypair(messageId);

      expect(result.success).toBe(true);
    });
  });

  describe('hasKeypair', () => {
    it('should return true if keypair exists', async () => {
      const messageId = 'test-message-id';
      const keypair = {
        publicKey: 'public-key-data',
        privateKey: 'private-key-data',
      };

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(keypair)
      );

      const result = await keyStoreService.hasKeypair(messageId);

      expect(result).toBe(true);
    });

    it('should return false if keypair does not exist', async () => {
      const messageId = 'non-existent-id';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await keyStoreService.hasKeypair(messageId);

      expect(result).toBe(false);
    });

    it('should return false on storage errors', async () => {
      const messageId = 'test-message-id';

      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Secure storage error')
      );

      const result = await keyStoreService.hasKeypair(messageId);

      expect(result).toBe(false);
    });
  });
});
