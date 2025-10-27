# Mutual Aid App - System Architecture

## Overview

This is a privacy-focused, offline-first mutual aid coordination app using BLE mesh networking. Users can broadcast needs/offers and coordinate exchanges with end-to-end encryption, all without requiring internet connectivity or centralized servers.

## Design Principles

1. **Privacy by Design**: Gradual disclosure, adaptive location precision, encrypted coordination
2. **Offline First**: BLE mesh network, no internet required
3. **Dignity Focused**: No charity mechanics, equal visual treatment of needs/offers
4. **Accessible**: Works for users with limited literacy, tech experience, or disabilities
5. **Resilient**: Graceful degradation, queue-and-retry, clear error states

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  (React Native Components + Screens)                         │
├─────────────────────────────────────────────────────────────┤
│                    State Management                          │
│  (Zustand Stores: messages, coordination, ble, ui)          │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │  Message     │  BLE         │  Crypto              │    │
│  │  Manager     │  Manager     │  Services            │    │
│  ├──────────────┼──────────────┼──────────────────────┤    │
│  │  Validation  │  Relay       │  Key Management      │    │
│  │  Service     │  Service     │  Encryption          │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                                │
│  ┌──────────────────────┬────────────────────────────┐     │
│  │  AsyncStorage        │  Secure Storage            │     │
│  │  (Messages)          │  (Cryptographic Keys)      │     │
│  └──────────────────────┴────────────────────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                  Platform Layer                              │
│  (BLE, Secure Storage, Permissions, Background Tasks)       │
└─────────────────────────────────────────────────────────────┘
```

## Module Boundaries

### 1. UI Layer (`src/screens/`, `src/components/`)

**Responsibilities:**
- Render user interface
- Handle user input
- Display data from stores
- Trigger actions on stores

**Dependencies:**
- Zustand stores (read state, dispatch actions)
- Navigation library
- React Native components

**Key Principles:**
- Components should be presentational where possible
- Business logic belongs in services, not components
- Use custom hooks to connect components to stores

### 2. State Management (`src/stores/`)

**Responsibilities:**
- Hold application state
- Provide selectors for derived state
- Expose actions to modify state
- Persist state when needed

**Store Structure:**
```typescript
messageStore     // All messages, filters, loading states
coordinationStore // Active coordinations, conversation threads
bleStore         // BLE status, nearby devices, relay queue
uiStore          // UI state (modals, navigation, notifications)
```

**Key Principles:**
- Stores are the single source of truth
- Actions are the only way to modify state
- Stores call services, services don't call stores
- Keep stores flat (avoid deep nesting)

### 3. Service Layer (`src/services/`)

**Message Services:**
- `messageManager.ts`: High-level message CRUD operations
- `validation/messageValidator.ts`: Schema validation, custom rules
- `coordinationHandler.ts`: Handle incoming coordination messages

**BLE Services:**
- `ble/bleManager.ts`: BLE initialization, scanning, advertising
- `ble/serialization.ts`: Message ↔ Buffer conversion
- `ble/messageRelay.ts`: Relay logic, deduplication, scheduling
- `ble/deviceManager.ts`: Track nearby devices

**Crypto Services:**
- `crypto/keyManager.ts`: Key generation, storage, retrieval
- `crypto/encryption.ts`: Encrypt/decrypt operations
- `crypto/multiPayload.ts`: Multi-recipient encryption

**Storage Services:**
- `storage/messageStore.ts`: AsyncStorage wrapper for messages
- `storage/keyStore.ts`: Secure storage for cryptographic keys

**Key Principles:**
- Services are stateless (state lives in Zustand stores)
- Services expose pure functions or classes with clear interfaces
- Services handle errors and return Result types (success/failure)
- Services log operations for debugging

### 4. Data Layer (`src/types/`)

**Responsibilities:**
- Define TypeScript types matching JSON schema
- Provide type guards for runtime validation
- Export constants (categories, enums, time patterns)

**Key Files:**
- `message.ts`: All message types from schema
- `storage.ts`: Storage-specific types
- `coordination.ts`: Coordination-specific types
- `ble.ts`: BLE-specific types

## Data Flow

### Creating a Need Message

```
User fills form (UI)
  ↓
