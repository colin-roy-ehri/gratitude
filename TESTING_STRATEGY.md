# Testing Strategy

## Overview

This document outlines the testing approach for the mutual aid app, covering unit tests, integration tests, BLE-specific tests, and manual testing scenarios. The goal is to ensure reliability, privacy, and correct behavior across all features.

## Testing Pyramid

```
        ┌─────────────┐
        │   Manual    │  (5% - Critical flows on real devices)
        ├─────────────┤
        │ Integration │  (15% - Cross-service interactions)
        ├─────────────┤
        │    Unit     │  (80% - Individual functions/services)
        └─────────────┘
```

**Philosophy**: Heavy unit testing, moderate integration testing, targeted manual testing.

---

## Unit Testing

### Tools

- **Jest**: Test runner and assertion library
- **@testing-library/react-native**: Component testing
- **jest-mock**: Mocking dependencies

### What to Unit Test

1. **Services** (business logic)
2. **Utilities** (pure functions)
3. **Validators** (message validation)
4. **State management** (Zustand stores)
5. **Components** (presentational logic)

### Testing Services

#### Example: Message Validator

```typescript
// src/services/validation/__tests__/messageValidator.test.ts

import { messageValidator } from '../messageValidator';
import { mockNeedMessage, mockOfferMessage } from '../../__mocks__/messages';

describe('messageValidator', () => {
  describe('validate', () => {
    it('should validate a correct NEED message', () => {
      const result = messageValidator.validate(mockNeedMessage);
      expect(result.valid).toBe(true);
    });

    it('should reject message with missing required fields', () => {
      const invalid = { ...mockNeedMessage };
      delete invalid.message_id;

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('message_id');
    });

    it('should reject message with invalid type', () => {
      const invalid = { ...mockNeedMessage, type: 'INVALID' };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('type');
    });

    it('should reject payload not padded to 256 bytes', () => {
      const invalid = {
        ...mockNeedMessage,
        encrypted_payloads: [{
          recipient_key: 'key',
          nonce: 'nonce',
          payload: 'data',
          payload_size: 123, // Not multiple of 256
        }]
      };

      const result = messageValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('256');
    });

    it('should validate location precision based on density', () => {
      // Mock density score
      jest.spyOn(require('../densityCalculator'), 'getDensityScore')
        .mockReturnValue(5); // Low density

      const message = {
        ...mockNeedMessage,
        public: {
          ...mockNeedMessage.public,
          location: {
            coords: '37.423±0.0001,-122.084±0.0001', // High precision
            precision_level: 'high'
          }
        }
      };

      const result = messageValidator.validate(message);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('density');
    });
  });
});
```

#### Example: Encryption Service

