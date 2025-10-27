# Phase 2: BLE Proof of Concept - COMPLETE

## Overview

Phase 2 implements the core Bluetooth Low Energy (BLE) mesh networking functionality for peer-to-peer message broadcasting. This POC demonstrates device discovery, message transmission, and basic flooding protocol with hop limits.

## Implementation Status: ✅ COMPLETE

All components implemented and TypeScript compilation successful.

## Components Implemented

### 1. BLE Types (`src/types/ble.ts`)

Comprehensive type definitions for BLE operations:
- `BLEDevice` - Device information (ID, name, RSSI, connection state)
- `BLEMessagePacket` - Message packet format with checksum
- `BLEConfig` - Configuration options (max connections, scan duration, hop limits)
- `BLEError` - Error types and handling
- `SeenMessage` - Flood control tracking

**Key Constants:**
- Service UUID: `00000001-0000-1000-8000-00805f9b34fb`
- Characteristic UUID: `00000002-0000-1000-8000-00805f9b34fb`
- Max hop count: 10
- Max connections: 5
- Scan duration: 10 seconds

### 2. BLE Protocol (`src/services/ble/bleProtocol.ts`)

Message encoding/decoding for BLE transmission:
- `encodeMessageForBLE()` - Base64 encoding with size validation (<512 bytes)
- `decodeMessageFromBLE()` - Base64 decoding and JSON parsing
- `createBLEPacket()` - Creates packet with metadata and checksum
- `extractMessageFromPacket()` - Verifies checksum and extracts message
- Checksum generation for data integrity

**Features:**
- Size constraint checking (BLE 512-byte limit)
- Simple hash-based checksums
- Support for message chunking (future use)

### 3. BLE Manager (`src/services/ble/bleManager.ts`)

Main BLE service coordinating all BLE operations:
- Android permission handling (API level 31+ support)
- Device scanning with auto-stop
- Device discovery and connection
- Message reception and forwarding
- Flood control with seen message tracking
- Statistics tracking

**Key Methods:**
- `initialize()` - Request permissions and check Bluetooth state
- `startScanning()` - Begin discovering nearby devices
- `broadcastMessage()` - Send message to network
- `connectAndReadMessages()` - Connect to device and read characteristic
- `handleReceivedData()` - Process incoming messages
- `markMessageAsSeen()` - Prevent duplicate forwarding

**Flood Control:**
- Tracks seen messages for 1 hour
- Prevents re-broadcasting duplicates
- Respects hop count limits (max 10)
- Auto-increments hop count on forward

### 4. BLE Store (`src/stores/bleStore.ts`)

Zustand state management for BLE:
- Central state tracking (stopped/scanning/etc)
- Discovered devices list
- Error management
- Statistics (devices discovered, messages seen/received/broadcast)
- Integration with message store

**Actions:**
- `initialize()` - Set up BLE manager and callbacks
- `startScanning()` - Start device discovery
- `stopScanning()` - Stop scanning
- `broadcastMessage()` - Broadcast message via BLE
- `handleMessageReceived()` - Process received messages
- `handleError()` - Log and track errors

### 5. BLE Test Screen (`src/screens/BLETestScreen.tsx`)

Interactive UI for testing BLE functionality:
- Real-time status display (initialized, scanning, device count)
- Statistics dashboard (devices, messages seen/received/broadcast)
- Control buttons (start/stop scanning, broadcast test message)
- Discovered devices list with RSSI
- Error display

**Features:**
- Auto-initializes BLE on mount
- Creates test NEED messages with adaptive location precision
- Shows device details (name, ID, signal strength)
- Real-time updates while scanning

## Android Permissions

Already configured in `app.json`:
```json
"permissions": [
  "BLUETOOTH",
  "BLUETOOTH_ADMIN",
  "BLUETOOTH_SCAN",         // API 31+
  "BLUETOOTH_CONNECT",      // API 31+
  "BLUETOOTH_ADVERTISE",    // API 31+
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "FOREGROUND_SERVICE"
]
```

## How It Works

### Message Flow