RequestWizard dispatches action
  ↓
messageStore.createNeed()
  ↓
calls messageManager.createNeed()
  ↓
1. Validate with messageValidator
2. Generate message_id and coordination_key
3. Store message via messageStore.saveMessage()
4. Store keys via keyStore.saveKeypair()
  ↓
messageStore updates state
  ↓
bleStore.broadcastMessage() triggers
  ↓
bleManager.sendMessage()
  ↓
Message serialized and sent via BLE
```

### Receiving an Offer Message

```
BLE receives data
  ↓
bleManager.onMessageReceived()
  ↓
serialization.deserializeMessage()
  ↓
messageValidator.validate()
  ↓
messageRelay.shouldRelay() checks
  ↓
If new and valid:
  - messageStore.addMessage() (updates state)
  - messageStore.saveMessage() (persists)
  - messageRelay.scheduleRebroadcast() (relay to others)
  ↓
UI updates automatically (Zustand reactivity)
```

### Accepting an Offer and Coordinating

```
User taps "Accept & Coordinate" (UI)
  ↓
CoordinationFormScreen collects details
  ↓
coordinationStore.createCoordination()
  ↓
1. Decrypt offer's payloads to get offerer's key
2. Generate coordination message with encrypted payload
   - Include: location, time, name, identification
   - Encrypt with offerer's public key
3. Sign coordination with my private key
4. Store coordination locally
  ↓
bleStore.broadcastMessage()
  ↓
Coordination sent via BLE
  ↓
Both parties can now exchange encrypted messages
```

## Message Types and Flow

### Message Type Hierarchy

```
MutualAidMessage (base)
├── NEED (broadcast request for help)
├── OFFER (broadcast offer to help OR response to NEED)
├── COORDINATION (encrypted details for meeting)
├── BROKER_ACCESS (grant broker visibility - DEFERRED)
├── COMPLETION (anonymous "good news" broadcast - DEFERRED)
└── REVOCATION (revoke broker access - DEFERRED)
```

### Public vs Encrypted Information

**Public (visible to all):**
- Message type, category, location (approximate), time (general)
- Used for: Discovery, matching, relay decisions

**Encrypted (only for intended recipient):**
- Exact location (building/floor/unit or precise coords)
- Specific time windows, contact name
- Identification details, access notes
- Used for: Actual coordination

## Privacy Architecture

### Location Precision

The app uses **adaptive location precision** based on network density:

```
High density (30+ nearby devices):
  → "high" precision (±0.001° ≈ 100m)

Medium density (10-30 devices):
  → "medium" precision (±0.01° ≈ 1km)

Low density (<10 devices):
  → "low" precision (±0.05° ≈ 5km)

Very low density (<3 devices):
  → "very_low" precision (±0.1° ≈ 10km)
