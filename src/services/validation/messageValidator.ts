/**
 * Message validation service using Ajv for JSON schema validation
 * and custom rules for privacy and security
 */

import Ajv, { ValidateFunction } from 'ajv';
import { MutualAidMessage } from '../../types/message';
import messageSchema from '../../../schemas/MessageSchema.json';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

class MessageValidator {
  private ajv: Ajv;
  private validateFn: ValidateFunction;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });

    // Compile schema once
    this.validateFn = this.ajv.compile(messageSchema);
  }

  /**
   * Validate a message against the JSON schema and custom rules
   */
  validate(message: MutualAidMessage): ValidationResult {
    // 1. JSON Schema validation
    const schemaValid = this.validateFn(message);
    if (!schemaValid && this.validateFn.errors) {
      const error = this.validateFn.errors[0];
      return {
        valid: false,
        error: `Schema validation failed: ${error.instancePath} ${error.message}`,
      };
    }

    // 2. Custom validation rules
    const customValidation = this.customValidate(message);
    if (!customValidation.valid) {
      return customValidation;
    }

    return { valid: true };
  }

  /**
   * Custom validation rules beyond JSON schema
   */
  private customValidate(message: MutualAidMessage): ValidationResult {
    // Payload size must be multiple of 256 bytes
    if (message.encrypted_payloads) {
      for (const payload of message.encrypted_payloads) {
        if (payload.payload_size % 256 !== 0 || payload.payload_size === 0) {
          return {
            valid: false,
            error: 'Payload size must be a multiple of 256 bytes',
          };
        }
      }
    }

    // COORDINATION messages must have encrypted payloads
    if (message.type === 'COORDINATION') {
      if (!message.encrypted_payloads || message.encrypted_payloads.length === 0) {
        return {
          valid: false,
          error: 'COORDINATION messages must have at least one encrypted payload',
        };
      }
    }

    // NEED/OFFER messages must have category
    if (message.type === 'NEED' || message.type === 'OFFER') {
      if (!message.public.category) {
        return {
          valid: false,
          error: 'NEED/OFFER messages must have a category',
        };
      }
    }

    // Hop count should not exceed maximum
    if (message.hop_count !== undefined && message.hop_count > 10) {
      return {
        valid: false,
        error: 'Hop count cannot exceed 10',
      };
    }

    return { valid: true };
  }

  /**
   * Validate location precision based on network density
   * Note: This requires density calculator which we'll implement later
   */
  validateLocationPrecision(
    precisionLevel: string,
    densityScore: number
  ): ValidationResult {
    if (precisionLevel === 'high' && densityScore < 30) {
      return {
        valid: false,
        error: 'Precision too high for current network density',
      };
    }

    return { valid: true };
  }

  /**
   * Quick validation - just checks required fields
   */
  quickValidate(message: unknown): message is MutualAidMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const msg = message as Partial<MutualAidMessage>;

    return !!(
      msg.message_id &&
      msg.version &&
      msg.type &&
      msg.timestamp &&
      msg.public
    );
  }
}

// Export singleton instance
export const messageValidator = new MessageValidator();
