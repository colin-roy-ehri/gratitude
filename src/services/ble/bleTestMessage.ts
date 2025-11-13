/**
 * BLE Test Message - Example message using compact binary schema
 * For testing BLE communication with realistic mutual aid data
 */

import {
  MutualAidMessage as CompactMessage,
  MessageType,
  UnitOfMeasure,
  SizeCode,
  TimeWindow,
} from '../../../schemas/mutual-aid-message';

/**
 * Create a test message for BLE communication testing
 * This represents a food bank offering fresh produce
 */
export function createBLETestMessage(): CompactMessage {
  // Generate a test Ed25519 public key (32 bytes)
  // In production, this would come from the user's keypair
  const testPublicKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    testPublicKey[i] = Math.floor(Math.random() * 256);
  }

  // Define availability windows
  // Mon-Fri 9am-5pm, and Saturday 2pm-4pm
  const windows: TimeWindow[] = [
    {
      startHour: 9,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      daysOfWeek: 0x3e, // Binary: 0011_1110 = Mon-Fri (bits 1-5)
    },
    {
      startHour: 14,
      startMinute: 0,
      endHour: 16,
      endMinute: 0,
      daysOfWeek: 0x40, // Binary: 0100_0000 = Saturday (bit 6)
    },
  ];

  // Current time and validity period
  const now = Math.floor(Date.now() / 1000);
  const oneWeekLater = now + 7 * 24 * 60 * 60; // 7 days

  // Create the test message
  const message: CompactMessage = {
    version: 1,
    messageType: MessageType.REQUEST, // Offering help
    unspsc: 50201506, // UNSPSC code for fresh produce
    startTime: now,
    endTime: oneWeekLater,
    latitude: 40.7128, // Example: New York City
    longitude: -74.006,
    windows,
    publicKey: testPublicKey,
    optional: {
      qty: 50, // 50 kg available
      uom: UnitOfMeasure.KG,
      size: SizeCode.MEDIUM,
      floor: 0, // Ground floor
      diet: 0, // No dietary restrictions
    },
  };

  return message;
}

/**
 * Create a minimal test message (no optional fields)
 * Useful for testing smallest possible message size
 */
export function createMinimalBLETestMessage(): CompactMessage {
  const testPublicKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    testPublicKey[i] = i; // Predictable pattern for testing
  }

  const windows: TimeWindow[] = [
    {
      startHour: 9,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      daysOfWeek: 0x7f, // Every day
    },
  ];

  const now = Math.floor(Date.now() / 1000);
  const oneWeekLater = now + 7 * 24 * 60 * 60;

  const message: CompactMessage = {
    version: 1,
    messageType: MessageType.REQUEST,
    unspsc: 50201506,
    startTime: now,
    endTime: oneWeekLater,
    latitude: 40.7128,
    longitude: -74.006,
    windows,
    publicKey: testPublicKey,
    // No optional fields - creates smallest possible message
  };

  return message;
}

/**
 * Create a food request message (someone asking for help)
 */
export function createFoodRequestTestMessage(): CompactMessage {
  const testPublicKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    testPublicKey[i] = Math.floor(Math.random() * 256);
  }

  const windows: TimeWindow[] = [
    {
      startHour: 18,
      startMinute: 0,
      endHour: 20,
      endMinute: 0,
      daysOfWeek: 0x7f, // Available every day for pickup
    },
  ];

  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysLater = now + 30 * 24 * 60 * 60;

  const message: CompactMessage = {
    version: 1,
    messageType: MessageType.RESPONSE, // Requesting help
    unspsc: 50201710, // Prepared meals/takeout
    startTime: now,
    endTime: thirtyDaysLater,
    latitude: 40.7135,
    longitude: -74.008,
    windows,
    publicKey: testPublicKey,
    optional: {
      qty: 5, // 5 meals needed
      uom: UnitOfMeasure.MEAL,
      floor: 3, // 3rd floor
      room: 305, // Apartment 305
      diet: 1, // Vegan
    },
  };

  return message;
}

export default createBLETestMessage;