```typescript
// src/services/crypto/__tests__/encryption.test.ts

import { encryption } from '../encryption';
import { keyManager } from '../keyManager';

describe('encryption', () => {
  let keypair: { publicKey: string; privateKey: string };

  beforeAll(async () => {
    keypair = await keyManager.generateKeypair();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt successfully', async () => {
      const plaintext = 'Hello, world!';
      const nonce = encryption.generateNonce();

      const ciphertext = await encryption.encrypt(
        plaintext,
        keypair.publicKey,
        nonce
      );

      const decrypted = await encryption.decrypt(
        ciphertext,
        keypair.privateKey,
        nonce
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = 'Secret message';
      const nonce = encryption.generateNonce();

      const ciphertext = await encryption.encrypt(
        plaintext,
        keypair.publicKey,
        nonce
      );

      // Generate different keypair
      const wrongKeypair = await keyManager.generateKeypair();

      await expect(
        encryption.decrypt(ciphertext, wrongKeypair.privateKey, nonce)
      ).rejects.toThrow();
    });

    it('should generate unique nonces', () => {
      const nonce1 = encryption.generateNonce();
      const nonce2 = encryption.generateNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toHaveLength(32); // 24 bytes base64-encoded
    });
  });

  describe('padPayload', () => {
    it('should pad to 256 bytes for small payloads', () => {
      const payload = 'Short message';
      const padded = encryption.padPayload(payload);

      expect(Buffer.from(padded, 'base64').length).toBe(256);
    });

    it('should pad to 512 bytes for medium payloads', () => {
      const payload = 'A'.repeat(300); // 300 bytes
      const padded = encryption.padPayload(payload);

      expect(Buffer.from(padded, 'base64').length).toBe(512);
    });

    it('should pad to next 256-byte increment', () => {
      const testCases = [
        { size: 100, expected: 256 },
        { size: 256, expected: 256 },
        { size: 257, expected: 512 },
        { size: 500, expected: 512 },
        { size: 513, expected: 768 },
        { size: 1000, expected: 1024 },
      ];

      testCases.forEach(({ size, expected }) => {
        const payload = 'A'.repeat(size);
        const padded = encryption.padPayload(payload);

        expect(Buffer.from(padded, 'base64').length).toBe(expected);
      });
    });
  });

  describe('multi-recipient encryption', () => {
    it('should encrypt for multiple recipients', async () => {
      const content = { location: 'Building 12', time: '6pm' };
      const recipients = [
        (await keyManager.generateKeypair()).publicKey,
        (await keyManager.generateKeypair()).publicKey,
        (await keyManager.generateKeypair()).publicKey,
      ];

      const payloads = await encryption.encryptForMultipleRecipients(
        content,
        recipients
      );

      expect(payloads).toHaveLength(3);
      payloads.forEach(payload => {
        expect(payload.recipient_key).toBeDefined();
        expect(payload.nonce).toBeDefined();
        expect(payload.payload).toBeDefined();
        expect(payload.payload_size % 256).toBe(0);
      });
    });
  });
});
```

### Testing Zustand Stores

```typescript
// src/stores/__tests__/messageStore.test.ts

import { renderHook, act } from '@testing-library/react-hooks';
import { useMessageStore } from '../messageStore';
import { messageManager } from '../../services/messageManager';
import { mockNeedMessage } from '../../__mocks__/messages';

// Mock dependencies
jest.mock('../../services/messageManager');
jest.mock('../../services/storage/messageStore');

describe('messageStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useMessageStore.setState({
      messages: [],
      myMessages: [],
      loading: false,
      error: null,
    });
  });

  describe('addMessage', () => {
    it('should add message to messages array', () => {
      const { result } = renderHook(() => useMessageStore());

      act(() => {
        result.current.addMessage(mockNeedMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(mockNeedMessage);
    });

    it('should add to myMessages if created locally', () => {
      const { result } = renderHook(() => useMessageStore());
      const localMessage = {
        ...mockNeedMessage,
        metadata: { ...mockNeedMessage.metadata, createdLocally: true }
      };

      act(() => {
        result.current.addMessage(localMessage);
      });

      expect(result.current.myMessages).toHaveLength(1);
    });
  });

  describe('createNeed', () => {
    it('should create need and add to store', async () => {
      const { result } = renderHook(() => useMessageStore());
      const params = {
        category: 'FOOD',
        location: { lat: 37.423, lon: -122.084 },
        time: 'Today',
      };

      (messageManager.createNeed as jest.Mock).mockResolvedValue({
        success: true,
        data: mockNeedMessage,
      });

      await act(async () => {
        await result.current.createNeed(params);
      });

      expect(result.current.messages).toContainEqual(mockNeedMessage);
      expect(messageManager.createNeed).toHaveBeenCalledWith(params);
    });

    it('should set error state on failure', async () => {
      const { result } = renderHook(() => useMessageStore());

      (messageManager.createNeed as jest.Mock).mockRejectedValue(
        new Error('Failed to create')
      );

      await act(async () => {
        await result.current.createNeed({});
      });

      expect(result.current.error).toBe('Failed to create');
      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('selectors', () => {
    it('should filter messages by type', () => {
      const { result } = renderHook(() => useMessageStore());

      act(() => {
        result.current.addMessage({ ...mockNeedMessage, type: 'NEED' });
        result.current.addMessage({ ...mockNeedMessage, type: 'OFFER' });
        result.current.setFilters({ type: ['NEED'] });
      });

      const filtered = result.current.getFilteredMessages();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('NEED');
    });

    it('should get messages by ID', () => {
      const { result } = renderHook(() => useMessageStore());

      act(() => {
        result.current.addMessage(mockNeedMessage);
      });

      const message = result.current.getMessageById(mockNeedMessage.message_id);
      expect(message).toEqual(mockNeedMessage);
    });
  });
});
```

