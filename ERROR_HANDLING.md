# Error Handling Strategy

## Overview

This document defines how the mutual aid app handles errors across all layers. The goal is to provide a resilient user experience where errors are caught, logged, and communicated clearly, with automatic recovery where possible.

## Design Principles

1. **Fail Gracefully**: Never crash the app; degrade functionality instead
2. **Be Transparent**: Tell users what went wrong in plain language
3. **Recover Automatically**: Retry transient failures without user intervention
4. **Log Everything**: Capture errors for debugging, but respect privacy
5. **Progressive Enhancement**: Core features work even when advanced features fail

## Error Taxonomy

### 1. Validation Errors (User-Fixable)

**Cause**: User input doesn't meet requirements

**Examples**:
- Empty required field
- Invalid message format
- Location precision too high for network density
- Payload size not multiple of 256 bytes

**Handling**:
```typescript
{
  type: 'validation',
  severity: 'warning',
  userMessage: 'Building number must be 1-2 characters',
  field: 'location.building',
  fixable: true,
  recoveryAction: 'correct_input'
}
```

**User Experience**:
- Show inline error on the specific field
- Highlight field in red
- Disable submit button until fixed
- Never lose user's data

**Example UI**:
```
Building: [AB123]  ← Error: 1-2 characters only
```

---

### 2. Network Errors (Retry/Queue)

**Cause**: BLE communication failures

**Examples**:
- BLE disconnection during send
- Device out of range
- Message send timeout
- No nearby devices

**Handling**:
```typescript
{
  type: 'network',
  severity: 'info',
  userMessage: 'Message will be sent when devices are nearby',
  retryable: true,
  recoveryAction: 'queue_and_retry'
}
```

**Retry Strategy**:
```typescript
const RETRY_DELAYS = [0, 1000, 5000, 30000, 300000]; // 0s, 1s, 5s, 30s, 5min

async function sendWithRetry(message: MutualAidMessage, attempt = 0) {
  try {
    await bleManager.sendMessage(message);
    return { success: true };
  } catch (error) {
    if (attempt < RETRY_DELAYS.length - 1) {
      const delay = RETRY_DELAYS[attempt];
      await sleep(delay);
      return sendWithRetry(message, attempt + 1);
    } else {
      // Max retries exceeded, queue for later
      relayQueue.add(message);
      return { success: false, error: 'queued' };
    }
  }
}
```

**User Experience**:
- Show subtle loading indicator during send
- On failure: "Message queued, will send when devices are nearby"
- Show queued message count in UI (e.g., "3 messages queued")
- Automatically send when connectivity restored

---

### 3. Crypto Errors (Critical, Log and Notify)

**Cause**: Encryption/decryption failures

**Examples**:
- Key generation failed
- Decryption failed (wrong key)
- Corrupted encrypted payload
- Missing private key

**Handling**:
```typescript
{
  type: 'crypto',
  severity: 'error',
  userMessage: 'Unable to decrypt message',
  retryable: false,
  recoveryAction: 'skip_message'
}
```

**Special Cases**:

**Decryption Failure (not for me)**:
- Silent failure, message not for this device
- Don't show error to user
- Log for debugging

**Decryption Failure (corrupted)**:
- Show: "This message appears corrupted"
- Allow user to dismiss
- Don't retry

**Key Generation Failure**:
- Show: "Unable to create secure keys. Please restart the app."
- Critical error modal
- Disable encrypted features until restart

**User Experience**:
```
┌─────────────────────────────┐
│  ⚠️ Unable to Decrypt       │
│                             │
│  This coordination message  │
│  could not be decrypted.    │
│                             │
│  [Dismiss]                  │
└─────────────────────────────┘
```

---

### 4. Storage Errors (Retry, Fallback)

**Cause**: AsyncStorage or SecureStore failures

**Examples**:
- Storage quota exceeded
- AsyncStorage unavailable
- Secure storage not supported
- Write permission denied

**Handling**:
```typescript
{
  type: 'storage',
  severity: 'error',
  userMessage: 'Unable to save message',
  retryable: true,
  recoveryAction: 'retry_or_fallback'
}
```

**Fallback Strategy**:
1. Retry write (3 attempts with delays)
2. If quota exceeded: Prune old messages, retry
3. If still fails: Use in-memory storage (session only)
4. Notify user: "Messages will not persist after app closes"

