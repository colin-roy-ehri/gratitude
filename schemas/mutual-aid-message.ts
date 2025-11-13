/**
 * Compact Mutual Aid Message Format
 * Version 1.0
 * 
 * Binary spec for offline-first P2P mutual aid availability messages
 * Designed for BLE transmission and low-power devices
 */

// ============================================================================
// BINARY LAYOUT SPECIFICATION
// ============================================================================
/*
BYTE LAYOUT (little-endian):

0            VERSION (1 byte)
             [Version code: 0x01]

1            FLAGS (1 byte)
             Bits 0-1: Message type (0=request, 1=response, 2=match, 3=reserved)
             Bits 2-7: Optional field presence flags
               Bit 2: qty present
               Bit 3: uom present
               Bit 4: size present
               Bit 5: floor present
               Bit 6: room present
               Bit 7: diet present

2-5          UNSPSC CODE (4 bytes, uint32 LE)
             Product/service code

6-9          START TIMESTAMP (4 bytes, uint32 LE)
             Unix timestamp (seconds)

10-13        END TIMESTAMP (4 bytes, uint32 LE)
             Unix timestamp (seconds)

14-17        LATITUDE (4 bytes, int32 LE)
             Scaled by 100,000 (5 decimal precision)

18-21        LONGITUDE (4 bytes, int32 LE)
             Scaled by 100,000 (5 decimal precision)

22           WINDOW COUNT (1 byte)
             Number of availability windows (0-255)

23-N         AVAILABILITY WINDOWS (5 bytes each)
             Per window:
               - Start hour (1 byte, 0-23)
               - Start minute (1 byte, 0-59)
               - End hour (1 byte, 0-23)
               - End minute (1 byte, 0-59)
               - Day-of-week bitmask (1 byte)
                 Bits 0-6: Sun-Sat (bit 0 = Sunday)

N+1-N+32     ED25519 PUBLIC KEY (32 bytes)
             Sender's public key for verification

N+33+        OPTIONAL FIELDS (variable length)
             Only included if corresponding flag bit is set:
               - qty: 2 bytes (uint16 LE)
               - uom: 1 byte (enum)
               - size: 1 byte (enum)
               - floor: 2 bytes (uint16 LE, 0-999)
               - room: 2 bytes (uint16 LE, 0-9999)
               - diet: 1 byte (code 0-9)

TOTAL BASE SIZE: 64 bytes (no optional fields)
TOTAL WITH ALL OPTIONALS: ~73 bytes
*/

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface TimeWindow {
  startHour: number;      // 0-23
  startMinute: number;    // 0-59
  endHour: number;        // 0-23
  endMinute: number;      // 0-59
  daysOfWeek: number;     // Bitmask: bits 0-6 for Sun-Sat
}

export enum MessageType {
  REQUEST = 0,
  RESPONSE = 1,
  MATCH = 2,
}

export enum UnitOfMeasure {
  UNIT = 0,              // Individual items
  KG = 1,                // Kilograms
  LB = 2,                // Pounds
  L = 3,                 // Liters
  GAL = 4,               // Gallons
  CASE = 5,              // Case/box
  DOZEN = 6,
  MEAL = 7,
}

export enum SizeCode {
  SMALL = 0,
  MEDIUM = 1,
  LARGE = 2,
  XLARGE = 3,
  BULK = 4,
}

export interface OptionalFields {
  qty?: number;          // 0-65535
  uom?: UnitOfMeasure;
  size?: SizeCode;
  floor?: number;        // 0-999 (3 digits)
  room?: number;         // 0-9999 (4 digits)
  diet?: number;         // 0-9 (diet restriction code)
}

export interface MutualAidMessage {
  version: number;
  messageType: MessageType;
  unspsc: number;
  startTime: number;     // Unix timestamp
  endTime: number;       // Unix timestamp
  latitude: number;      // Decimal degrees (±90)
  longitude: number;     // Decimal degrees (±180)
  windows: TimeWindow[];
  publicKey: Uint8Array; // 32 bytes
  optional?: OptionalFields;
}

