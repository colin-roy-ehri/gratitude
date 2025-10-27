# State Management Architecture

## Overview

We use **Zustand** for state management due to its simplicity, minimal boilerplate, and excellent TypeScript support. Zustand's API is more intuitive than Redux and performs better than Context API for frequent updates.

## Why Zustand?

1. **Minimal boilerplate**: No actions/reducers/dispatchers
2. **TypeScript-friendly**: Excellent type inference
3. **Performance**: Fine-grained subscriptions, no unnecessary re-renders
4. **DevTools**: Redux DevTools integration available
5. **Middleware**: Persist, immer, devtools built-in
6. **Learning curve**: Simple API, easy for AI to generate

## Store Architecture

We use **4 primary stores** to separate concerns:

```
messageStore          → All messages (needs, offers, coordinations)
coordinationStore     → Active coordinations and conversation threads
bleStore             → BLE status, nearby devices, relay operations
uiStore              → UI state (modals, notifications, navigation)
```

## Store Patterns

### Basic Store Structure

```typescript
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface StoreState {
  // State
  data: SomeType[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchData: () => Promise<void>;
  addData: (item: SomeType) => void;
  clearError: () => void;
}

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        data: [],
        loading: false,
        error: null,

        // Actions
        fetchData: async () => {
          set({ loading: true, error: null });
          try {
            const result = await someService.fetch();
            set({ data: result, loading: false });
          } catch (error) {
            set({ error: error.message, loading: false });
          }
        },

        addData: (item) => {
          set((state) => ({ data: [...state.data, item] }));
        },

        clearError: () => set({ error: null }),
      }),
      { name: 'store-name' }
    )
  )
);
```

### Using Stores in Components

```typescript
// Subscribe to entire store (re-renders on any change)
const { data, loading, fetchData } = useStore();

// Subscribe to specific slices (re-renders only when slice changes)
const data = useStore((state) => state.data);
const loading = useStore((state) => state.loading);

// Call actions directly
const addData = useStore((state) => state.addData);
addData(newItem);
```

---

## Store 1: Message Store

**Purpose**: Manage all messages (NEED, OFFER, COORDINATION, COMPLETION)

### State Schema

```typescript
interface MessageStore {
  // State
  messages: MutualAidMessage[];           // All messages
  myMessages: MutualAidMessage[];         // Messages I created
  loading: boolean;
  error: string | null;
  lastSyncTimestamp: number | null;

  // Filters
  filters: {
    type: MessageType[];                  // Filter by type
    category: PrimaryCategory[];          // Filter by category
    distance: number;                     // Max distance in km
    timeRange: 'today' | 'week' | 'all';
  };

  // Actions - CRUD
  loadMessages: () => Promise<void>;
  addMessage: (message: MutualAidMessage) => void;
  updateMessage: (id: string, updates: Partial<MutualAidMessage>) => void;
  deleteMessage: (id: string) => Promise<void>;

  // Actions - Creation
  createNeed: (params: CreateNeedParams) => Promise<Result<MutualAidMessage>>;
  createOffer: (params: CreateOfferParams) => Promise<Result<MutualAidMessage>>;

  // Actions - Filters
  setFilters: (filters: Partial<MessageStore['filters']>) => void;
  clearFilters: () => void;

  // Actions - Utility
  markMessageExpired: (id: string) => void;
  clearError: () => void;

  // Selectors (computed state)
  getFilteredMessages: () => MutualAidMessage[];
  getMyRequests: () => MutualAidMessage[];
  getMyOffers: () => MutualAidMessage[];
  getMessageById: (id: string) => MutualAidMessage | undefined;
  getNearbyMessages: (lat: number, lon: number, radiusKm: number) => MutualAidMessage[];
}
```

### Implementation Pattern