**Storage Quota Management**:
```typescript
async function pruneOldMessages() {
  const messages = await messageStore.getAllMessages();

  // Keep messages from last 30 days
  const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const toKeep = messages.filter(msg =>
    new Date(msg.timestamp).getTime() > cutoffDate ||
    msg.type === 'COORDINATION' // Keep all coordinations
  );

  // If still too many, keep only 500 most recent
  if (toKeep.length > 500) {
    toKeep.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    toKeep.splice(500);
  }

  await messageStore.saveMessages(toKeep);
}
```

**User Experience**:
- Background pruning, no user action needed
- If manual pruning needed: "Storage almost full. Delete old messages?"
- Show storage usage in settings (optional)

---

### 5. Permission Errors (Prompt User)

**Cause**: Required permissions denied

**Examples**:
- Bluetooth permission denied
- Location permission denied (required for BLE on Android)
- Notification permission denied

**Handling**:
```typescript
{
  type: 'permission',
  severity: 'error',
  userMessage: 'Bluetooth permission is required to find nearby devices',
  retryable: true,
  recoveryAction: 'request_permission'
}
```

**Permission States**:
```typescript
type PermissionState = 'granted' | 'denied' | 'blocked' | 'pending';

// blocked = user denied multiple times, must go to settings
```

**User Experience**:

**First Request**:
```
┌─────────────────────────────────┐
│  📡 Enable Bluetooth             │
│                                  │
│  This app uses Bluetooth to     │
│  connect with nearby devices.   │
│                                  │
│  No internet required.          │
│                                  │
│  [Enable Bluetooth]  [Not Now]  │
└─────────────────────────────────┘
```

**After Denial**:
```
┌─────────────────────────────────┐
│  ⚠️ Bluetooth Required          │
│                                  │
│  This app needs Bluetooth to    │
│  work. Without it, you can only │
│  view your saved messages.      │
│                                  │
│  [Open Settings]  [Dismiss]     │
└─────────────────────────────────┘
```

**Graceful Degradation**:
- Without Bluetooth: Local-only mode (view saved messages)
- Without Location: Use manual location entry
- Without Notifications: Poll for updates when app is open

---

### 6. BLE-Specific Errors

**Cause**: Bluetooth Low Energy issues

**Examples**:
- Bluetooth powered off
- BLE not supported on device
- Adapter busy
- MTU negotiation failed
- Characteristic not writable

**Handling**:

**Bluetooth Off**:
```typescript
{
  type: 'ble',
  code: 'BLUETOOTH_OFF',
  userMessage: 'Turn on Bluetooth to connect with nearby devices',
  recoveryAction: 'prompt_enable_bluetooth'
}
```

**BLE Not Supported**:
```typescript
{
  type: 'ble',
  code: 'BLE_NOT_SUPPORTED',
  severity: 'critical',
  userMessage: 'Your device does not support Bluetooth LE',
  recoveryAction: 'disable_ble_features'
}
```

**User Experience**:
- Show BLE status indicator in UI
- Prompt to enable Bluetooth (deep link to system settings)
- Show "Offline mode" badge when BLE unavailable

---

### 7. Message Processing Errors

**Cause**: Invalid or malicious messages

**Examples**:
- Message fails schema validation
- Message signature invalid (if we add signing)
- Message too large
- Malformed JSON

**Handling**:
```typescript
{
  type: 'message_processing',
  severity: 'warning',
  userMessage: null, // Don't show to user
  recoveryAction: 'discard_message',
  log: true
}
```

**Processing Pipeline**:
```typescript
async function processIncomingMessage(data: Buffer, deviceId: string) {
  try {
    // 1. Deserialize
    const message = deserializeMessage(data);
    if (!message) {
      throw new MessageError('DESERIALIZATION_FAILED');
    }

    // 2. Validate schema
    const validation = validateMessage(message);
    if (!validation.valid) {
      throw new MessageError('VALIDATION_FAILED', validation.error);
    }

    // 3. Check if seen before
    if (seenMessages.has(message.message_id)) {
      return; // Silent skip
    }

    // 4. Check expiration
    if (isExpired(message)) {
      throw new MessageError('MESSAGE_EXPIRED');
    }

    // 5. Process message
    await storeMessage(message);
    await relayMessage(message);

  } catch (error) {
    if (error instanceof MessageError) {
      logError({
        type: 'message_processing',
        code: error.code,
        deviceId,
        messageId: error.messageId,
        details: error.message
      });
    } else {
      // Unexpected error
      logError({
        type: 'unexpected',
        error: error.message,
        stack: error.stack
      });
    }
  }
}
```