### Testing React Native Components

```typescript
// src/components/__tests__/MessageCard.test.tsx

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageCard } from '../MessageCard';
import { mockNeedMessage } from '../../__mocks__/messages';

describe('MessageCard', () => {
  it('should render message details', () => {
    const { getByText } = render(
      <MessageCard message={mockNeedMessage} onPress={jest.fn()} />
    );

    expect(getByText(/Food/)).toBeTruthy();
    expect(getByText(/~0.5 km/)).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <MessageCard message={mockNeedMessage} onPress={onPress} />
    );

    fireEvent.press(getByTestId('message-card'));
    expect(onPress).toHaveBeenCalledWith(mockNeedMessage);
  });

  it('should show correct icon for category', () => {
    const { getByText } = render(
      <MessageCard message={mockNeedMessage} onPress={jest.fn()} />
    );

    expect(getByText('🍽️')).toBeTruthy(); // Food emoji
  });
});
```

---

## Integration Testing

### What to Integration Test

1. **Service interactions** (e.g., messageManager → storage → validation)
2. **Store + service** (e.g., messageStore calling messageManager)
3. **Message flows** (e.g., create → validate → store → broadcast)
4. **Coordination flows** (e.g., offer → accept → encrypt → coordinate)

### Example: Message Creation Flow

```typescript
// src/__tests__/integration/messageCreation.test.ts

import { useMessageStore } from '../../stores/messageStore';
import { useBleStore } from '../../stores/bleStore';
import { messageStoreService } from '../../services/storage/messageStore';
import { bleManager } from '../../services/ble/bleManager';

describe('Message Creation Flow', () => {
  beforeEach(async () => {
    // Clear all stores
    useMessageStore.getState().clearMessages();
    useBleStore.getState().clearQueue();

    // Mock BLE
    jest.spyOn(bleManager, 'sendMessage').mockResolvedValue();
  });

  it('should create, validate, store, and broadcast message', async () => {
    const params = {
      category: 'FOOD',
      secondary: ['Groceries'],
      attributes: { dietary: ['Vegetarian'], portion: 'Family_small_2-4' },
      location: { lat: 37.423, lon: -122.084 },
      time: { pattern: 'This_week', windows: [] },
      quantity: 'Medium_amount',
    };

    // Create message
    const result = await useMessageStore.getState().createNeed(params);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Check stored in messageStore
    const messages = useMessageStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('NEED');

    // Check persisted to storage
    const stored = await messageStoreService.getMessage(result.data.message_id);
    expect(stored).toEqual(result.data);

    // Check broadcast via BLE
    expect(bleManager.sendMessage).toHaveBeenCalled();
  });

  it('should handle validation failure gracefully', async () => {
    const invalidParams = {
      category: 'INVALID_CATEGORY',
    };

    const result = await useMessageStore.getState().createNeed(invalidParams);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // Should not be stored
    const messages = useMessageStore.getState().messages;
    expect(messages).toHaveLength(0);

    // Should not be broadcast
    expect(bleManager.sendMessage).not.toHaveBeenCalled();
  });
});
```

### Example: Coordination Flow