```

**Implementation:**
- `densityCalculator.ts` monitors nearby device count
- Location rounded before including in public message
- Exact location only shared in encrypted coordination payload

### Encrypted Payload Padding

All encrypted payloads are padded to 256-byte increments to prevent traffic analysis while minimizing overhead:

```
Content size → Padded size
0-256 bytes → 256 bytes
257-512 bytes → 512 bytes
513-768 bytes → 768 bytes
769-1024 bytes → 1024 bytes
1025-1280 bytes → 1280 bytes
... and so on in 256-byte increments
```

This prevents observers from distinguishing a short message ("Yes") from a longer one ("Yes, I can meet you at Building 12, Floor 3...") while using less bandwidth than larger padding increments.

### Key Management

**Ephemeral Keys (Per-Message):**
- Each NEED/OFFER generates a new X25519 keypair
- Public key included in message as `coordination_key`
- Private key stored securely, tied to message_id
- Allows responses without revealing identity

**Device Key (Long-term):**
- Used to encrypt private keys in local storage
- Derived from device ID + secure random seed
- Stored in Android Keystore (hardware-backed if available)

## BLE Networking Architecture

### Message Propagation Strategy

**Flooding with Limits:**
1. Device receives message via BLE
2. Checks if already seen (message_id in cache)
3. If new:
   - Validates message
   - Stores locally
   - Schedules rebroadcast with exponential backoff
   - Increments hop_count (max 10 hops)
4. Relay queue prioritizes:
   - High priority messages
   - Newer messages
   - Lower hop counts

**Deduplication:**
- In-memory Set of recently seen message_ids (max 1000)
- Bloom filter for long-term deduplication (optional optimization)

**Expiration:**
- Messages include `metadata.expires_at`
- Default: 7 days for NEED/OFFER, 2 days for COORDINATION
- Expired messages not relayed, eventually pruned from storage

### BLE Service UUID

```
Service UUID: 0000FE01-0000-1000-8000-00805F9B34FB
Characteristic UUID: 0000FE02-0000-1000-8000-00805F9B34FB
```

**Message Format over BLE:**
```
[4 bytes: message length] [N bytes: JSON message] [optional: continuation marker]
```

For messages > MTU (512 bytes), chunking is used with reassembly on receive.

### Android Foreground Service

To keep BLE active in background:
- Run foreground service with persistent notification
- User can pause/resume scanning (battery optimization)
- Auto-restart service on device reboot
- Request battery optimization exemption

## Error Handling Strategy

### Error Categories

1. **Validation Errors** (user-fixable)
   - Invalid input in forms
   - Message fails schema validation
   - Display specific field error

2. **Network Errors** (retry/queue)
   - BLE disconnection
   - Message send failure
   - Queue for retry with exponential backoff

3. **Crypto Errors** (critical, log and fail gracefully)
   - Decryption failure
   - Key generation failure
   - Display generic "Unable to decrypt" message

4. **Storage Errors** (retry, fallback to in-memory)
   - AsyncStorage failure
   - Secure storage unavailable
   - Log error, notify user, queue for retry

5. **Permission Errors** (prompt user)
   - BLE permission denied
   - Location permission denied
   - Show clear explanation and system settings link

### Error Recovery

**Graceful Degradation:**
- If BLE unavailable: Local-only mode (messages stored, not broadcast)
- If crypto unavailable: Disable encrypted features, only allow public messages
- If storage full: Prune old messages, notify user

**Retry Logic:**
```
Attempt 1: Immediate
Attempt 2: 1s delay
Attempt 3: 5s delay
Attempt 4: 30s delay
Attempt 5+: 5min delay, max 3 retries
```

**User Communication:**
- Errors shown as non-blocking notifications
- Critical errors shown as modals with action buttons
- Background errors logged, visible in debug screen

## Security Considerations

### Threat Model

**In Scope:**
- Passive eavesdropping on BLE traffic
- Traffic analysis (who is communicating)
- Malicious messages (spam, invalid data)
- Device impersonation

**Out of Scope (for POC):**
- Nation-state adversaries
- Device compromise (malware)
- Physical access to device
- Supply chain attacks

### Security Measures

1. **End-to-End Encryption**: All coordination details encrypted
2. **Message Validation**: Schema validation prevents malformed messages
3. **Key Isolation**: Private keys never transmitted, stored securely
4. **Payload Padding**: Prevents message size analysis
5. **Ephemeral Keys**: Per-message keys limit exposure
6. **No Authentication**: Intentional - anonymity is a feature

### Known Limitations (POC)

- No message signing (could be added for broker trust)
- No rate limiting (spam prevention needed for production)
- No bad actor detection (malicious devices can flood network)
- No key backup (lose device = lose active coordinations)

## Performance Considerations

### Storage Limits

- **Messages**: Keep last 1000 messages, prune older
- **Keys**: Prune keys for expired/completed coordinations
- **Relay cache**: Max 1000 message_ids in memory

### Battery Optimization

- **Adaptive scanning**: Reduce scan frequency when no activity
- **Batch broadcasts**: Queue messages, send in bursts
- **Background limits**: Reduce BLE operations when app backgrounded
- **User control**: Allow user to pause scanning

### Memory Management

- Lazy load message lists (virtualized FlatList)
- Limit in-memory message cache (use AsyncStorage as source of truth)

## Testing Strategy

### Unit Tests
- All services have Jest tests
- Mock BLE/storage/crypto dependencies
- Test error cases and edge conditions

### Integration Tests
- Test message flow end-to-end (create → validate → store → broadcast)
- Test coordination flow (offer → accept → encrypt → coordinate)

### BLE Tests (Real Devices Required)
- Two-device: Send/receive verification
- Three-device: Relay verification
- Stress test: 100 messages, verify no loss

### Manual Tests
- Full user flow on physical devices
- Battery usage over 24 hours
- Background/foreground transitions
- Permission denial scenarios

## Future Enhancements (Post-POC)

1. **Broker System**: Third-party coordination facilitators
2. **Good News Feed**: Anonymous completion broadcasts
3. **Maps Integration**: Visual location selection
4. **iOS Support**: Handle iOS background limitations
5. **Message Signing**: Verify broker identity
6. **Rate Limiting**: Prevent spam/abuse
7. **Mesh Optimization**: Smarter relay strategies (not pure flooding)
8. **Key Backup**: Encrypted cloud backup of coordination keys
9. **Multi-language**: i18n support
10. **Accessibility**: Screen reader optimization, voice input

## Development Workflow

### AI-Assisted Development Tips

1. **Start with contracts**: Define TypeScript interfaces before implementation
2. **Test-driven**: Write tests first for services (easier for AI to implement)
3. **Modular**: Each file should be independently implementable
4. **Documented**: JSDoc comments for complex functions
5. **Incremental**: Build and test each service before integration

### Code Organization

```
src/
├── types/           # TypeScript types, interfaces, enums
├── services/        # Business logic, stateless services
│   ├── ble/         # BLE-related services
│   ├── crypto/      # Cryptography services
│   ├── storage/     # Storage abstractions
│   └── validation/  # Message validation
├── stores/          # Zustand state management
├── screens/         # Top-level screen components
├── components/      # Reusable UI components
├── navigation/      # React Navigation configuration
├── utils/           # Utility functions (date formatting, etc.)
├── constants/       # App constants (categories, colors, etc.)
└── hooks/           # Custom React hooks
```

### Git Workflow

- Feature branches for each phase
- Commit after each service implementation
- Tag releases: `v0.1-poc`, `v0.2-beta`, etc.

## Appendix: Key Technologies

- **React Native**: Mobile framework (Expo bare workflow)
- **Expo**: Tooling and build pipeline
- **TypeScript**: Type safety
- **Zustand**: State management (simpler than Redux)
- **react-native-ble-manager**: BLE communication (Android)
- **react-native-sodium**: libsodium crypto (X25519, XSalsa20-Poly1305)
- **AsyncStorage**: Persistent storage
- **expo-secure-store**: Secure key storage (Android Keystore)
- **Ajv**: JSON schema validation
- **Jest**: Unit testing
- **React Native Testing Library**: Component testing

## Glossary

- **BLE**: Bluetooth Low Energy
- **MTU**: Maximum Transmission Unit (BLE packet size limit)
- **X25519**: Elliptic curve Diffie-Hellman key exchange
- **XSalsa20-Poly1305**: Authenticated encryption algorithm
- **Flooding**: Network strategy where all nodes rebroadcast messages
- **Hop count**: Number of relays a message has passed through
- **Ephemeral key**: Temporary cryptographic key (per-message)
- **Payload padding**: Adding random data to hide message size
- **Coordination**: The encrypted exchange where users share exact details