**User Experience**:
- Invalid messages are silently discarded
- No user notification (avoid spam from malicious devices)
- Logged for debugging

---

## Error Communication Patterns

### Toast Notifications (Non-Blocking)

For informational or recoverable errors:

```typescript
showToast({
  type: 'info' | 'warning' | 'error',
  message: string,
  duration: number, // ms
  action?: { label: string, onPress: () => void }
});
```

**Examples**:
- "Message queued" (info)
- "Storage almost full" (warning)
- "Unable to send message" (error, with retry action)

### Modal Dialogs (Blocking)

For critical errors requiring user action:

```typescript
showModal({
  title: string,
  message: string,
  icon: 'warning' | 'error' | 'info',
  buttons: [
    { label: string, onPress: () => void, style: 'primary' | 'secondary' | 'destructive' }
  ]
});
```

**Examples**:
- Bluetooth permission required
- Storage full (with prune action)
- Critical crypto error (restart required)

### Inline Errors (Form Validation)

For field-specific validation errors:

```typescript
<Input
  value={value}
  onChangeText={setValue}
  error={error ? 'Building number must be 1-2 characters' : undefined}
  errorColor="red"
/>
```

### Status Indicators (Ambient)

For ongoing status:

```typescript
<StatusBar>
  {bleStatus === 'off' && <Chip icon="bluetooth-off" label="Offline" />}
  {queueSize > 0 && <Chip icon="queue" label={`${queueSize} queued`} />}
</StatusBar>
```

---

## Error Logging

### Log Structure

```typescript
interface ErrorLog {
  timestamp: number;
  type: ErrorType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  code?: string;
  message: string;
  context?: {
    screen?: string;
    userId?: string; // Never log real identities
    messageId?: string;
    deviceId?: string;
  };
  stack?: string;
  userNotified: boolean;
}
```

### Privacy-Safe Logging

**DO LOG**:
- Error types and codes
- Message IDs (UUIDs, not content)
- Device IDs (UUIDs, not MAC addresses)
- Timestamps
- App state (screen, BLE status)

**DO NOT LOG**:
- Message content (especially encrypted payloads)
- User names, locations, or personal details
- Private keys or coordination details
- Exact coordinates

### Log Storage

```typescript
class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100; // Keep last 100 errors

  log(error: ErrorLog) {
    this.logs.push(error);

    // Prune old logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Persist (async, don't block)
    AsyncStorage.setItem('error_logs', JSON.stringify(this.logs))
      .catch(err => console.error('Failed to persist error logs:', err));
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    AsyncStorage.removeItem('error_logs');
  }
}
```

### Debug Screen

Provide a debug screen (accessible via Settings) to view logs:

```
┌─────────────────────────────────┐
│  Debug Logs                     │
├─────────────────────────────────┤
│  [Clear Logs] [Export]          │
│                                 │
│  Oct 26, 14:30:22              │
│  ERROR: BLE_SEND_FAILED        │
│  Message: Timeout after 5s     │
│                                 │
│  Oct 26, 14:28:15              │
│  WARNING: STORAGE_ALMOST_FULL  │
│  Context: 480/500 messages     │
│                                 │
│  Oct 26, 14:25:03              │
│  INFO: MESSAGE_QUEUED          │
│  Message ID: 550e8400...       │
│                                 │
└─────────────────────────────────┘
```

---

## Graceful Degradation Matrix

| Failure | Core Impact | Degraded Experience |
|---------|-------------|---------------------|
| **BLE unavailable** | Cannot broadcast/receive | View saved messages, create drafts |
| **Crypto failure** | Cannot coordinate privately | Can browse public needs/offers |
| **Storage full** | Cannot save new messages | In-memory only, lost on restart |
| **Location denied** | Cannot auto-detect location | Manual location entry required |
| **Notifications denied** | Cannot alert on new matches | Must check app manually |
| **Bluetooth off** | No mesh networking | Local-only mode |

### Feature Flags

Use feature flags to disable broken features:

```typescript
interface FeatureFlags {
  bleEnabled: boolean;
  cryptoEnabled: boolean;
  storageEnabled: boolean;
  notificationsEnabled: boolean;
}

const features = useFeatureFlags();

// In UI
{features.bleEnabled ? (
  <BroadcastButton />
) : (
  <LocalOnlyBadge />
)}
```

---

## Recovery Actions

### Automatic Recovery