```typescript
export const useMessageStore = create<MessageStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        messages: [],
        myMessages: [],
        loading: false,
        error: null,
        lastSyncTimestamp: null,
        filters: {
          type: [],
          category: [],
          distance: 10,
          timeRange: 'all',
        },

        // Load messages from storage on app start
        loadMessages: async () => {
          set({ loading: true, error: null });
          try {
            const messages = await messageStoreService.getAllMessages();
            set({ messages, loading: false, lastSyncTimestamp: Date.now() });
          } catch (error) {
            set({ error: error.message, loading: false });
          }
        },

        // Add new message (from BLE or local creation)
        addMessage: (message) => {
          set((state) => ({
            messages: [...state.messages, message],
            myMessages: message.metadata?.createdLocally
              ? [...state.myMessages, message]
              : state.myMessages,
          }));
        },

        // Create need (calls messageManager service)
        createNeed: async (params) => {
          set({ loading: true, error: null });
          try {
            const result = await messageManager.createNeed(params);
            if (result.success) {
              get().addMessage(result.data);
              // Trigger BLE broadcast
              useBleStore.getState().broadcastMessage(result.data);
            }
            set({ loading: false });
            return result;
          } catch (error) {
            set({ error: error.message, loading: false });
            return { success: false, error: error.message };
          }
        },

        // Selectors
        getFilteredMessages: () => {
          const { messages, filters } = get();
          return messages.filter((msg) => {
            // Apply type filter
            if (filters.type.length > 0 && !filters.type.includes(msg.type)) {
              return false;
            }
            // Apply category filter
            if (filters.category.length > 0 && !filters.category.includes(msg.public.category.primary)) {
              return false;
            }
            // Apply time filter
            if (filters.timeRange === 'today') {
              const today = new Date().setHours(0, 0, 0, 0);
              if (new Date(msg.timestamp) < new Date(today)) return false;
            }
            return true;
          });
        },

        getMyRequests: () => {
          return get().myMessages.filter((msg) => msg.type === 'NEED');
        },

        getMyOffers: () => {
          return get().myMessages.filter((msg) => msg.type === 'OFFER');
        },

        getMessageById: (id) => {
          return get().messages.find((msg) => msg.message_id === id);
        },

        getNearbyMessages: (lat, lon, radiusKm) => {
          return get().messages.filter((msg) => {
            const distance = calculateDistance(
              lat, lon,
              msg.public.location.coords // Parse coords string
            );
            return distance <= radiusKm;
          });
        },

        // ... other actions
      }),
      { name: 'message-store' }
    )
  )
);
```

---

## Store 2: Coordination Store

**Purpose**: Manage active coordinations and encrypted conversations

### State Schema

```typescript
interface CoordinationStore {
  // State
  coordinations: Coordination[];          // Active coordination sessions
  loading: boolean;
  error: string | null;

  // Actions - CRUD
  loadCoordinations: () => Promise<void>;
  addCoordination: (coordination: Coordination) => void;
  updateCoordination: (id: string, updates: Partial<Coordination>) => void;

  // Actions - Creation
  createCoordination: (params: CreateCoordinationParams) => Promise<Result<Coordination>>;
  sendMessage: (coordinationId: string, content: string) => Promise<Result<CoordinationMessage>>;

  // Actions - Lifecycle
  markAsComplete: (coordinationId: string) => Promise<void>;
  cancelCoordination: (coordinationId: string, reason?: string) => Promise<void>;

  // Actions - Message Handling
  handleIncomingCoordination: (message: MutualAidMessage) => Promise<void>;

  // Selectors
  getActiveCoordinations: () => Coordination[];
  getCompletedCoordinations: () => Coordination[];
  getCoordinationById: (id: string) => Coordination | undefined;
  getCoordinationMessages: (id: string) => CoordinationMessage[];
}

interface Coordination {
  id: string;                             // Coordination ID
  relatedToMessageId: string;             // Original NEED/OFFER message
  participants: Participant[];            // Who's involved
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  messages: CoordinationMessage[];        // Conversation thread
  details: CoordinationDetails;           // Meeting time, location, etc.
  createdAt: number;
  updatedAt: number;
}

interface Participant {
  publicKey: string;
  role: 'requester' | 'offerer' | 'broker';
  name?: string;                          // Optional display name
}

interface CoordinationMessage {
  id: string;
  from: string;                           // Public key
  content: string;                        // Decrypted content
  timestamp: number;
  encrypted: boolean;                     // Was this encrypted?
}

interface CoordinationDetails {
  time: {
    date: string;
    windows: string[];
  };
  location: {
    type: 'address' | 'map_pin';
    address?: {
      building: string;
      floor: string;
      unit: string;
    };
    coords?: string;
    description?: string;
  };
  identification?: string[];              // "Blue jacket", etc.
  contactName?: string;
  notes?: string;
}
```

### Implementation Highlights

