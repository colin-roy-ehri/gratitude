/**
 * Message Manager Service
 * High-level service for creating and managing messages
 * Coordinates validation, storage, and key management
 */

import {
  MutualAidMessage,
  MessageType,
  PrimaryCategory,
  CategoryAttributes,
  Time,
  QuantityLevel,
  RecurrencePattern,
} from '../types/message';
import { Result } from '../types/common';
import { generateUUID } from '../utils/uuid';
import { roundLocation, getRecommendedPrecision } from '../utils/location';
import { messageValidator } from './validation/messageValidator';
import { messageStoreService } from './storage/messageStore';

// Note: keyManager will be implemented in Phase 3 (Cryptography)
// For now, we'll use placeholder for coordination_key

interface CreateNeedParams {
  category: PrimaryCategory;
  secondary?: string[];
  attributes?: CategoryAttributes;
  location: { lat: number; lon: number };
  time?: Time;
  quantity?: QuantityLevel;
  recurrence_pattern?: RecurrencePattern;
  note?: string;
  nearbyDeviceCount?: number; // For adaptive precision
}

interface CreateOfferParams extends CreateNeedParams {
  inResponseTo?: string; // Message ID this offer responds to
}

class MessageManager {
  /**
   * Create a NEED message
   */
  async createNeed(params: CreateNeedParams): Promise<Result<MutualAidMessage>> {
    try {
      const messageId = generateUUID();

      // Determine location precision based on network density
      const precisionLevel = getRecommendedPrecision(params.nearbyDeviceCount || 0);
      const coords = roundLocation(params.location.lat, params.location.lon, precisionLevel);

      const message: MutualAidMessage = {
        message_id: messageId,
        version: 1,
        type: 'NEED',
        timestamp: new Date().toISOString(),
        in_response_to: null,
        hop_count: 0,
        public: {
          category: {
            primary: params.category,
            secondary: params.secondary,
            attributes: params.attributes,
          },
          location: {
            coords,
            precision_level: precisionLevel,
          },
          time: params.time,
          quantity: params.quantity,
          recurrence_pattern: params.recurrence_pattern,
          note: params.note,
        },
        coordination_key: this.generatePlaceholderKey(), // TODO: Replace with real key in Phase 3
        encrypted_payloads: [],
        metadata: {
          relay_eligible: true,
          expires_at: this.calculateExpiration('NEED'),
          priority: 'normal',
          createdLocally: true,
        },
      };

      // Validate message
      const validation = messageValidator.validate(message);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Validation failed' };
      }

      // Store message
      const storeResult = await messageStoreService.saveMessage(message);
      if (!storeResult.success) {
        return { success: false, error: storeResult.error };
      }

      // TODO: Phase 3 - Store keypair in keyStore

      return { success: true, data: message };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create NEED: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Create an OFFER message
   */
  async createOffer(params: CreateOfferParams): Promise<Result<MutualAidMessage>> {
    try {
      const messageId = generateUUID();

      // Determine location precision
      const precisionLevel = getRecommendedPrecision(params.nearbyDeviceCount || 0);
      const coords = roundLocation(params.location.lat, params.location.lon, precisionLevel);

      const message: MutualAidMessage = {
        message_id: messageId,
        version: 1,
        type: 'OFFER',
        timestamp: new Date().toISOString(),
        in_response_to: params.inResponseTo || null,
        hop_count: 0,
        public: {
          category: {
            primary: params.category,
            secondary: params.secondary,
            attributes: params.attributes,
          },
          location: {
            coords,
            precision_level: precisionLevel,
          },
          time: params.time,
          quantity: params.quantity,
          recurrence_pattern: params.recurrence_pattern,
          note: params.note,
        },
        coordination_key: this.generatePlaceholderKey(), // TODO: Replace with real key in Phase 3
        encrypted_payloads: [],
        metadata: {
          relay_eligible: true,
          expires_at: this.calculateExpiration('OFFER'),
          priority: params.inResponseTo ? 'high' : 'normal',
          createdLocally: true,
        },
      };

      // Validate
      const validation = messageValidator.validate(message);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Validation failed' };
      }

      // Store
      const storeResult = await messageStoreService.saveMessage(message);
      if (!storeResult.success) {
        return { success: false, error: storeResult.error };
      }

      // TODO: Phase 3 - Store keypair

      return { success: true, data: message };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create OFFER: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get messages by filter
   */
  async getMessages(filter?: {
    type?: MessageType;
    category?: PrimaryCategory;
    createdLocally?: boolean;
  }): Promise<MutualAidMessage[]> {
    const allMessages = await messageStoreService.getAllMessages();

    if (!filter) {
      return allMessages;
    }

    return allMessages.filter((msg) => {
      if (filter.type && msg.type !== filter.type) {
        return false;
      }
      if (filter.category && msg.public.category?.primary !== filter.category) {
        return false;
      }
      if (
        filter.createdLocally !== undefined &&
        msg.metadata?.createdLocally !== filter.createdLocally
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string): Promise<Result<MutualAidMessage>> {
    return messageStoreService.getMessage(messageId);
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<Result<void>> {
    // TODO: Phase 3 - Also delete associated keypair
    return messageStoreService.deleteMessage(messageId);
  }

  /**
   * Calculate message expiration time
   */
  private calculateExpiration(type: MessageType): string {
    const now = Date.now();
    let expirationMs: number;

    switch (type) {
      case 'NEED':
      case 'OFFER':
        expirationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case 'COORDINATION':
        expirationMs = 2 * 24 * 60 * 60 * 1000; // 2 days
        break;
      case 'COMPLETION':
        expirationMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      default:
        expirationMs = 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }

    return new Date(now + expirationMs).toISOString();
  }

  /**
   * Generate placeholder coordination key (will be replaced in Phase 3)
   */
  private generatePlaceholderKey(): string {
    // This is a placeholder - will be replaced with real X25519 key generation
    return 'PLACEHOLDER_KEY_' + generateUUID().substring(0, 16);
  }

  /**
   * Check if a message is expired
   */
  isExpired(message: MutualAidMessage): boolean {
    if (!message.metadata?.expires_at) {
      return false;
    }

    return new Date(message.metadata.expires_at).getTime() < Date.now();
  }
}

export const messageManager = new MessageManager();
