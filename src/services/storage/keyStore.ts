/**
 * Secure key storage service using expo-secure-store
 * Stores cryptographic keypairs associated with messages
 */

import * as SecureStore from 'expo-secure-store';
import { Result } from '../../types/common';

interface Keypair {
  publicKey: string;
  privateKey: string;
}

class KeyStoreService {
  private getKey(messageId: string): string {
    return `@gratitude:key:${messageId}`;
  }

  /**
   * Save a keypair for a message
   */
  async saveKeypair(messageId: string, keypair: Keypair): Promise<Result<void>> {
    try {
      const key = this.getKey(messageId);
      await SecureStore.setItemAsync(key, JSON.stringify(keypair));
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save keypair: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get a keypair for a message
   */
  async getKeypair(messageId: string): Promise<Result<Keypair>> {
    try {
      const key = this.getKey(messageId);
      const data = await SecureStore.getItemAsync(key);

      if (!data) {
        return { success: false, error: 'Keypair not found' };
      }

      return { success: true, data: JSON.parse(data) as Keypair };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get keypair: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Delete a keypair
   */
  async deleteKeypair(messageId: string): Promise<Result<void>> {
    try {
      const key = this.getKey(messageId);
      await SecureStore.deleteItemAsync(key);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete keypair: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check if keypair exists
   */
  async hasKeypair(messageId: string): Promise<boolean> {
    try {
      const key = this.getKey(messageId);
      const data = await SecureStore.getItemAsync(key);
      return data !== null;
    } catch (error) {
      console.error('Failed to check keypair:', error);
      return false;
    }
  }

  /**
   * Save public key only (for received messages)
   */
  async savePublicKey(messageId: string, publicKey: string): Promise<Result<void>> {
    try {
      const key = `${this.getKey(messageId)}:public`;
      await SecureStore.setItemAsync(key, publicKey);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save public key: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get public key only
   */
  async getPublicKey(messageId: string): Promise<Result<string>> {
    try {
      const key = `${this.getKey(messageId)}:public`;
      const data = await SecureStore.getItemAsync(key);

      if (!data) {
        return { success: false, error: 'Public key not found' };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get public key: ${(error as Error).message}`,
      };
    }
  }
}

export const keyStoreService = new KeyStoreService();
