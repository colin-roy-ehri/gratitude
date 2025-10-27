/**
 * Message storage service using AsyncStorage
 * Handles CRUD operations for messages
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MutualAidMessage } from '../../types/message';
import { Result } from '../../types/common';

const STORAGE_KEY = '@gratitude:messages';
const MAX_MESSAGES = 500;

class MessageStoreService {
  /**
   * Save a single message
   */
  async saveMessage(message: MutualAidMessage): Promise<Result<void>> {
    try {
      const messages = await this.getAllMessages();

      // Check if message already exists (update)
      const existingIndex = messages.findIndex(
        (m) => m.message_id === message.message_id
      );

      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.push(message);
      }

      // Prune old messages if exceeding limit
      if (messages.length > MAX_MESSAGES) {
        await this.pruneOldMessages(messages);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save message: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string): Promise<Result<MutualAidMessage>> {
    try {
      const messages = await this.getAllMessages();
      const message = messages.find((m) => m.message_id === messageId);

      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      return { success: true, data: message };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get message: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get all messages
   */
  async getAllMessages(): Promise<MutualAidMessage[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }

      return JSON.parse(data) as MutualAidMessage[];
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  /**
   * Get messages by type
   */
  async getMessagesByType(type: string): Promise<MutualAidMessage[]> {
    const messages = await this.getAllMessages();
    return messages.filter((m) => m.type === type);
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<Result<void>> {
    try {
      const messages = await this.getAllMessages();
      const filtered = messages.filter((m) => m.message_id !== messageId);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete message: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Delete all messages (for testing or reset)
   */
  async clearAll(): Promise<Result<void>> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear messages: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Prune old messages to keep storage under control
   */
  private async pruneOldMessages(messages: MutualAidMessage[]): Promise<void> {
    // Keep messages from last 30 days
    const cutoffDate = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Filter messages
    let filtered = messages.filter((msg) => {
      const timestamp = new Date(msg.timestamp).getTime();
      return (
        timestamp > cutoffDate ||
        msg.type === 'COORDINATION' // Always keep coordinations
      );
    });

    // If still too many, keep most recent MAX_MESSAGES
    if (filtered.length > MAX_MESSAGES) {
      filtered.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      filtered = filtered.slice(0, MAX_MESSAGES);
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalMessages: number;
    byType: Record<string, number>;
    oldestMessage?: string;
    newestMessage?: string;
  }> {
    const messages = await this.getAllMessages();

    const byType: Record<string, number> = {};
    messages.forEach((msg) => {
      byType[msg.type] = (byType[msg.type] || 0) + 1;
    });

    const timestamps = messages
      .map((m) => new Date(m.timestamp).getTime())
      .sort((a, b) => a - b);

    return {
      totalMessages: messages.length,
      byType,
      oldestMessage: timestamps[0]
        ? new Date(timestamps[0]).toISOString()
        : undefined,
      newestMessage: timestamps[timestamps.length - 1]
        ? new Date(timestamps[timestamps.length - 1]).toISOString()
        : undefined,
    };
  }
}

export const messageStoreService = new MessageStoreService();