```typescript
// src/__tests__/integration/coordinationFlow.test.ts

import { useMessageStore } from '../../stores/messageStore';
import { useCoordinationStore } from '../../stores/coordinationStore';
import { encryption } from '../../services/crypto/encryption';
import { keyManager } from '../../services/crypto/keyManager';

describe('Coordination Flow', () => {
  let requesterKeypair: any;
  let offererKeypair: any;

  beforeEach(async () => {
    requesterKeypair = await keyManager.generateKeypair();
    offererKeypair = await keyManager.generateKeypair();
  });

  it('should complete full coordination flow', async () => {
    // 1. Requester creates NEED
    const needResult = await useMessageStore.getState().createNeed({
      category: 'FOOD',
      location: { lat: 37.423, lon: -122.084 },
    });
    const needMessage = needResult.data;

    // 2. Offerer creates OFFER in response
    const offerResult = await useMessageStore.getState().createOffer({
      category: 'FOOD',
      inResponseTo: needMessage.message_id,
    });
    const offerMessage = offerResult.data;

    // 3. Requester accepts offer and creates coordination
    const coordinationParams = {
      offerMessageId: offerMessage.message_id,
      myPublicKey: requesterKeypair.publicKey,
      time: { date: '2025-10-27', windows: ['18:00-20:00'] },
      location: {
        type: 'address',
        address: { building: '12', floor: '3', unit: '5A' }
      },
      contactName: 'Maria',
      identification: ['Blue jacket'],
    };

    const coordResult = await useCoordinationStore.getState()
      .createCoordination(coordinationParams);

    expect(coordResult.success).toBe(true);

    // 4. Verify coordination created
    const coordinations = useCoordinationStore.getState().coordinations;
    expect(coordinations).toHaveLength(1);

    const coordination = coordinations[0];
    expect(coordination.status).toBe('pending');
    expect(coordination.details.location.address.building).toBe('12');

    // 5. Offerer receives coordination message
    const coordMessage = useMessageStore.getState()
      .getMessageById(coordination.id);

    expect(coordMessage.type).toBe('COORDINATION');
    expect(coordMessage.encrypted_payloads).toHaveLength(1);

    // 6. Offerer decrypts payload
    const decrypted = await encryption.decrypt(
      coordMessage.encrypted_payloads[0].payload,
      offererKeypair.privateKey,
      coordMessage.encrypted_payloads[0].nonce
    );

    expect(decrypted.location.address.building).toBe('12');
    expect(decrypted.contactName).toBe('Maria');
  });
});
```

---

## BLE Testing (Real Devices Required)

### BLE testing CANNOT be done in simulators. Real Android devices are required.

### Test Setup

**Devices Needed**:
- Minimum: 2 Android devices
- Recommended: 3 devices (for relay testing)

**Test Environment**:
- Devices within 10m range
- Bluetooth enabled on all devices
- Permissions granted on all devices

### BLE Test Scenarios

#### Test 1: Device Discovery

```
Goal: Verify devices can discover each other

Setup:
- Device A: Start scanning
- Device B: Start advertising

Expected:
- Device A discovers Device B within 5 seconds
- Device A shows Device B in nearby devices list
- RSSI value is reasonable (-50 to -90 dBm)

Pass Criteria:
✅ Device discovered
✅ RSSI displayed
✅ Discovery repeatable
```

#### Test 2: Message Send/Receive

```
Goal: Verify message transmission

Setup:
- Device A: Create NEED message
- Device B: Start scanning

Steps:
1. Device A creates message
2. Device A broadcasts via BLE
3. Device B receives message

Expected:
- Device B receives message within 10 seconds
- Message deserializes correctly
- Message validates successfully
- Message appears in Device B's message list

Pass Criteria:
✅ Message received
✅ Message content correct
✅ No corruption
✅ Timing acceptable (<10s)
```

#### Test 3: Message Relay

```
Goal: Verify relay/flooding works

Setup:
- Device A, B, C in a line (A--B--C)
- Device A and C out of direct range
- Device B in range of both

Steps:
1. Device A creates message
2. Device A broadcasts
3. Device B receives and relays
4. Device C receives relayed message

Expected:
- Device C receives message originated from Device A
- hop_count incremented
- Relay happens within 30 seconds

Pass Criteria:
✅ Message reaches Device C
✅ hop_count = 1 (or higher)
✅ No duplicate messages
✅ Timing acceptable
```

#### Test 4: Large Message Chunking