```typescript
export const useCoordinationStore = create<CoordinationStore>()(
  devtools(
    persist(
      (set, get) => ({
        coordinations: [],
        loading: false,
        error: null,

        // Create new coordination when accepting an offer
        createCoordination: async (params) => {
          set({ loading: true, error: null });
          try {
            // 1. Get the offer message to extract offerer's public key
            const offerMessage = useMessageStore.getState().getMessageById(params.offerMessageId);

            // 2. Create coordination details
            const details: CoordinationDetails = {
              time: params.time,
              location: params.location,
              identification: params.identification,
              contactName: params.contactName,
            };

            // 3. Encrypt details for offerer
            const encryptedPayload = await encryptionService.encryptForRecipient(
              details,
              offerMessage.coordination_key
            );

            // 4. Create COORDINATION message
            const coordinationMessage: MutualAidMessage = {
              message_id: generateUUID(),
              version: 1,
              type: 'COORDINATION',
              timestamp: new Date().toISOString(),
              in_response_to: params.offerMessageId,
              hop_count: 0,
              public: offerMessage.public, // Inherit public info
              coordination_key: params.myPublicKey,
              encrypted_payloads: [encryptedPayload],
              metadata: {
                relay_eligible: true,
                expires_at: addDays(1).toISOString(),
                priority: 'high',
              },
            };

            // 5. Store coordination locally
            const coordination: Coordination = {
              id: coordinationMessage.message_id,
              relatedToMessageId: params.offerMessageId,
              participants: [
                { publicKey: params.myPublicKey, role: 'requester', name: params.contactName },
                { publicKey: offerMessage.coordination_key, role: 'offerer' },
              ],
              status: 'pending',
              messages: [],
              details,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            set((state) => ({
              coordinations: [...state.coordinations, coordination],
              loading: false,
            }));

            // 6. Broadcast via BLE
            useBleStore.getState().broadcastMessage(coordinationMessage);

            return { success: true, data: coordination };
          } catch (error) {
            set({ error: error.message, loading: false });
            return { success: false, error: error.message };
          }
        },

        // Handle incoming COORDINATION message
        handleIncomingCoordination: async (message) => {
          try {
            // 1. Try to decrypt payloads (am I a recipient?)
            const myPrivateKey = await keyManager.getPrivateKey(message.in_response_to);
            const decryptedPayloads = await encryptionService.decryptPayloads(
              message.encrypted_payloads,
              myPrivateKey
            );

            if (decryptedPayloads.length === 0) {
              // Not for me, ignore
              return;
            }

            // 2. Extract coordination details
            const details: CoordinationDetails = decryptedPayloads[0].content;

            // 3. Create or update coordination
            const existingCoordination = get().getCoordinationById(message.message_id);

            if (existingCoordination) {
              // Update existing
              get().updateCoordination(message.message_id, {
                status: 'active',
                details,
                updatedAt: Date.now(),
              });
            } else {
              // Create new
              const coordination: Coordination = {
                id: message.message_id,
                relatedToMessageId: message.in_response_to,
                participants: [
                  { publicKey: message.coordination_key, role: 'requester' },
                  { publicKey: myPrivateKey.publicKey, role: 'offerer' },
                ],
                status: 'active',
                messages: [],
                details,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };

              get().addCoordination(coordination);
            }

            // 4. Notify user (via uiStore)
            useUiStore.getState().showNotification({
              type: 'coordination',
              title: 'New coordination details',
              message: `Someone accepted your offer`,
              coordinationId: message.message_id,
            });
          } catch (error) {
            console.error('Error handling coordination:', error);
          }
        },

        // ... other actions and selectors
      }),
      { name: 'coordination-store' }
    )
  )
);
```

---

## Store 3: BLE Store

**Purpose**: Manage BLE status, nearby devices, and message relay queue

### State Schema

```typescript
interface BleStore {
  // State
  isInitialized: boolean;
  isScanning: boolean;
  isAdvertising: boolean;
  nearbyDevices: Device[];
  relayQueue: RelayQueueItem[];
  lastScanTimestamp: number | null;
  error: string | null;

  // Permissions
  permissions: {
    bluetooth: 'granted' | 'denied' | 'pending';
    location: 'granted' | 'denied' | 'pending';
  };

  // Stats
  stats: {
    messagesSent: number;
    messagesReceived: number;
    messagesRelayed: number;
    bytesTransferred: number;
  };

  // Actions - Lifecycle
  initialize: () => Promise<void>;
  startScanning: () => Promise<void>;
  stopScanning: () => Promise<void>;
  startAdvertising: () => Promise<void>;
  stopAdvertising: () => Promise<void>;

  // Actions - Messaging
  broadcastMessage: (message: MutualAidMessage) => Promise<void>;
  handleIncomingMessage: (data: Buffer, deviceId: string) => Promise<void>;

  // Actions - Relay
  scheduleRelay: (message: MutualAidMessage, delay: number) => void;
  processRelayQueue: () => Promise<void>;
  clearRelayQueue: () => void;

  // Actions - Permissions
  requestPermissions: () => Promise<void>;

  // Selectors
  getNearbyDeviceCount: () => number;
  getRelayQueueSize: () => number;
  isMessageInQueue: (messageId: string) => boolean;
}

interface Device {
  id: string;                             // BLE device ID
  name?: string;
  rssi: number;                           // Signal strength
  lastSeen: number;                       // Timestamp
}

interface RelayQueueItem {
  message: MutualAidMessage;
  scheduledFor: number;                   // Timestamp
  attempts: number;
}
```