// ============================================================================
// SERIALIZATION
// ============================================================================

export class MutualAidMessageCodec {
  private static readonly VERSION = 0x01;
  private static readonly BASE_SIZE = 64;

  /**
   * Serialize a message to binary format
   */
  static serialize(msg: MutualAidMessage): Uint8Array {
    // Calculate optional fields size
    let optionalSize = 0;
    let optionalBuffer: Uint8Array | null = null;

    if (msg.optional) {
      optionalBuffer = this.serializeOptional(msg.optional);
      optionalSize = optionalBuffer.byteLength;
    }

    // Create buffer: base (64) + windows + optionals
    const windowsSize = msg.windows.length * 5;
    const totalSize = this.BASE_SIZE + windowsSize + optionalSize;
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);
    let offset = 0;

    // Version
    view.setUint8(offset++, this.VERSION);

    // Flags
    const flags = this.encodeFlags(msg.messageType, msg.optional);
    view.setUint8(offset++, flags);

    // UNSPSC
    view.setUint32(offset, msg.unspsc, true);
    offset += 4;

    // Timestamps
    view.setUint32(offset, msg.startTime, true);
    offset += 4;
    view.setUint32(offset, msg.endTime, true);
    offset += 4;

    // Coordinates (scaled by 100,000)
    const latScaled = Math.round(msg.latitude * 100000);
    const lonScaled = Math.round(msg.longitude * 100000);
    view.setInt32(offset, latScaled, true);
    offset += 4;
    view.setInt32(offset, lonScaled, true);
    offset += 4;

    // Window count
    view.setUint8(offset++, msg.windows.length);

    // Windows
    for (const window of msg.windows) {
      view.setUint8(offset++, window.startHour);
      view.setUint8(offset++, window.startMinute);
      view.setUint8(offset++, window.endHour);
      view.setUint8(offset++, window.endMinute);
      view.setUint8(offset++, window.daysOfWeek);
    }

    // Public key (32 bytes)
    buffer.set(msg.publicKey, offset);
    offset += 32;

    // Optional fields
    if (optionalBuffer) {
      buffer.set(optionalBuffer, offset);
    }