```
Goal: Verify messages > MTU are chunked and reassembled

Setup:
- Device A and B in range
- Create message > 512 bytes (include multiple encrypted payloads)

Steps:
1. Device A creates large message
2. Serialize and chunk
3. Broadcast chunks
4. Device B reassembles

Expected:
- Message chunks sent sequentially
- Device B reassembles correctly
- Reassembled message validates
- No data loss

Pass Criteria:
✅ Chunking works
✅ Reassembly works
✅ Message integrity maintained
```

#### Test 5: Background/Foreground Transitions

```
Goal: Verify BLE survives app state changes

Setup:
- Device A actively broadcasting
- Device B actively receiving

Steps:
1. Background Device A (home button)
2. Wait 30 seconds
3. Foreground Device A
4. Device B should still receive messages

Expected:
- BLE continues in background (foreground service)
- No messages lost
- Scanning/advertising resume on foreground

Pass Criteria:
✅ Background BLE works
✅ Foreground resume works
✅ No message loss
```

#### Test 6: Battery Usage

```
Goal: Ensure acceptable battery drain

Setup:
- Device A fully charged
- App running in background
- BLE scanning/advertising active

Steps:
1. Run for 1 hour
2. Check battery usage in Android settings

Expected:
- Battery drain < 5% per hour
- App not listed as "high battery usage"

Pass Criteria:
✅ Battery usage acceptable
✅ Device doesn't overheat
✅ Background service stable
```

### BLE Test Harness

Create a debug screen for BLE testing:

```typescript
// src/screens/BleDebugScreen.tsx

function BleDebugScreen() {
  const { nearbyDevices, stats, isScanning } = useBleStore();

  return (
    <ScrollView>
      <Text>BLE Status: {isScanning ? 'Scanning' : 'Not Scanning'}</Text>
      <Text>Nearby Devices: {nearbyDevices.length}</Text>

      <Button title="Send Test Message" onPress={sendTestMessage} />
      <Button title="Clear Stats" onPress={clearStats} />

      <Text>Stats:</Text>
      <Text>  Sent: {stats.messagesSent}</Text>
      <Text>  Received: {stats.messagesReceived}</Text>
      <Text>  Relayed: {stats.messagesRelayed}</Text>
      <Text>  Bytes: {stats.bytesTransferred}</Text>

      <Text>Nearby Devices:</Text>
      {nearbyDevices.map(device => (
        <View key={device.id}>
          <Text>  {device.name || 'Unknown'} (RSSI: {device.rssi})</Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

---

## Manual Testing

### Manual Test Checklist

#### Message Creation

- [ ] Create NEED (food category)
- [ ] Create NEED (all categories)
- [ ] Create OFFER (food category)
- [ ] Create OFFER (all categories)
- [ ] Category-specific attributes work
- [ ] Time selection works
- [ ] Location detection works
- [ ] Manual location entry works
- [ ] Review screen shows correct info
- [ ] Message appears in "My Requests/Offers"

#### Message Discovery

- [ ] See messages from other devices
- [ ] Filter by type (Need/Offer)
- [ ] Filter by category
- [ ] Distance calculation correct
- [ ] Time display formatted correctly
- [ ] Pull to refresh works
- [ ] Tap message shows detail view

#### Coordination

- [ ] Accept offer button works
- [ ] Coordination form pre-fills correctly
- [ ] Location input (address) works
- [ ] Location input (map pin) works
- [ ] Time selection from offer windows
- [ ] Identification checkboxes work
- [ ] Optional name input works
- [ ] Send creates coordination message
- [ ] Coordination appears in "My Activity"
- [ ] Other party receives coordination
- [ ] Encrypted details decrypt correctly
- [ ] Mini-chat works
- [ ] Mark as complete works

#### Permissions

- [ ] Bluetooth permission requested
- [ ] Location permission requested
- [ ] Notification permission requested
- [ ] Permission denial handled gracefully
- [ ] "Open Settings" link works
- [ ] App works in local-only mode (no BLE)

#### Error Scenarios

- [ ] Airplane mode (offline)
- [ ] Bluetooth off
- [ ] Storage full (artificial test)
- [ ] Invalid input in forms
- [ ] Corrupt message from test device
- [ ] Battery saver mode active

#### Performance

- [ ] App launches in < 3 seconds
- [ ] Message list scrolls smoothly (100+ messages)
- [ ] No jank during BLE operations
- [ ] Background service doesn't drain battery
- [ ] Memory usage reasonable (< 200MB)

---

## Test Data and Mocks

### Mock Messages

```typescript
// src/__mocks__/messages.ts

