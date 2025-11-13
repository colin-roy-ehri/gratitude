/**
 * EXAMPLE USAGE: React Native Mutual Aid App
 * 
 * Shows how to create, serialize, and deserialize messages
 */

import MutualAidMessageCodec, {
  MutualAidMessage,
  MessageType,
  UnitOfMeasure,
  SizeCode,
  TimeWindow,
} from './mutual-aid-message';

// ============================================================================
// EXAMPLE 1: Creating a REQUEST message (someone offering help)
// ============================================================================

export function createFoodOfferMessage(senderPublicKey: Uint8Array): Uint8Array {
  // Monday-Friday, 9am-5pm food distribution
  // Also Saturday 2-4pm for community center distribution
  const windows: TimeWindow[] = [
    {
      startHour: 9,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      daysOfWeek: 0x3e, // Mon-Fri (bits 1-5)
    },
    {
      startHour: 14,
      startMinute: 0,
      endHour: 16,
      endMinute: 0,
      daysOfWeek: 0x40, // Saturday (bit 6)
    },
  ];

  const message: MutualAidMessage = {
    version: 1,
    messageType: MessageType.REQUEST, // We're offering (requesting help from community)
    unspsc: 50201506, // Fresh produce
    startTime: Math.floor(Date.now() / 1000),
    endTime: Math.floor(Date.now() / 1000) + 86400 * 7, // Valid for 1 week
    latitude: 40.7128, // NYC example
    longitude: -74.006,
    windows,
    publicKey: senderPublicKey,
    optional: {
      qty: 50, // 50 kg of produce
      uom: UnitOfMeasure.KG,
      size: SizeCode.MEDIUM,
      floor: 0, // Ground floor
      diet: 0, // No dietary restrictions
    },
  };

  const serialized = MutualAidMessageCodec.serialize(message);
  console.log(`Message size: ${serialized.byteLength} bytes`);
  console.log(MutualAidMessageCodec.toString(message));

  return serialized;
}

// ============================================================================
// EXAMPLE 2: Creating a RESPONSE message (someone asking for help)
// ============================================================================

export function createFoodRequestMessage(senderPublicKey: Uint8Array): Uint8Array {
  const windows: TimeWindow[] = [
    {
      startHour: 10,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
      daysOfWeek: 0x7f, // Every day
    },
  ];

  const message: MutualAidMessage = {
    version: 1,
    messageType: MessageType.RESPONSE, // We're requesting
    unspsc: 50201506, // Fresh produce needed
    startTime: Math.floor(Date.now() / 1000),
    endTime: Math.floor(Date.now() / 1000) + 86400 * 30, // Valid for 30 days
    latitude: 40.7135,
    longitude: -74.008,
    windows,
    publicKey: senderPublicKey,
    optional: {
      qty: 10, // Need 10 units
      uom: UnitOfMeasure.UNIT,
      floor: 3, // 3rd floor
      room: 305, // Apt 305
      diet: 1, // Vegan (example code)
    },
  };

  return MutualAidMessageCodec.serialize(message);
}

// ============================================================================
// EXAMPLE 3: Deserialize and work with received message
// ============================================================================

export function processReceivedMessage(buffer: Uint8Array): void {
  try {
    const message = MutualAidMessageCodec.deserialize(buffer);

    console.log('✓ Message decoded successfully');
    console.log(`  Type: ${MessageType[message.messageType]}`);
    console.log(`  UNSPSC: ${message.unspsc}`);
    console.log(`  Location: ${message.latitude}, ${message.longitude}`);
    console.log(`  Available: ${message.windows.length} time window(s)`);

    if (message.optional) {
      console.log('  Optional fields:');
      if (message.optional.qty !== undefined) {
        console.log(`    - Qty: ${message.optional.qty}`);
      }
      if (message.optional.uom !== undefined) {
        console.log(`    - UOM: ${UnitOfMeasure[message.optional.uom]}`);
      }
      if (message.optional.floor !== undefined) {
        console.log(`    - Floor: ${message.optional.floor}`);
      }
      if (message.optional.room !== undefined) {
        console.log(`    - Room: ${message.optional.room}`);
      }
      if (message.optional.diet !== undefined) {
        console.log(`    - Diet code: ${message.optional.diet}`);
      }
    }

    // Check if available now
    const now = new Date();
    const isAvailableNow = message.windows.some(
      (w) =>
        (w.daysOfWeek & (1 << now.getDay())) &&
        getCurrentTimeInMinutes() >= toMinutes(w.startHour, w.startMinute) &&
        getCurrentTimeInMinutes() < toMinutes(w.endHour, w.endMinute)
    );

    console.log(`  Available now: ${isAvailableNow ? '✓ YES' : '✗ NO'}`);
  } catch (error) {
    console.error('Failed to decode message:', error);
  }
}