    return buffer;
  }

  /**
   * Deserialize binary data to message
   */
  static deserialize(buffer: Uint8Array): MutualAidMessage {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let offset = 0;

    // Version
    const version = view.getUint8(offset++);
    if (version !== this.VERSION) {
      throw new Error(`Unsupported message version: ${version}`);
    }

    // Flags
    const flags = view.getUint8(offset++);
    const messageType = flags & 0x03;
    const optionalFlags = (flags >> 2) & 0x3f;

    // UNSPSC
    const unspsc = view.getUint32(offset, true);
    offset += 4;

    // Timestamps
    const startTime = view.getUint32(offset, true);
    offset += 4;
    const endTime = view.getUint32(offset, true);
    offset += 4;

    // Coordinates
    const latScaled = view.getInt32(offset, true);
    offset += 4;
    const lonScaled = view.getInt32(offset, true);
    offset += 4;
    const latitude = latScaled / 100000;
    const longitude = lonScaled / 100000;

    // Windows
    const windowCount = view.getUint8(offset++);
    const windows: TimeWindow[] = [];

    for (let i = 0; i < windowCount; i++) {
      windows.push({
        startHour: view.getUint8(offset++),
        startMinute: view.getUint8(offset++),
        endHour: view.getUint8(offset++),
        endMinute: view.getUint8(offset++),
        daysOfWeek: view.getUint8(offset++),
      });
    }

    // Public key
    const publicKey = new Uint8Array(buffer.slice(offset, offset + 32));
    offset += 32;

    // Optional fields
    let optional: OptionalFields | undefined;
    if (optionalFlags > 0 && offset < buffer.length) {
      optional = this.deserializeOptional(
        buffer.slice(offset),
        optionalFlags
      );
    }

    return {
      version,
      messageType: messageType as MessageType,
      unspsc,
      startTime,
      endTime,
      latitude,
      longitude,
      windows,
      publicKey,
      optional,
    };
  }

  /**
   * Encode message type and optional field flags into single byte
   */
  private static encodeFlags(
    messageType: MessageType,
    optional?: OptionalFields
  ): number {
    let flags = messageType & 0x03;

    if (optional) {
      if (optional.qty !== undefined) flags |= 0x04;
      if (optional.uom !== undefined) flags |= 0x08;
      if (optional.size !== undefined) flags |= 0x10;
      if (optional.floor !== undefined) flags |= 0x20;
      if (optional.room !== undefined) flags |= 0x40;
      if (optional.diet !== undefined) flags |= 0x80;
    }

    return flags;
  }

  /**
   * Serialize optional fields to buffer
   */
  private static serializeOptional(optional: OptionalFields): Uint8Array {
    const chunks: Uint8Array[] = [];
    const view = (bytes: number) => new DataView(new ArrayBuffer(bytes));

    if (optional.qty !== undefined) {
      const v = view(2);
      v.setUint16(0, optional.qty, true);
      chunks.push(new Uint8Array(v.buffer));
    }

    if (optional.uom !== undefined) {
      chunks.push(new Uint8Array([optional.uom]));
    }

    if (optional.size !== undefined) {
      chunks.push(new Uint8Array([optional.size]));
    }

    if (optional.floor !== undefined) {
      const v = view(2);
      v.setUint16(0, optional.floor, true);
      chunks.push(new Uint8Array(v.buffer));
    }

    if (optional.room !== undefined) {
      const v = view(2);
      v.setUint16(0, optional.room, true);
      chunks.push(new Uint8Array(v.buffer));
    }

    if (optional.diet !== undefined) {
      chunks.push(new Uint8Array([optional.diet]));
    }

    // Combine all chunks
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Deserialize optional fields from buffer using flags
   */
  private static deserializeOptional(
    buffer: Uint8Array,
    flags: number
  ): OptionalFields {
    const optional: OptionalFields = {};
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    let offset = 0;

    if (flags & 0x01) {
      // qty
      optional.qty = view.getUint16(offset, true);
      offset += 2;
    }

    if (flags & 0x02) {
      // uom
      optional.uom = view.getUint8(offset++);
    }

    if (flags & 0x04) {
      // size
      optional.size = view.getUint8(offset++);
    }

    if (flags & 0x08) {
      // floor
      optional.floor = view.getUint16(offset, true);
      offset += 2;
    }

    if (flags & 0x10) {
      // room
      optional.room = view.getUint16(offset, true);
      offset += 2;
    }

    if (flags & 0x20) {
      // diet
      optional.diet = view.getUint8(offset++);
    }

    return optional;
  }

  /**
   * Get human-readable representation
   */
  static toString(msg: MutualAidMessage): string {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const windowStr = msg.windows
      .map((w) => {
        const days = Array.from({ length: 7 })
          .map((_, i) => (w.daysOfWeek & (1 << i) ? dayNames[i] : null))
          .filter(Boolean)
          .join(',');
        return `${w.startHour.toString().padStart(2, '0')}:${w.startMinute
          .toString()
          .padStart(2, '0')}-${w.endHour.toString().padStart(2, '0')}:${w.endMinute
          .toString()
          .padStart(2, '0')} (${days})`;
      })
      .join(' | ');

    return `MutualAidMessage v${msg.version} [${MessageType[msg.messageType]}] UNSPSC:${msg.unspsc} ${msg.latitude.toFixed(5)},${msg.longitude.toFixed(5)} ${windowStr}`;
  }
}

export default MutualAidMessageCodec;
