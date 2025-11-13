# Message Types Clarification

## Two Different `MutualAidMessage` Types

### ❌ REMOVED: Legacy MutualAidMessage
**Location**: `src/types/message.ts` (DELETED)

This was the old verbose format with:
- `type: 'NEED' | 'OFFER' | 'COORDINATION'`
- `PrimaryCategory` enum
- Complex nested objects
- JSON-based (600+ bytes)

**Status**: ✅ Completely removed

### ✅ ACTIVE: Compact MutualAidMessage
**Location**: `schemas/mutual-aid-message.ts` (KEPT)

This is the new compact binary format with:
- `messageType: 0 | 1 | 2` (MessageType enum)
- UNSPSC codes for categories
- Binary encoding (69-81 bytes)
- 90%+ size reduction

**Status**: ✅ Active and in use

## Current References

All remaining `MutualAidMessage` references in the codebase are to the **compact format**:

```typescript
// ✅ CORRECT - This imports the compact format
import { MutualAidMessage } from '../../schemas/mutual-aid-message';

// ✅ CORRECT - Aliased for clarity
import { MutualAidMessage as CompactMessage } from '../../schemas/mutual-aid-message';
```

## Files Using Compact Format

1. **schemas/mutual-aid-message.ts** - Type definition and codec
2. **src/types/ble.ts** - BLE event types
3. **src/services/ble/bleProtocol.ts** - Encoding/decoding
4. **src/services/ble/bleManager.ts** - BLE manager
5. **src/services/ble/bleTestMessage.ts** - Test factories
6. **src/stores/bleStore.ts** - State management
7. **src/screens/BLETestScreen.tsx** - UI

## No Legacy Types Remain

Verified searches show:
- ❌ No `from '../types/message'` imports
- ❌ No `type: 'NEED'` or `type: 'OFFER'`
- ❌ No `PrimaryCategory` usage
- ❌ No legacy message validators
- ❌ No legacy message stores

## Type Comparison

### Legacy (Removed)
```typescript
interface MutualAidMessage {
  message_id: string;
  type: 'NEED' | 'OFFER' | 'COORDINATION';
  timestamp: string;
  public: {
    category: { primary: PrimaryCategory };
    location: { coords: string };
  };
  // ... many more fields
}
```
**Size**: 600+ bytes as JSON

### Compact (Active)
```typescript
interface MutualAidMessage {
  version: number;
  messageType: MessageType;  // 0, 1, 2
  unspsc: number;
  startTime: number;
  endTime: number;
  latitude: number;
  longitude: number;
  windows: TimeWindow[];
  publicKey: Uint8Array;
  optional?: OptionalFields;
}
```
**Size**: 69-81 bytes as binary

## Summary

✅ All `MutualAidMessage` references you see are **correct**
✅ They all refer to the compact binary format
✅ Zero legacy format references remain
✅ Codebase uses single, consistent message format
