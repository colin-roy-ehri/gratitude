# BLE Message Format - Compact Binary Schema

## Overview

The app uses a compact binary message format for all BLE communication, achieving **90%+ size reduction** compared to JSON encoding.

**Message size: 69-81 bytes** (vs 600+ bytes with JSON)

## Message Structure

All messages use the `MutualAidMessage` type from `/schemas/mutual-aid-message.ts`:

```typescript
interface MutualAidMessage {
  version: number;              // Format version (always 1)
  messageType: MessageType;     // 0=REQUEST, 1=RESPONSE, 2=MATCH
  unspsc: number;              // Product/service code
  startTime: number;           // Unix timestamp (seconds)
  endTime: number;             // Unix timestamp (seconds)
  latitude: number;            // Decimal degrees
  longitude: number;           // Decimal degrees
  windows: TimeWindow[];       // Availability time windows
  publicKey: Uint8Array;       // 32-byte Ed25519 public key
  optional?: OptionalFields;   // Optional metadata
}
```

## Message Types

### MessageType Enum

```typescript
enum MessageType {
  REQUEST = 0,   // Offering help/resources
  RESPONSE = 1,  // Requesting help/resources
  MATCH = 2,     // Agreement between parties
}
```

### Time Windows

```typescript
interface TimeWindow {
  startHour: number;      // 0-23
  startMinute: number;    // 0-59
  endHour: number;        // 0-23
  endMinute: number;      // 0-59
  daysOfWeek: number;     // Bitmask (bit 0=Sun, bit 6=Sat)
}
```

**Days of Week Examples:**
- `0x7F` (127) = Every day
- `0x3E` (62) = Weekdays (Mon-Fri)
- `0x41` (65) = Weekend (Sat-Sun)

### Optional Fields

```typescript
interface OptionalFields {
  qty?: number;          // Quantity (0-65535)
  uom?: UnitOfMeasure;  // Unit of measure
  size?: SizeCode;      // Size category
  floor?: number;       // Floor number (0-999)
  room?: number;        // Room number (0-9999)
  diet?: number;        // Diet code (0-9)
}
```

## Creating Messages

### Using Test Message Factories

```typescript
import { createBLETestMessage } from './src/services/ble/bleTestMessage';

// Standard test message (food offer)
const message = createBLETestMessage();
// Size: 81 bytes

// Minimal message (no optionals)
const minimal = createMinimalBLETestMessage();
// Size: 69 bytes

// Food request message
const request = createFoodRequestTestMessage();
// Size: 77 bytes
```

### Creating Custom Messages

```typescript
import { MutualAidMessage, MessageType } from '../schemas/mutual-aid-message';

const message: MutualAidMessage = {
  version: 1,
  messageType: MessageType.REQUEST,  // Offering help
  unspsc: 50201506,                 // Fresh produce
  startTime: Math.floor(Date.now() / 1000),
  endTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  latitude: 40.7128,
  longitude: -74.006,
  windows: [
    {
      startHour: 9,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      daysOfWeek: 0x3E,  // Mon-Fri
    },
  ],
  publicKey: myPublicKey,  // 32-byte Uint8Array
  optional: {
    qty: 50,
    uom: UnitOfMeasure.KG,
    floor: 0,
  },
};
```

## Broadcasting Messages

### From the BLE Store

```typescript
import { useBLEStore } from './src/stores/bleStore';
import { createBLETestMessage } from './src/services/ble/bleTestMessage';

const { broadcastMessage } = useBLEStore();

// Create and broadcast
const message = createBLETestMessage();
await broadcastMessage(message);
```

### Direct API Usage

```typescript
import { bleManager } from './src/services/ble/bleManager';
import MutualAidMessageCodec from './schemas/mutual-aid-message';

// Create message
const message = createBLETestMessage();

// Verify size
const binary = MutualAidMessageCodec.serialize(message);
console.log('Size:', binary.byteLength, 'bytes');

// Broadcast
await bleManager.broadcastMessage(message);
```

## Receiving Messages

Messages are automatically received and stored in the BLE store:

