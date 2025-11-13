/**
 * Message Inventory - In-memory store for received and created messages
 * Manages message deduplication and provides message lists for Bloom filter generation
 */

import { MutualAidMessage } from '../../../schemas/mutual-aid-message';
import { uint8ArrayToHex } from '../../utils/buffer';

export interface MessageInventoryEntry {
  messageId: string; // Hex string of first 16 bytes of publicKey
  message: MutualAidMessage;
  receivedAt: number; // Timestamp
  receivedFrom?: string; // Device ID (optional)
  isLocal: boolean; // True if created locally, false if received
}

export class MessageInventory {
  private messages: Map<string, MessageInventoryEntry> = new Map();
  private maxAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days default

  constructor(maxAge?: number) {
    if (maxAge !== undefined) {
      this.maxAge = maxAge;
    }
  }

  /**
   * Add a message to the inventory
   * Returns true if message was new, false if it already existed
   */
  add(
    message: MutualAidMessage,
    receivedFrom?: string,
    isLocal: boolean = false
  ): boolean {
    const messageId = this.getMessageId(message.publicKey);

    if (this.messages.has(messageId)) {
      return false; // Already exists
    }

    const entry: MessageInventoryEntry = {
      messageId,
      message,
      receivedAt: Date.now(),
      receivedFrom,
      isLocal,
    };

    this.messages.set(messageId, entry);
    return true;
  }

  /**
   * Check if a message exists in inventory
   */
  has(publicKey: Uint8Array): boolean {
    const messageId = this.getMessageId(publicKey);
    return this.messages.has(messageId);
  }

  /**
   * Check if a message ID exists in inventory
   */
  hasMessageId(messageId: string): boolean {
    return this.messages.has(messageId);
  }

  /**
   * Get a message by public key
   */
  get(publicKey: Uint8Array): MutualAidMessage | undefined {
    const messageId = this.getMessageId(publicKey);
    const entry = this.messages.get(messageId);
    return entry?.message;
  }

  /**
   * Get a message by message ID
   */
  getByMessageId(messageId: string): MutualAidMessage | undefined {
    const entry = this.messages.get(messageId);
    return entry?.message;
  }

  /**
   * Get all messages
   */
  getAll(): MutualAidMessage[] {
    return Array.from(this.messages.values()).map((entry) => entry.message);
  }

  /**
   * Get all message IDs
   */
  getAllMessageIds(): string[] {
    return Array.from(this.messages.keys());
  }

  /**
   * Get all public keys
   */
  getAllPublicKeys(): Uint8Array[] {
    return Array.from(this.messages.values()).map((entry) => entry.message.publicKey);
  }

  /**
   * Get message count
   */
  count(): number {
    return this.messages.size;
  }

  /**
   * Remove a message
   */
  remove(publicKey: Uint8Array): boolean {
    const messageId = this.getMessageId(publicKey);
    return this.messages.delete(messageId);
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages.clear();
  }

  /**
   * Clean up expired messages
   * Removes messages older than maxAge
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [messageId, entry] of this.messages.entries()) {
      if (now - entry.receivedAt > this.maxAge) {
        this.messages.delete(messageId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Calculate set difference: which messages does other device need?
   * @param otherMessageIds - Array of message IDs the other device has
   * @returns Array of messages we have that they don't
   */
  calculateMessagesToSend(otherMessageIds: string[]): MutualAidMessage[] {
    const otherSet = new Set(otherMessageIds);
    const toSend: MutualAidMessage[] = [];

    for (const [messageId, entry] of this.messages.entries()) {
      if (!otherSet.has(messageId)) {
        toSend.push(entry.message);
      }
    }

    return toSend;
  }

  /**
   * Calculate set difference: which message IDs do we need from other device?
   * @param otherMessageIds - Array of message IDs the other device has
   * @returns Array of message IDs we don't have
   */
  calculateMessageIdsToReceive(otherMessageIds: string[]): string[] {
    const toReceive: string[] = [];

    for (const messageId of otherMessageIds) {
      if (!this.messages.has(messageId)) {
        toReceive.push(messageId);
      }
    }

    return toReceive;
  }

  /**
   * Get inventory statistics
   */
  getStats(): {
    total: number;
    local: number;
    received: number;
    oldestMessage: number;
    newestMessage: number;
  } {
    if (this.messages.size === 0) {
      return {
        total: 0,
        local: 0,
        received: 0,
        oldestMessage: 0,
        newestMessage: 0,
      };
    }

    let localCount = 0;
    let receivedCount = 0;
    let oldest = Date.now();
    let newest = 0;

    for (const entry of this.messages.values()) {
      if (entry.isLocal) {
        localCount++;
      } else {
        receivedCount++;
      }

      if (entry.receivedAt < oldest) {
        oldest = entry.receivedAt;
      }
      if (entry.receivedAt > newest) {
        newest = entry.receivedAt;
      }
    }

    return {
      total: this.messages.size,
      local: localCount,
      received: receivedCount,
      oldestMessage: oldest,
      newestMessage: newest,
    };
  }

  /**
   * Generate message ID from public key (first 16 bytes in hex)
   */
  private getMessageId(publicKey: Uint8Array): string {
    return uint8ArrayToHex(publicKey.slice(0, 16));
  }

  /**
   * Export inventory to JSON (for debugging/persistence)
   */
  toJSON(): any {
    const entries: any[] = [];

    for (const entry of this.messages.values()) {
      entries.push({
        messageId: entry.messageId,
        message: {
          ...entry.message,
          publicKey: uint8ArrayToHex(entry.message.publicKey),
        },
        receivedAt: entry.receivedAt,
        receivedFrom: entry.receivedFrom,
        isLocal: entry.isLocal,
      });
    }

    return {
      maxAge: this.maxAge,
      entries,
    };
  }
}

/**
 * Singleton instance for global access
 */
export const messageInventory = new MessageInventory();
