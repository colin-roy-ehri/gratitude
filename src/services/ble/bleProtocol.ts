/**
 * BLE Protocol - Message encoding/decoding for BLE transmission
 * Handles serialization and compression for efficient BLE transfer
 */

import { MutualAidMessage } from '../../types/message';
import { BLEMessagePacket } from '../../types/ble';
import { Result } from '../../types/common';

/**
 * Encode a message for BLE transmission
 * Compresses and encodes the message into a BLE-friendly format
 */
export function encodeMessageForBLE(message: MutualAidMessage): Result<string> {
  try {
    // Serialize message to JSON
    const json = JSON.stringify(message);

    // Base64 encode (in production, would also compress)
    const encoded = Buffer.from(json, 'utf-8').toString('base64');

    // Check size constraints (BLE has ~512 byte limit per characteristic)
    if (encoded.length > 512) {
      return {
        success: false,
        error: 'Message too large for BLE transmission (>512 bytes)',
      };
    }

    return { success: true, data: encoded };
  } catch (error) {
    return {
      success: false,
      error: `Failed to encode message: ${(error as Error).message}`,
    };
  }
}

/**
 * Decode a BLE message packet
 */
export function decodeMessageFromBLE(encoded: string): Result<MutualAidMessage> {
  try {
    // Base64 decode
    const json = Buffer.from(encoded, 'base64').toString('utf-8');

    // Parse JSON
    const message = JSON.parse(json) as MutualAidMessage;

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
 */
export function createBLEPacket(message: MutualAidMessage): Result<BLEMessagePacket> {
  const encodeResult = encodeMessageForBLE(message);

  if (!encodeResult.success) {
    return { success: false, error: encodeResult.error };
  }

  const packet: BLEMessagePacket = {
    messageId: message.message_id,
    hopCount: message.hop_count || 0,
    timestamp: Date.now(),
    payload: encodeResult.data,
    checksum: generateChecksum(encodeResult.data),
  };

  return { success: true, data: packet };
}

/**
 * Verify and extract message from BLE packet
 */
export function extractMessageFromPacket(
  packet: BLEMessagePacket
): Result<MutualAidMessage> {
  // Verify checksum
  const expectedChecksum = generateChecksum(packet.payload);
  if (packet.checksum !== expectedChecksum) {
    return {
      success: false,
      error: 'Checksum mismatch - packet corrupted',
    };
  }

  // Decode message
  return decodeMessageFromBLE(packet.payload);
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