// ============================================================================
// EXAMPLE 4: React Native component skeleton
// ============================================================================

/*
// In your React Native component:

import { View, Text, Button } from 'react-native';
import { useState } from 'react';
import MutualAidMessageCodec from './mutual-aid-message';

export function MutualAidBroadcaster() {
  const [lastMessageSize, setLastMessageSize] = useState<number>(0);

  const handleBroadcastOffer = async () => {
    try {
      // In real app, you'd get the user's actual public key
      const publicKey = new Uint8Array(32); // TODO: Get from secure storage
      
      const messageBuffer = createFoodOfferMessage(publicKey);
      setLastMessageSize(messageBuffer.byteLength);

      // Send via BLE or other transport
      // await bleManager.write(deviceId, serviceUUID, characteristicUUID, messageBuffer);
      
      console.log(`Broadcast ${messageBuffer.byteLength} byte message`);
    } catch (error) {
      console.error('Failed to broadcast:', error);
    }
  };

  return (
    <View>
      <Text>Message size: {lastMessageSize} bytes (max 512)</Text>
      <Button title="Broadcast Offer" onPress={handleBroadcastOffer} />
    </View>
  );
}
*/

// ============================================================================
// UTILITIES
// ============================================================================

function toMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

function getCurrentTimeInMinutes(): number {
  const now = new Date();
  return toMinutes(now.getHours(), now.getMinutes());
}

// ============================================================================
// TEST: Message round-trip (serialize + deserialize)
// ============================================================================

export function testRoundTrip(): void {
  console.log('\n=== ROUND-TRIP TEST ===\n');

  // Create a test key (normally you'd use a real Ed25519 key)
  const testKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    testKey[i] = Math.floor(Math.random() * 256);
  }

  // Create original message
  const original: MutualAidMessage = {
    version: 1,
    messageType: MessageType.REQUEST,
    unspsc: 50201506,
    startTime: 1700000000,
    endTime: 1700086400,
    latitude: 40.7128,
    longitude: -74.006,
    windows: [
      {
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
        daysOfWeek: 0x3e,
      },
    ],
    publicKey: testKey,
    optional: {
      qty: 50,
      uom: UnitOfMeasure.KG,
      floor: 3,
      room: 305,
      diet: 1,
    },
  };

  // Serialize
  const serialized = MutualAidMessageCodec.serialize(original);
  console.log(`✓ Serialized to ${serialized.byteLength} bytes`);

  // Deserialize
  const deserialized = MutualAidMessageCodec.deserialize(serialized);
  console.log('✓ Deserialized successfully');

  // Verify all fields match
  const matches =
    deserialized.version === original.version &&
    deserialized.messageType === original.messageType &&
    deserialized.unspsc === original.unspsc &&
    deserialized.startTime === original.startTime &&
    deserialized.endTime === original.endTime &&
    Math.abs(deserialized.latitude - original.latitude) < 0.00001 &&
    Math.abs(deserialized.longitude - original.longitude) < 0.00001 &&
    deserialized.optional?.qty === original.optional?.qty &&
    deserialized.optional?.floor === original.optional?.floor;

  if (matches) {
    console.log('✓ All fields match - round-trip successful!');
  } else {
    console.error('✗ Fields do not match');
  }

  console.log('\nOriginal:');
  console.log(MutualAidMessageCodec.toString(original));
  console.log('\nDeserialized:');
  console.log(MutualAidMessageCodec.toString(deserialized));
}

// Run test
testRoundTrip();
