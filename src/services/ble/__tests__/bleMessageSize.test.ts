/**
 * BLE Message Size Tests
 * Verifies that messages using compact binary schema are small enough for BLE
 */

import MutualAidMessageCodec from '../../../../schemas/mutual-aid-message';
import {
  createBLETestMessage,
  createMinimalBLETestMessage,
  createFoodRequestTestMessage,
} from '../bleTestMessage';
import { encodeMessageForBLE, createBLEPacket } from '../bleProtocol';
import { uint8ArrayToBase64 } from '../../../utils/buffer';

describe('BLE Message Size Tests', () => {
  test('Full test message should be under 100 bytes', () => {
    const message = createBLETestMessage();
    const binary = MutualAidMessageCodec.serialize(message);

    console.log('Full test message size:', binary.byteLength, 'bytes');
    console.log('Message details:', MutualAidMessageCodec.toString(message));

    // Expected: ~73 bytes (base 64 + 2 windows + all optional fields)
    expect(binary.byteLength).toBeLessThan(100);
    expect(binary.byteLength).toBeGreaterThan(60);
  });

  test('Minimal test message should be around 64 bytes', () => {
    const message = createMinimalBLETestMessage();
    const binary = MutualAidMessageCodec.serialize(message);

    console.log('Minimal test message size:', binary.byteLength, 'bytes');

    // Expected: ~64 bytes (base size with 1 window, no optionals)
    expect(binary.byteLength).toBeLessThan(75);
    expect(binary.byteLength).toBeGreaterThan(55);
  });

  test('Food request message should be under 85 bytes', () => {
    const message = createFoodRequestTestMessage();
    const binary = MutualAidMessageCodec.serialize(message);

    console.log('Food request message size:', binary.byteLength, 'bytes');

    // Expected: ~70 bytes (base + 1 window + 5 optional fields)
    expect(binary.byteLength).toBeLessThan(85);
  });

  test('BLE encoding should work correctly', () => {
    const message = createBLETestMessage();
    const result = encodeMessageForBLE(message);

    expect(result.success).toBe(true);
    if (result.success) {
      console.log('Encoded binary size:', result.data.byteLength, 'bytes');
      expect(result.data.byteLength).toBeLessThan(512);
    }
  });

  test('BLE packet should include metadata', () => {
    const message = createBLETestMessage();
    const result = createBLEPacket(message);

    expect(result.success).toBe(true);
    if (result.success) {
      const packet = result.data;
      console.log('BLE packet payload (base64) size:', packet.payload.length, 'chars');

      expect(packet.messageId).toBeDefined();
      expect(packet.hopCount).toBeDefined();
      expect(packet.timestamp).toBeDefined();
      expect(packet.payload).toBeDefined();
      expect(packet.checksum).toBeDefined();

      // Base64 encoding increases size by ~33%, but should still be well under 512
      expect(packet.payload.length).toBeLessThan(200);
    }
  });

  test('Round-trip serialization should preserve data', () => {
    const original = createBLETestMessage();
    const binary = MutualAidMessageCodec.serialize(original);
    const deserialized = MutualAidMessageCodec.deserialize(binary);

    expect(deserialized.version).toBe(original.version);
    expect(deserialized.messageType).toBe(original.messageType);
    expect(deserialized.unspsc).toBe(original.unspsc);
    expect(deserialized.startTime).toBe(original.startTime);
    expect(deserialized.endTime).toBe(original.endTime);

    // Coordinates should be within precision (5 decimal places)
    expect(Math.abs(deserialized.latitude - original.latitude)).toBeLessThan(0.00001);
    expect(Math.abs(deserialized.longitude - original.longitude)).toBeLessThan(0.00001);

    // Windows should match
    expect(deserialized.windows).toHaveLength(original.windows.length);
    expect(deserialized.windows[0].startHour).toBe(original.windows[0].startHour);
    expect(deserialized.windows[0].daysOfWeek).toBe(original.windows[0].daysOfWeek);

    // Optional fields should match
    expect(deserialized.optional?.qty).toBe(original.optional?.qty);
    expect(deserialized.optional?.uom).toBe(original.optional?.uom);
    expect(deserialized.optional?.floor).toBe(original.optional?.floor);
  });

  test('Compare compact binary vs JSON encoding', () => {
    const message = createBLETestMessage();

    // Compact binary
    const binary = MutualAidMessageCodec.serialize(message);

    // Old JSON approach (for comparison)
    const json = JSON.stringify(message);
    const jsonBytes = new TextEncoder().encode(json);
    const jsonBase64 = uint8ArrayToBase64(jsonBytes);

    console.log('\n=== SIZE COMPARISON ===');
    console.log('Compact binary:', binary.byteLength, 'bytes');
    console.log('JSON string:', json.length, 'bytes');
    console.log('JSON base64:', jsonBase64.length, 'bytes');
    console.log('Space saved:', jsonBase64.length - binary.byteLength, 'bytes');
    console.log('Reduction:', ((1 - binary.byteLength / jsonBase64.length) * 100).toFixed(1) + '%');

    // Binary should be MUCH smaller than JSON
    expect(binary.byteLength).toBeLessThan(json.length * 0.5);
  });
});
