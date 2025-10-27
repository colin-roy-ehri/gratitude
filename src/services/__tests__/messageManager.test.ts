/**
 * Tests for message manager service
 */

import { messageManager } from '../messageManager';
import { messageValidator } from '../validation/messageValidator';
import { messageStoreService } from '../storage/messageStore';
import { generateUUID } from '../../utils/uuid';
import { roundLocation, getRecommendedPrecision } from '../../utils/location';

// Mock dependencies
jest.mock('../validation/messageValidator');
jest.mock('../storage/messageStore');
jest.mock('../../utils/uuid');
jest.mock('../../utils/location');

describe('messageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNeed', () => {
    it('should create a valid NEED message', async () => {
      const mockId = '550e8400-e29b-41d4-a716-446655440000';
      (generateUUID as jest.Mock).mockReturnValue(mockId);
      (getRecommendedPrecision as jest.Mock).mockReturnValue('low');
      (roundLocation as jest.Mock).mockReturnValue('37.423±0.05,-122.084±0.05');
      (messageValidator.validate as jest.Mock).mockReturnValue({ valid: true });
      (messageStoreService.saveMessage as jest.Mock).mockResolvedValue({
        success: true,
      });

      const params = {
        category: 'FOOD' as const,
        secondary: ['Groceries'],
        location: { lat: 37.423, lon: -122.084 },
        quantity: 'Medium_amount' as const,
        nearbyDeviceCount: 5,
      };

      const result = await messageManager.createNeed(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message_id).toBe(mockId);
        expect(result.data.type).toBe('NEED');
        expect(result.data.hop_count).toBe(0);
        expect(result.data.public.category?.primary).toBe('FOOD');
        expect(result.data.public.quantity).toBe('Medium_amount');
        expect(result.data.metadata?.createdLocally).toBe(true);
      }
    });

    it('should use adaptive location precision', async () => {
      (generateUUID as jest.Mock).mockReturnValue('test-id');
      (getRecommendedPrecision as jest.Mock).mockReturnValue('high');
      (roundLocation as jest.Mock).mockReturnValue('37.423±0.001,-122.084±0.001');
      (messageValidator.validate as jest.Mock).mockReturnValue({ valid: true });
      (messageStoreService.saveMessage as jest.Mock).mockResolvedValue({
        success: true,
      });

      const params = {
        category: 'FOOD' as const,
        location: { lat: 37.423, lon: -122.084 },
        nearbyDeviceCount: 35, // High density
      };

      await messageManager.createNeed(params);

      expect(getRecommendedPrecision).toHaveBeenCalledWith(35);
      expect(roundLocation).toHaveBeenCalledWith(37.423, -122.084, 'high');
    });

    it('should return error if validation fails', async () => {
      (generateUUID as jest.Mock).mockReturnValue('test-id');
      (getRecommendedPrecision as jest.Mock).mockReturnValue('low');
      (roundLocation as jest.Mock).mockReturnValue('37.423±0.05,-122.084±0.05');
      (messageValidator.validate as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Validation failed',
      });

      const params = {
        category: 'FOOD' as const,
        location: { lat: 37.423, lon: -122.084 },
      };

      const result = await messageManager.createNeed(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation failed');
      }
    });

    it('should return error if storage fails', async () => {
      (generateUUID as jest.Mock).mockReturnValue('test-id');
      (getRecommendedPrecision as jest.Mock).mockReturnValue('low');
      (roundLocation as jest.Mock).mockReturnValue('37.423±0.05,-122.084±0.05');
      (messageValidator.validate as jest.Mock).mockReturnValue({ valid: true });
      (messageStoreService.saveMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Storage error',
      });

      const params = {
        category: 'FOOD' as const,
        location: { lat: 37.423, lon: -122.084 },
      };

      const result = await messageManager.createNeed(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Storage error');
      }
    });

    it('should set correct expiration time for NEED messages', async () => {
      (generateUUID as jest.Mock).mockReturnValue('test-id');
      (getRecommendedPrecision as jest.Mock).mockReturnValue('low');
      (roundLocation as jest.Mock).mockReturnValue('37.423±0.05,-122.084±0.05');
      (messageValidator.validate as jest.Mock).mockReturnValue({ valid: true });
      (messageStoreService.saveMessage as jest.Mock).mockResolvedValue({
        success: true,
      });

      const params = {
        category: 'FOOD' as const,
        location: { lat: 37.423, lon: -122.084 },
      };

      const result = await messageManager.createNeed(params);

      expect(result.success).toBe(true);
      if (result.success) {
        const expiresAt = new Date(result.data.metadata!.expires_at!);
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const diff = expiresAt.getTime() - now;

        // Should be approximately 7 days (allow 1 second tolerance)
        expect(diff).toBeGreaterThan(sevenDays - 1000);
        expect(diff).toBeLessThan(sevenDays + 1000);
      }
    });
  });

  describe('createOffer', () => {
    it('should create a valid OFFER message', async () => {
      const mockId = '650e8400-e29b-41d4-a716-446655440001';
      (generateUUID as jest.Mock).mockReturnValue(mockId);
      (getRecommendedPrecision as jest.Mock).mockReturnValue('low');
      (roundLocation as jest.Mock).mockReturnValue('37.420±0.05,-122.080±0.05');
      (messageValidator.validate as jest.Mock).mockReturnValue({ valid: true });
      (messageStoreService.saveMessage as jest.Mock).mockResolvedValue({
        success: true,
      });

      const params = {
        category: 'FOOD' as const,
        secondary: ['Groceries'],
        location: { lat: 37.420, lon: -122.080 },
        quantity: 'Medium_amount' as const,
        nearbyDeviceCount: 5,
      };

      const result = await messageManager.createOffer(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message_id).toBe(mockId);
        expect(result.data.type).toBe('OFFER');
        expect(result.data.metadata?.priority).toBe('normal');
      }
    });

    it('should set high priority for response offers', async () => {
      (generateUUID as jest.Mock).mockReturnValue('test-id');
      (getRecommendedPrecision as jest.Mock).mockReturnValue('low');
      (roundLocation as jest.Mock).mockReturnValue('37.420±0.05,-122.080±0.05');
      (messageValidator.validate as jest.Mock).mockReturnValue({ valid: true });
      (messageStoreService.saveMessage as jest.Mock).mockResolvedValue({
        success: true,
      });

      const params = {
        category: 'FOOD' as const,
        location: { lat: 37.420, lon: -122.080 },
        inResponseTo: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = await messageManager.createOffer(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.in_response_to).toBe(
          '550e8400-e29b-41d4-a716-446655440000'
        );
        expect(result.data.metadata?.priority).toBe('high');
      }
    });

    it('should return error if validation fails', async () => {
      (generateUUID as jest.Mock).mockReturnValue('test-id');
      (getRecommendedPrecision as jest.Mock).mockReturnValue('low');
      (roundLocation as jest.Mock).mockReturnValue('37.420±0.05,-122.080±0.05');
      (messageValidator.validate as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Validation failed',
      });

      const params = {
        category: 'FOOD' as const,
        location: { lat: 37.420, lon: -122.080 },
      };

      const result = await messageManager.createOffer(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation failed');
      }
    });
  });

  describe('getMessages', () => {
    it('should retrieve all messages without filter', async () => {
      const mockMessages = [
        { message_id: '1', type: 'NEED', public: { category: { primary: 'FOOD' } } },
        { message_id: '2', type: 'OFFER', public: { category: { primary: 'WATER' } } },
      ];

      (messageStoreService.getAllMessages as jest.Mock).mockResolvedValue(
        mockMessages
      );

      const result = await messageManager.getMessages();

      expect(result).toEqual(mockMessages);
      expect(messageStoreService.getAllMessages).toHaveBeenCalled();
    });

    it('should filter messages by type', async () => {
      const mockMessages = [
        {
          message_id: '1',
          type: 'NEED',
          public: { category: { primary: 'FOOD' } },
          metadata: { createdLocally: false },
        },
        {
          message_id: '2',
          type: 'OFFER',
          public: { category: { primary: 'WATER' } },
          metadata: { createdLocally: false },
        },
      ];

      (messageStoreService.getAllMessages as jest.Mock).mockResolvedValue(
        mockMessages
      );

      const result = await messageManager.getMessages({ type: 'NEED' });

      expect(result).toHaveLength(1);
      expect(result[0].message_id).toBe('1');
    });

    it('should filter messages by category', async () => {
      const mockMessages = [
        {
          message_id: '1',
          type: 'NEED',
          public: { category: { primary: 'FOOD' } },
          metadata: { createdLocally: false },
        },
        {
          message_id: '2',
          type: 'OFFER',
          public: { category: { primary: 'WATER' } },
          metadata: { createdLocally: false },
        },
      ];

      (messageStoreService.getAllMessages as jest.Mock).mockResolvedValue(
        mockMessages
      );

      const result = await messageManager.getMessages({ category: 'WATER' });

      expect(result).toHaveLength(1);
      expect(result[0].message_id).toBe('2');
    });

    it('should filter messages by createdLocally', async () => {
      const mockMessages = [
        {
          message_id: '1',
          type: 'NEED',
          public: { category: { primary: 'FOOD' } },
          metadata: { createdLocally: true },
        },
        {
          message_id: '2',
          type: 'OFFER',
          public: { category: { primary: 'WATER' } },
          metadata: { createdLocally: false },
        },
      ];

      (messageStoreService.getAllMessages as jest.Mock).mockResolvedValue(
        mockMessages
      );

      const result = await messageManager.getMessages({ createdLocally: true });

      expect(result).toHaveLength(1);
      expect(result[0].message_id).toBe('1');
    });
  });

  describe('getMessage', () => {
    it('should retrieve a message by ID', async () => {
      const mockMessage = {
        message_id: 'test-id',
        type: 'NEED',
        public: { category: { primary: 'FOOD' } },
      };

      (messageStoreService.getMessage as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMessage,
      });

      const result = await messageManager.getMessage('test-id');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockMessage);
      }
    });

    it('should return error if message not found', async () => {
      (messageStoreService.getMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Message not found',
      });

      const result = await messageManager.getMessage('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message by ID', async () => {
      (messageStoreService.deleteMessage as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await messageManager.deleteMessage('test-id');

      expect(result.success).toBe(true);
      expect(messageStoreService.deleteMessage).toHaveBeenCalledWith('test-id');
    });

    it('should return error if deletion fails', async () => {
      (messageStoreService.deleteMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Deletion failed',
      });

      const result = await messageManager.deleteMessage('test-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Deletion failed');
      }
    });
  });

  describe('isExpired', () => {
    it('should return true for expired messages', () => {
      const expiredMessage = {
        message_id: 'test-id',
        version: 1,
        type: 'NEED' as const,
        timestamp: new Date().toISOString(),
        in_response_to: null,
        public: {},
        metadata: {
          expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        },
      };

      const result = messageManager.isExpired(expiredMessage);

      expect(result).toBe(true);
    });

    it('should return false for non-expired messages', () => {
      const activeMessage = {
        message_id: 'test-id',
        version: 1,
        type: 'NEED' as const,
        timestamp: new Date().toISOString(),
        in_response_to: null,
        public: {},
        metadata: {
          expires_at: new Date(Date.now() + 1000000).toISOString(), // Future
        },
      };

      const result = messageManager.isExpired(activeMessage);

      expect(result).toBe(false);
    });

    it('should return false for messages without expiration', () => {
      const messageWithoutExpiry = {
        message_id: 'test-id',
        version: 1,
        type: 'NEED' as const,
        timestamp: new Date().toISOString(),
        in_response_to: null,
        public: {},
      };

      const result = messageManager.isExpired(messageWithoutExpiry);

      expect(result).toBe(false);
    });
  });
});