### Implementation Highlights

```typescript
export const useBleStore = create<BleStore>()(
  devtools(
    (set, get) => ({
      isInitialized: false,
      isScanning: false,
      isAdvertising: false,
      nearbyDevices: [],
      relayQueue: [],
      lastScanTimestamp: null,
      error: null,
      permissions: {
        bluetooth: 'pending',
        location: 'pending',
      },
      stats: {
        messagesSent: 0,
        messagesReceived: 0,
        messagesRelayed: 0,
        bytesTransferred: 0,
      },

      initialize: async () => {
        try {
          await bleManager.initialize();
          set({ isInitialized: true });

          // Request permissions
          await get().requestPermissions();

          // Start scanning automatically
          await get().startScanning();

          // Start relay processor (runs periodically)
          setInterval(() => get().processRelayQueue(), 5000);
        } catch (error) {
          set({ error: error.message });
        }
      },

      broadcastMessage: async (message) => {
        try {
          const serialized = serializationService.serializeMessage(message);
          await bleManager.sendMessage(serialized);

          set((state) => ({
            stats: {
              ...state.stats,
              messagesSent: state.stats.messagesSent + 1,
              bytesTransferred: state.stats.bytesTransferred + serialized.length,
            },
          }));
        } catch (error) {
          console.error('Broadcast error:', error);
          // Queue for retry
          get().scheduleRelay(message, 5000);
        }
      },

      handleIncomingMessage: async (data, deviceId) => {
        try {
          // 1. Deserialize
          const message = serializationService.deserializeMessage(data);

          // 2. Validate
          const validation = messageValidator.validate(message);
          if (!validation.valid) {
            console.warn('Invalid message:', validation.error);
            return;
          }

          // 3. Check if we've seen this before
          if (messageRelay.hasSeenMessage(message.message_id)) {
            return;
          }

          // 4. Store message
          useMessageStore.getState().addMessage(message);

          // 5. Handle message type-specific logic
          if (message.type === 'COORDINATION') {
            await useCoordinationStore.getState().handleIncomingCoordination(message);
          }

          // 6. Schedule relay
          if (message.metadata?.relay_eligible) {
            get().scheduleRelay(message, 2000 + Math.random() * 3000); // Random delay
          }

          // 7. Update stats
          set((state) => ({
            stats: {
              ...state.stats,
              messagesReceived: state.stats.messagesReceived + 1,
              bytesTransferred: state.stats.bytesTransferred + data.length,
            },
          }));
        } catch (error) {
          console.error('Error handling incoming message:', error);
        }
      },

      scheduleRelay: (message, delay) => {
        set((state) => ({
          relayQueue: [
            ...state.relayQueue,
            {
              message,
              scheduledFor: Date.now() + delay,
              attempts: 0,
            },
          ],
        }));
      },

      processRelayQueue: async () => {
        const now = Date.now();
        const { relayQueue } = get();

        const dueItems = relayQueue.filter((item) => item.scheduledFor <= now);

        for (const item of dueItems) {
          try {
            await get().broadcastMessage(item.message);

            // Remove from queue
            set((state) => ({
              relayQueue: state.relayQueue.filter((i) => i !== item),
              stats: {
                ...state.stats,
                messagesRelayed: state.stats.messagesRelayed + 1,
              },
            }));
          } catch (error) {
            // Retry with exponential backoff
            if (item.attempts < 3) {
              item.attempts++;
              item.scheduledFor = Date.now() + (1000 * Math.pow(2, item.attempts));
            } else {
              // Give up, remove from queue
              set((state) => ({
                relayQueue: state.relayQueue.filter((i) => i !== item),
              }));
            }
          }
        }
      },

      // ... other actions and selectors
    })
  )
);
```

---

## Store 4: UI Store

**Purpose**: Manage UI-specific state (modals, notifications, navigation)

### State Schema