1. **Retry with Exponential Backoff**: For transient network errors
2. **Queue and Defer**: For messages that can be sent later
3. **Prune and Retry**: For storage quota errors
4. **Fallback to Defaults**: For configuration errors
5. **Restart Service**: For stuck BLE adapter

### Manual Recovery

1. **Prompt User**: For permission errors
2. **Open Settings**: For blocked permissions
3. **Clear Cache**: For corrupted storage (user-initiated)
4. **Restart App**: For critical crypto errors

### Example: BLE Auto-Recovery

```typescript
class BleRecoveryManager {
  private restartAttempts = 0;
  private maxRestarts = 3;

  async handleBleError(error: BleError) {
    if (error.code === 'ADAPTER_BUSY' && this.restartAttempts < this.maxRestarts) {
      this.restartAttempts++;

      // Stop BLE
      await bleManager.stopScanning();
      await bleManager.stopAdvertising();

      // Wait 2 seconds
      await sleep(2000);

      // Restart
      await bleManager.startScanning();
      await bleManager.startAdvertising();

      showToast({
        type: 'info',
        message: 'Restarted Bluetooth connection',
        duration: 2000
      });
    } else {
      // Can't auto-recover
      showModal({
        title: 'Bluetooth Error',
        message: 'Please restart the app',
        buttons: [{ label: 'OK', onPress: () => {} }]
      });
    }
  }
}
```

---

## Testing Error Scenarios

### Unit Tests

Test each error type in isolation:

```typescript
describe('Error Handling', () => {
  it('should retry network errors with exponential backoff', async () => {
    const sendSpy = jest.spyOn(bleManager, 'sendMessage')
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce(undefined);

    await sendWithRetry(mockMessage);

    expect(sendSpy).toHaveBeenCalledTimes(3);
  });

  it('should queue message after max retries', async () => {
    jest.spyOn(bleManager, 'sendMessage')
      .mockRejectedValue(new Error('Timeout'));

    const result = await sendWithRetry(mockMessage);

    expect(result.success).toBe(false);
    expect(relayQueue.size()).toBe(1);
  });
});
```

### Integration Tests

Test error flows across layers:

```typescript
it('should handle storage failure by using in-memory fallback', async () => {
  jest.spyOn(AsyncStorage, 'setItem')
    .mockRejectedValue(new Error('Quota exceeded'));

  const message = createMockMessage();
  await messageStore.saveMessage(message);

  // Should still be accessible in memory
  const retrieved = await messageStore.getMessage(message.message_id);
  expect(retrieved).toEqual(message);

  // Should show user notification
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'warning',
      message: expect.stringContaining('not persist')
    })
  );
});
```

### Manual Test Scenarios

1. **Airplane Mode**: Enable airplane mode, try to send message
2. **Bluetooth Off**: Turn off Bluetooth, verify offline mode
3. **Storage Full**: Fill storage, try to save message
4. **Permission Denied**: Deny permissions, verify graceful degradation
5. **Invalid Message**: Send malformed message from test device
6. **App Backgrounded**: Background app during send, verify resume
7. **Device Out of Range**: Move devices apart during transmission

---

## Error Messages - User-Facing Copy

### Network Errors

- ✅ "Message will be sent when devices are nearby"
- ✅ "Waiting for nearby devices..."
- ❌ "BLE_SEND_TIMEOUT after 5000ms"

### Crypto Errors

- ✅ "Unable to decrypt this message"
- ✅ "This message appears to be corrupted"
- ❌ "DECRYPT_FAILED: Invalid nonce"

### Storage Errors

- ✅ "Storage is almost full. Delete old messages?"
- ✅ "Messages will not be saved after app closes"
- ❌ "AsyncStorage quota exceeded: 6MB/5MB"

### Permission Errors

- ✅ "Bluetooth is required to find nearby devices"
- ✅ "Location helps Bluetooth work better"
- ❌ "PERMISSION_DENIED: android.permission.BLUETOOTH_SCAN"

**Principles for Error Messages**:
1. Use plain language, no jargon
2. Explain impact, not technical cause
3. Offer next steps where possible
4. Be reassuring, not alarming
5. Respect dignity (no blame, no shame)

---

## Summary

This error handling strategy prioritizes:
1. **User Experience**: Clear communication, no crashes
2. **Resilience**: Automatic recovery where possible
3. **Privacy**: Never log sensitive data
4. **Debugging**: Detailed logs for development
5. **Graceful Degradation**: Core features work even when advanced features fail

All services should follow these patterns for consistent error handling across the app.
