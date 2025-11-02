/**
 * UUID generation utilities using expo-crypto
 */

import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID v4 using expo-crypto
 */
export function generateUUID(): string {
  return Crypto.randomUUID();
}

/**
 * Validate a UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