```typescript
const { receivedMessages } = useBLEStore();

// Access received messages
receivedMessages.forEach(msg => {
  console.log('Type:', MessageType[msg.messageType]);
  console.log('UNSPSC:', msg.unspsc);
  console.log('Location:', msg.latitude, msg.longitude);
  console.log('Windows:', msg.windows.length);
});
```

## UNSPSC Codes

Common codes for mutual aid:

| Code | Description |
|------|-------------|
| 50201506 | Fresh vegetables |
| 50201507 | Fresh fruits |
| 50201710 | Prepared meals/takeout |
| 50201735 | Beverages (non-alcoholic) |
| 72101505 | Medical supplies |
| 72101506 | First aid kits |
| 48191503 | Clothing |
| 72101702 | Hygiene products |

See `/schemas/SPEC.md` for full specification.

## Binary Format Details

### Wire Format

```
Byte 0:       Version (0x01)
Byte 1:       Flags (message type + optional field bits)
Bytes 2-5:    UNSPSC code (uint32 LE)
Bytes 6-9:    Start timestamp (uint32 LE)
Bytes 10-13:  End timestamp (uint32 LE)
Bytes 14-17:  Latitude (int32 LE, scaled ×100,000)
Bytes 18-21:  Longitude (int32 LE, scaled ×100,000)
Byte 22:      Window count
Bytes 23+:    Time windows (5 bytes each)
Bytes N+:     Ed25519 public key (32 bytes)
Bytes N+32+:  Optional fields (variable)
```

### Flags Byte

```
Bits 0-1: Message Type
  00 = REQUEST
  01 = RESPONSE
  10 = MATCH

Bits 2-7: Optional Field Presence
  Bit 2: qty present
  Bit 3: uom present
  Bit 4: size present
  Bit 5: floor present
  Bit 6: room present
  Bit 7: diet present
```

## Testing

### Run Size Tests

```bash
npm test -- bleMessageSize.test.ts
```

Expected output:
```
✓ Full test message: 81 bytes
✓ Minimal message: 69 bytes
✓ Food request: 77 bytes
✓ All under 512 byte BLE limit
Reduction: 90.3% vs JSON
```

### Manual Testing

```typescript
import MutualAidMessageCodec from './schemas/mutual-aid-message';
import { createBLETestMessage } from './src/services/ble/bleTestMessage';

// Create message
const message = createBLETestMessage();

// Serialize
const binary = MutualAidMessageCodec.serialize(message);
console.log('Size:', binary.byteLength, 'bytes');

// Human-readable
console.log(MutualAidMessageCodec.toString(message));
// Output: MutualAidMessage v1 [REQUEST] UNSPSC:50201506 40.71280,-74.00600 ...

// Round-trip test
const decoded = MutualAidMessageCodec.deserialize(binary);
console.log('Matches:', decoded.unspsc === message.unspsc);
```

## Performance

- **Serialization**: < 1ms on modern devices
- **Size**: 69-81 bytes (90% smaller than JSON)
- **BLE Compatible**: Well under 512 byte MTU limit
- **Precision**: Coordinates accurate to ±1.1 meters

## Implementation Notes

1. **Public Keys**: Each message includes a 32-byte Ed25519 public key for sender verification
2. **Coordinates**: Stored as scaled integers (×100,000) for 5 decimal place precision
3. **Timestamps**: Unix seconds (uint32), valid until year 2106
4. **Time Windows**: Use local time, interpreted by each device in their timezone
5. **Endianness**: Little-endian (Intel convention) throughout

## Migration from Legacy Format

The legacy JSON message format has been completely removed. All BLE communication now uses the compact binary format exclusively.

**Key changes:**
- Removed `/src/types/message.ts` (legacy types)
- Removed message adapter (no longer needed)
- BLE store works directly with compact format
- 90%+ reduction in message size
- Simplified codebase

## See Also

- `/schemas/SPEC.md` - Complete binary format specification
- `/schemas/mutual-aid-message.ts` - TypeScript types and codec
- `/schemas/example-usage.ts` - Usage examples
- `/src/services/ble/bleTestMessage.ts` - Test message factories
