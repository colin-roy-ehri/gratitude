/**
 * BLE Protocol - Message encoding/decoding for BLE transmission
 * Uses compact binary schema for efficient BLE transfer
 */

import { MutualAidMessage as CompactMessage } from '../../../schemas/mutual-aid-message';
import { BLEMessagePacket } from '../../types/ble';
import { Result } from '../../types/common';
import MutualAidMessageCodec from '../../../schemas/mutual-aid-message';
import { uint8ArrayToBase64, base64ToUint8Array, uint8ArrayToHex } from '../../utils/buffer';

/**
 * Encode a message for BLE transmission using compact binary format
 */
export function encodeMessageForBLE(message: CompactMessage): Result<Uint8Array> {
  try {
    // Serialize message to compact binary format
    const binary = MutualAidMessageCodec.serialize(message);

    // Check size constraints (BLE has ~512 byte limit per characteristic)
    if (binary.byteLength > 512) {
      return {
        success: false,
        error: `Message too large for BLE transmission (${binary.byteLength} > 512 bytes)`,
      };
    }

    return { success: true, data: binary };
  } catch (error) {
    return {
      success: false,
      error: `Failed to encode message: ${(error as Error).message}`,
    };
  }
}

/**
 * Decode a BLE message from compact binary format
 */
export function decodeMessageFromBLE(binary: Uint8Array): Result<CompactMessage> {
  try {
    // Deserialize from compact binary format
    const message = MutualAidMessageCodec.deserialize(binary);

    return { success: true, data: message };
  } catch (error) {
    return {
      success: false,
      error: `Failed to decode message: ${(error as Error).message}`,
    };
  }
}

/**
 * Create a BLE message packet with metadata
 * Note: The compact binary format already includes integrity checks
 */
export function createBLEPacket(message: CompactMessage): Result<BLEMessagePacket> {
  const encodeResult = encodeMessageForBLE(message);

  if (!encodeResult.success) {
    return { success: false, error: encodeResult.error };
  }

  // Convert binary to base64 for compatibility with BLE string transmission
  const base64Payload = uint8ArrayToBase64(encodeResult.data);

  // Generate a simple message ID from the public key and timestamp
  // In the compact format, we don't have a message_id field like the old format
  const messageId = uint8ArrayToHex(message.publicKey.slice(0, 16));

  const packet: BLEMessagePacket = {
    messageId,
    hopCount: 0, // Compact format doesn't have hop_count in the message itself
    timestamp: Date.now(),
    payload: base64Payload,
    checksum: generateChecksum(base64Payload),
  };

  return { success: true, data: packet };
}

/**
 * Verify and extract message from BLE packet
 */
export function extractMessageFromPacket(
  packet: BLEMessagePacket
): Result<CompactMessage> {
  // Verify checksum
  const expectedChecksum = generateChecksum(packet.payload);
  if (packet.checksum !== expectedChecksum) {
    return {
      success: false,
      error: 'Checksum mismatch - packet corrupted',
    };
  }

  // Decode message from base64 to binary
  const binary = base64ToUint8Array(packet.payload);

  // Decode message
  return decodeMessageFromBLE(binary);
}

/**
 * Generate simple checksum for data integrity
 * (In production, would use CRC32 or similar)
 */
function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Split large messages into chunks for BLE transmission
 * (For future use if messages exceed BLE characteristic size)
 */
export function chunkMessage(
  encoded: string,
  chunkSize: number = 512
): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += chunkSize) {
    chunks.push(encoded.substring(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Reassemble chunks into complete message
 */
export function reassembleChunks(chunks: string[]): string {
  return chunks.join('');
}