```typescript
interface UiStore {
  // State
  notifications: Notification[];
  modals: {
    [key: string]: boolean;               // Modal visibility states
  };
  loading: {
    [key: string]: boolean;               // Loading states per operation
  };

  // Navigation
  currentScreen: string;
  navigationHistory: string[];

  // Actions - Notifications
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Actions - Modals
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;

  // Actions - Loading
  setLoading: (key: string, loading: boolean) => void;

  // Actions - Navigation
  setCurrentScreen: (screen: string) => void;
  goBack: () => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'coordination';
  title: string;
  message: string;
  timestamp: number;
  action?: {
    label: string;
    onPress: () => void;
  };
  coordinationId?: string;                // For coordination-specific notifications
}
```

---

## Store Communication Patterns

### Cross-Store Actions

Stores can call actions from other stores:

```typescript
// In messageStore
createNeed: async (params) => {
  const result = await messageManager.createNeed(params);
  if (result.success) {
    get().addMessage(result.data);

    // Trigger BLE broadcast via bleStore
    useBleStore.getState().broadcastMessage(result.data);

    // Show success notification via uiStore
    useUiStore.getState().showNotification({
      type: 'success',
      title: 'Request posted',
      message: 'Your request is now visible to others nearby',
    });
  }
  return result;
}
```

### Avoiding Circular Dependencies

- Services call services (✅)
- Stores call services (✅)
- Stores call other stores' actions (✅)
- Services should NOT call stores (❌)
- Components only read stores and call actions (✅)

---

## Persistence Strategy

### What to Persist

**Persist (survive app restart):**
- `messageStore`: All messages, myMessages, filters
- `coordinationStore`: All coordinations
- `uiStore`: User preferences (if any)

**Don't Persist (reset on restart):**
- `bleStore`: Scanning state, nearby devices, relay queue
- Loading/error states

### Using Zustand Persist Middleware

```typescript
persist(
  (set, get) => ({ /* store implementation */ }),
  {
    name: 'message-store',              // AsyncStorage key
    partialize: (state) => ({            // What to persist
      messages: state.messages,
      myMessages: state.myMessages,
      filters: state.filters,
    }),
    version: 1,                          // Schema version
    migrate: (persistedState, version) => {
      // Handle migration if schema changes
      if (version === 0) {
        // Upgrade from v0 to v1
      }
      return persistedState;
    },
  }
)
```

---

## Testing Stores

### Unit Tests

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useMessageStore } from './messageStore';

describe('messageStore', () => {
  beforeEach(() => {
    // Reset store state
    useMessageStore.setState({ messages: [], loading: false });
  });

  it('should add message', () => {
    const { result } = renderHook(() => useMessageStore());

    act(() => {
      result.current.addMessage(mockMessage);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual(mockMessage);
  });

  it('should filter messages by type', () => {
    const { result } = renderHook(() => useMessageStore());

    act(() => {
      result.current.addMessage(mockNeedMessage);
      result.current.addMessage(mockOfferMessage);
      result.current.setFilters({ type: ['NEED'] });
    });

    const filtered = result.current.getFilteredMessages();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('NEED');
  });
});
```

---

## Performance Optimization

### Fine-Grained Subscriptions

```typescript
// ❌ Bad: Re-renders on ANY state change
const { messages, loading, error } = useMessageStore();

// ✅ Good: Only re-renders when messages change
const messages = useMessageStore((state) => state.messages);
const loading = useMessageStore((state) => state.loading);
```

### Memoized Selectors

```typescript
// In store definition
getFilteredMessages: () => {
  const { messages, filters } = get();
  // This runs every time, consider memoization
  return messages.filter(/* ... */);
}

// Better: use a library like reselect or implement manual memoization
```

### Batch Updates

```typescript
// ❌ Bad: Multiple re-renders
set({ loading: true });
set({ error: null });
set({ messages: newMessages });

// ✅ Good: Single re-render
set({ loading: true, error: null, messages: newMessages });
```

---

## DevTools Integration

Enable Redux DevTools for debugging:

```typescript
import { devtools } from 'zustand/middleware';

export const useMessageStore = create<MessageStore>()(
  devtools(
    (set, get) => ({ /* ... */ }),
    { name: 'MessageStore' }  // Show in DevTools
  )
);
```

**Using DevTools:**
1. Install Redux DevTools browser extension
2. Inspect state changes in real-time
3. Time-travel debugging
4. Export/import state for testing

---

## Migration from Other State Management

If you later decide to switch state management:

**From Context API**: Direct replacement, similar hooks API
**From Redux**: Remove actions/reducers, flatten structure
**To Redux**: Extract actions/reducers from Zustand stores

Zustand stores are plain objects, easy to migrate data structures.
