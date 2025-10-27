/**
 * Tests for UUID utility
 */

import { generateUUID, isValidUUID } from '../uuid';

describe('uuid', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUUID();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const uuid3 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it('should generate UUIDs with correct length', () => {
      const uuid = generateUUID();

      // UUID format is 36 characters (32 hex + 4 hyphens)
      expect(uuid.length).toBe(36);
    });

    it('should generate UUIDs with hyphens in correct positions', () => {
      const uuid = generateUUID();

      expect(uuid[8]).toBe('-');
      expect(uuid[13]).toBe('-');
      expect(uuid[18]).toBe('-');
      expect(uuid[23]).toBe('-');
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000', // v4 UUID
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8', // v4 UUID (corrected version byte)
        '00000000-0000-4000-8000-000000000000', // v4 UUID
      ];

      validUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
        '550e8400e29b41d4a716446655440000', // Missing hyphens
        '550e8400-e29b-51d4-a716-446655440000', // Wrong version (should be 4)
        'gggggggg-gggg-4ggg-aggg-gggggggggggg', // Invalid hex characters
        '',
        '   ',
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });

    it('should reject non-string inputs', () => {
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
      expect(isValidUUID(123 as any)).toBe(false);
      expect(isValidUUID({} as any)).toBe(false);
      expect(isValidUUID([] as any)).toBe(false);
    });

    it('should validate generated UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const uuid3 = generateUUID();

      expect(isValidUUID(uuid1)).toBe(true);
      expect(isValidUUID(uuid2)).toBe(true);
      expect(isValidUUID(uuid3)).toBe(true);
    });
  });
});
