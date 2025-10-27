/**
 * Tests for message validator
 */

import { messageValidator } from '../messageValidator';
import {
  mockNeedMessage,
  mockOfferMessage,
  mockCoordinationMessage,
} from '../../../__mocks__/messages';
import { MutualAidMessage } from '../../../types/message';

describe('messageValidator', () => {
  describe('validate', () => {
    it('should validate a correct NEED message', () => {
      const result = messageValidator.validate(mockNeedMessage);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a correct OFFER message', () => {
      const result = messageValidator.validate(mockOfferMessage);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a correct COORDINATION message', () => {
      const result = messageValidator.validate(mockCoordinationMessage);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject message with missing required fields', () => {
      const invalid = { ...mockNeedMessage };
      delete (invalid as any).message_id;

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('message_id');
    });

    it('should reject message with invalid type', () => {
      const invalid = { ...mockNeedMessage, type: 'INVALID_TYPE' as any };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject payload not padded to 256 bytes', () => {
      const invalid: MutualAidMessage = {
        ...mockCoordinationMessage,
        encrypted_payloads: [
          {
            recipient_key: 'key',
            nonce: 'nonce',
            payload: 'data',
            payload_size: 123, // Not multiple of 256
          },
        ],
      };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('256');
    });

    it('should accept payload size that is multiple of 256', () => {
      const valid: MutualAidMessage = {
        ...mockCoordinationMessage,
        encrypted_payloads: [
          {
            recipient_key: 'key',
            nonce: 'nonce',
            payload: 'data',
            payload_size: 512, // Valid: 256 * 2
          },
        ],
      };

      const result = messageValidator.validate(valid);
      expect(result.valid).toBe(true);
    });

    it('should reject payload size of 0', () => {
      const invalid: MutualAidMessage = {
        ...mockCoordinationMessage,
        encrypted_payloads: [
          {
            recipient_key: 'key',
            nonce: 'nonce',
            payload: 'data',
            payload_size: 0,
          },
        ],
      };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      // The error comes from JSON schema validation (must be >= 1) before custom validation
      expect(result.error).toBeDefined();
    });

    it('should reject COORDINATION message without encrypted payloads', () => {
      const invalid = {
        ...mockCoordinationMessage,
        encrypted_payloads: [],
      };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('COORDINATION');
    });

    it('should reject NEED message without category', () => {
      const invalid = {
        ...mockNeedMessage,
        public: {
          ...mockNeedMessage.public,
          category: undefined,
        },
      };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('category');
    });

    it('should reject OFFER message without category', () => {
      const invalid = {
        ...mockOfferMessage,
        public: {
          ...mockOfferMessage.public,
          category: undefined,
        },
      };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('category');
    });

    it('should reject message with hop count exceeding maximum', () => {
      const invalid = {
        ...mockNeedMessage,
        hop_count: 11, // Max is 10
      };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10');
    });

    it('should accept message with valid hop count', () => {
      const valid = {
        ...mockNeedMessage,
        hop_count: 5,
      };

      const result = messageValidator.validate(valid);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateLocationPrecision', () => {
    it('should reject high precision with low density', () => {
      const result = messageValidator.validateLocationPrecision('high', 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('density');
    });

    it('should accept high precision with high density', () => {
      const result = messageValidator.validateLocationPrecision('high', 35);
      expect(result.valid).toBe(true);
    });

    it('should accept low precision regardless of density', () => {
      const result = messageValidator.validateLocationPrecision('low', 5);
      expect(result.valid).toBe(true);
    });
  });

  describe('quickValidate', () => {
    it('should return true for valid message', () => {
      const result = messageValidator.quickValidate(mockNeedMessage);
      expect(result).toBe(true);
    });

    it('should return false for null', () => {
      const result = messageValidator.quickValidate(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = messageValidator.quickValidate(undefined);
      expect(result).toBe(false);
    });

    it('should return false for non-object', () => {
      const result = messageValidator.quickValidate('not an object');
      expect(result).toBe(false);
    });

    it('should return false for message missing required fields', () => {
      const invalid = { message_id: '123' };
      const result = messageValidator.quickValidate(invalid);
      expect(result).toBe(false);
    });
  });
});