export const mockNeedMessage: MutualAidMessage = {
  message_id: '550e8400-e29b-41d4-a716-446655440000',
  version: 1,
  type: 'NEED',
  timestamp: '2025-10-26T14:30:00Z',
  in_response_to: null,
  hop_count: 0,
  public: {
    category: {
      primary: 'FOOD',
      secondary: ['Groceries'],
      attributes: {
        dietary: ['Vegetarian'],
        preparation: ['Raw_ingredients'],
        portion: 'Family_small_2-4',
      },
    },
    location: {
      coords: '37.423±0.001,-122.084±0.001',
      precision_level: 'low',
    },
    time: {
      pattern: 'This_week',
      windows: [
        {
          days: ['Mon', 'Tue', 'Wed'],
          time_blocks: ['Afternoon_15-18', 'Evening_18-21'],
        },
      ],
    },
    quantity: 'Medium_amount',
    recurrence_pattern: 'One_time',
  },
  coordination_key: 'MCowBQYDK2VuAyEA...',
  encrypted_payloads: [],
  metadata: {
    relay_eligible: true,
    expires_at: '2025-11-02T14:30:00Z',
    priority: 'normal',
  },
};

export const mockOfferMessage: MutualAidMessage = {
  ...mockNeedMessage,
  type: 'OFFER',
  in_response_to: mockNeedMessage.message_id,
};
```

### Mock Services

```typescript
// src/services/__mocks__/bleManager.ts

export const bleManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  startScanning: jest.fn().mockResolvedValue(undefined),
  stopScanning: jest.fn().mockResolvedValue(undefined),
  startAdvertising: jest.fn().mockResolvedValue(undefined),
  stopAdvertising: jest.fn().mockResolvedValue(undefined),
  sendMessage: jest.fn().mockResolvedValue(undefined),
  onMessageReceived: jest.fn(),
  onDeviceDiscovered: jest.fn(),
};
```

---

## Continuous Integration

### CI Pipeline (Future)

When setting up CI/CD:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v2

      - name: Build Android APK
        run: npm run build:android
```

---

## Test Coverage Goals

| Layer | Target Coverage |
|-------|----------------|
| Services | 90%+ |
| Utilities | 95%+ |
| Stores | 85%+ |
| Components | 70%+ |
| Overall | 80%+ |

**Focus on critical paths**:
- Message creation/validation: 100%
- Encryption/decryption: 100%
- Storage operations: 90%+
- BLE operations: Integration tests only (mocked in unit tests)

---

## Testing Best Practices

1. **Test behavior, not implementation**
   - ✅ Test that message appears in list after creation
   - ❌ Test that `addMessage` function was called

2. **Keep tests isolated**
   - Reset state before each test
   - Don't rely on test execution order
   - Mock external dependencies

3. **Use descriptive test names**
   - ✅ `should retry network errors with exponential backoff`
   - ❌ `test retry`

4. **Test edge cases**
   - Empty arrays, null values, boundary conditions
   - Invalid input, malformed data
   - Concurrent operations

5. **Don't test implementation details**
   - Test public APIs only
   - Refactors shouldn't break tests

6. **Keep tests fast**
   - Unit tests < 100ms each
   - Mock slow operations (network, storage)
   - Use test-specific data, not production data

---

## Summary

This testing strategy ensures:
- **Correctness**: Services work as designed
- **Reliability**: Error handling works
- **Privacy**: Encryption works correctly
- **Performance**: App is responsive
- **Real-world validation**: BLE works on actual devices

Tests should be run:
- **On every commit**: Unit tests (automated)
- **Before PRs**: Integration tests (automated)
- **Before releases**: BLE tests (manual, real devices)
- **Weekly**: Battery/performance tests