1. **User creates message** → Message stored locally
2. **Broadcast triggered** → Message encoded to BLE packet
3. **BLE advertises** → Other devices discover via scan
4. **Device connects** → Reads characteristic data
5. **Message decoded** → Verified via checksum
6. **Flood control** → Check if already seen
7. **Store message** → Add to local message store
8. **Re-broadcast** → Forward if under hop limit

### Flood Protocol

- Each message has a hop count starting at 0
- Each device forwards message once with hop_count++
- Messages with hop_count >= 10 are not forwarded
- Seen messages tracked for 1 hour to prevent loops
- Device tracks which other devices sent each message

## Testing Instructions

### On Physical Android Devices

**Prerequisites:**
- 2+ Android devices with BLE support
- Bluetooth enabled on all devices
- Location services enabled (required for BLE on Android)

**Steps:**

1. **Build APK:**
   ```bash
   npm run build:android
   # or
   eas build --platform android --profile preview
   ```

2. **Install on devices:**
   - Install APK on all test devices
   - Grant all permissions when prompted

3. **Test Device Discovery:**
   - Open app on Device A
   - Tap "Start Scanning"
   - Open app on Device B
   - Tap "Start Scanning"
   - Both should discover each other in ~10 seconds

4. **Test Message Broadcast:**
   - On Device A, tap "Broadcast Test Message"
   - Check "Messages Broadcast" counter increases
   - On Device B, check "Messages Received" counter
   - Message should appear in both devices' message stores

5. **Test Hop Counting:**
   - Use 3+ devices in chain: A ↔ B ↔ C
   - Broadcast from Device A
   - Verify Device C receives via Device B
   - Check hop count increments correctly

6. **Test Flood Control:**
   - Broadcast same message twice
   - Verify it's only processed once
   - Check "Messages Seen" vs "Messages Received"

### Expected Behavior

- ✅ Devices discover each other within scan duration
- ✅ RSSI values show signal strength
- ✅ Messages transmitted successfully
- ✅ No duplicate processing
- ✅ Messages forward up to 10 hops
- ✅ Statistics update in real-time

## Known Limitations (POC)

1. **No actual advertising** - Current implementation connects to discovered devices rather than using BLE advertising. Production would use advertising with manufacturer data.

2. **No background scanning** - Scanning stops after configured duration. Production would use foreground service for continuous operation.

3. **Simple checksum** - Using basic hash instead of CRC32. Production should use proper CRC.

4. **No chunking** - Messages >512 bytes rejected. Production should implement chunking for large messages.

5. **No encryption** - Messages transmitted in plaintext. Phase 3 will add libsodium encryption.

6. **No persistence** - Seen messages only tracked in memory. Restart clears flood control state.

## Files Created

```
src/
├── types/
│   └── ble.ts                           # BLE type definitions
├── services/
│   └── ble/
│       ├── bleProtocol.ts               # Message encoding/decoding
│       └── bleManager.ts                # BLE manager service
├── stores/
│   └── bleStore.ts                      # BLE Zustand store
└── screens/
    └── BLETestScreen.tsx                # Test UI
```

## Next Steps (Phase 3: Cryptography)

1. Implement X25519 key generation with libsodium
2. Add XSalsa20-Poly1305 encryption to BLE packets
3. Implement coordination key exchange
4. Add encrypted payload support
5. Test encrypted message transmission

## GO/NO-GO Decision Point

✅ **GO** - BLE implementation compiles and is ready for device testing

**Criteria Met:**
- [x] TypeScript compiles without errors
- [x] BLE permissions configured
- [x] Device discovery implemented
- [x] Message transmission protocol defined
- [x] Flood control with hop limits
- [x] Test UI created
- [x] Integration with message store

**Awaiting:**
- [ ] Physical device testing (requires 2+ Android devices)
- [ ] Range testing (how far do messages propagate?)
- [ ] Performance testing (messages/second, battery impact)

**Recommendation:** Proceed with device testing. If BLE proves viable, continue to Phase 3 (Cryptography). If BLE has critical issues, may need to explore alternative networking solutions.
