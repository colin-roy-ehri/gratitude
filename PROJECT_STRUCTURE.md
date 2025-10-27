# Project Structure

## Overview

This document defines the file organization, naming conventions, and code structure patterns for the mutual aid app. Following these conventions ensures consistency and makes the codebase easy to navigate for both humans and AI assistants.

## Directory Structure

```
gratitude/
├── .expo/                    # Expo build artifacts (gitignored)
├── .github/                  # GitHub workflows (future CI/CD)
├── android/                  # Android native code (bare workflow)
│   ├── app/
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/         # Java/Kotlin code
│   └── build.gradle
├── ios/                      # iOS native code (future, not POC)
├── node_modules/             # Dependencies (gitignored)
├── src/                      # Application source code
│   ├── components/           # Reusable UI components
│   │   ├── __tests__/
│   │   ├── Button.tsx
│   │   ├── CategoryIcon.tsx
│   │   ├── Input.tsx
│   │   ├── MessageCard.tsx
│   │   └── index.ts          # Barrel export
│   ├── constants/            # App-wide constants
│   │   ├── categories.ts     # Category definitions
│   │   ├── colors.ts         # Color palette
│   │   ├── time.ts           # Time patterns
│   │   └── ble.ts            # BLE UUIDs
│   ├── hooks/                # Custom React hooks
│   │   ├── useLocation.ts
│   │   ├── usePermissions.ts
│   │   └── useBleStatus.ts
│   ├── navigation/           # React Navigation setup
│   │   ├── AppNavigator.tsx
│   │   ├── types.ts
│   │   └── linking.ts
│   ├── screens/              # Top-level screen components
│   │   ├── __tests__/
│   │   ├── HomeScreen.tsx
│   │   ├── MessageDetailScreen.tsx
│   │   ├── CoordinationScreen.tsx
│   │   ├── RequestWizard/
│   │   │   ├── Step1_Category.tsx
│   │   │   ├── Step2_Details.tsx
│   │   │   ├── Step3_Time.tsx
│   │   │   ├── Step4_Location.tsx
│   │   │   ├── Step5_Review.tsx
│   │   │   └── WizardContainer.tsx
│   │   └── OfferWizard/
│   │       └── ...
│   ├── services/             # Business logic (stateless)
│   │   ├── __mocks__/        # Service mocks for testing
│   │   ├── ble/
│   │   │   ├── __tests__/
│   │   │   ├── bleManager.ts
│   │   │   ├── serialization.ts
│   │   │   ├── messageRelay.ts
│   │   │   └── deviceManager.ts
│   │   ├── crypto/
│   │   │   ├── __tests__/
│   │   │   ├── keyManager.ts
│   │   │   ├── encryption.ts
│   │   │   └── multiPayload.ts
│   │   ├── storage/
│   │   │   ├── __tests__/
│   │   │   ├── messageStore.ts
│   │   │   └── keyStore.ts
│   │   ├── validation/
│   │   │   ├── __tests__/
│   │   │   ├── messageValidator.ts
│   │   │   └── densityCalculator.ts
│   │   ├── messageManager.ts
│   │   └── coordinationHandler.ts
│   ├── stores/               # Zustand state management
│   │   ├── __tests__/
│   │   ├── messageStore.ts
│   │   ├── coordinationStore.ts
│   │   ├── bleStore.ts
│   │   └── uiStore.ts
│   ├── types/                # TypeScript types
│   │   ├── message.ts        # Message schema types
│   │   ├── coordination.ts
│   │   ├── storage.ts
│   │   ├── ble.ts
│   │   └── navigation.ts
│   ├── utils/                # Utility functions
│   │   ├── __tests__/
│   │   ├── distance.ts       # Calculate distance between coords
│   │   ├── time.ts           # Time formatting/parsing
│   │   ├── uuid.ts           # UUID generation
│   │   └── logger.ts         # Error logging
│   └── App.tsx               # Root component
├── .gitignore
├── .eslintrc.js              # ESLint config
├── .prettierrc.js            # Prettier config
├── app.json                  # Expo configuration
├── babel.config.js
├── jest.config.js            # Jest configuration
├── metro.config.js           # Metro bundler config
├── package.json
├── tsconfig.json             # TypeScript config
├── ARCHITECTURE.md
├── STATE_MANAGEMENT.md
├── ERROR_HANDLING.md
├── TESTING_STRATEGY.md
└── PROJECT_STRUCTURE.md      # This file
```

## Naming Conventions

### Files and Directories

**TypeScript/React Files**:
- Components: PascalCase (e.g., `MessageCard.tsx`)
- Screens: PascalCase with "Screen" suffix (e.g., `HomeScreen.tsx`)
- Services: camelCase (e.g., `messageManager.ts`)
- Stores: camelCase with "Store" suffix (e.g., `messageStore.ts`)
- Types: camelCase (e.g., `message.ts`)
- Utils: camelCase (e.g., `distance.ts`)
- Tests: Match source file with `.test.ts` suffix (e.g., `messageValidator.test.ts`)

**Directories**:
- lowercase, singular or plural as appropriate
- Use hyphens for multi-word directories if needed (rare)

### Variables and Functions

```typescript
// Components: PascalCase
const MessageCard = () => { ... };

// Functions: camelCase, verb-first
function createMessage() { ... }
function validateInput() { ... }

// Constants: UPPER_SNAKE_CASE or camelCase depending on scope
const MAX_MESSAGE_SIZE = 10000;
const bleServiceUUID = '0000FE01-0000-1000-8000-00805F9B34FB';

// Types/Interfaces: PascalCase
interface Message { ... }
type MessageType = 'NEED' | 'OFFER';

// Enums: PascalCase
enum PrimaryCategory {
  FOOD = 'FOOD',
  WATER = 'WATER',
}

// Private members: underscore prefix (optional)
class MessageManager {
  private _cache = new Map();
}
```

### React Components

```typescript
// Functional component with props
interface MessageCardProps {
  message: MutualAidMessage;
  onPress: (message: MutualAidMessage) => void;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(message)}>
      <Text>{message.public.category.primary}</Text>
    </TouchableOpacity>
  );
};
```

## Code Organization Patterns

### Barrel Exports

Use `index.ts` files to re-export from directories:

```typescript
// src/components/index.ts
export { Button } from './Button';
export { MessageCard } from './MessageCard';
export { CategoryIcon } from './CategoryIcon';

// Usage in other files
import { Button, MessageCard } from '../components';
```

### Service Pattern

Services are stateless classes or object modules:

```typescript
// src/services/messageManager.ts

import { messageValidator } from './validation/messageValidator';
import { messageStoreService } from './storage/messageStore';
import { keyManager } from './crypto/keyManager';

interface CreateNeedParams {
  category: PrimaryCategory;
  location: { lat: number; lon: number };
  time: TimePattern;
  // ... other params
}

class MessageManager {
  /**
   * Create a NEED message
   * @param params - Message parameters
   * @returns Result with message or error
   */
  async createNeed(params: CreateNeedParams): Promise<Result<MutualAidMessage>> {
    try {
      // 1. Generate message ID and keys
      const messageId = generateUUID();
      const keypair = await keyManager.generateKeypair();

      // 2. Build message
      const message: MutualAidMessage = {
        message_id: messageId,
        version: 1,
        type: 'NEED',
        timestamp: new Date().toISOString(),
        // ... rest of message
      };

      // 3. Validate
      const validation = messageValidator.validate(message);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 4. Store message and keys
      await messageStoreService.saveMessage(message);
      await keyManager.saveKeypair(messageId, keypair);

      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ... other methods
}

export const messageManager = new MessageManager();
```

### Store Pattern (Zustand)

```typescript
// src/stores/messageStore.ts

import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { messageManager } from '../services/messageManager';

interface MessageStore {
  // State
  messages: MutualAidMessage[];
  loading: boolean;
  error: string | null;

  // Actions
  createNeed: (params: CreateNeedParams) => Promise<Result<MutualAidMessage>>;
  addMessage: (message: MutualAidMessage) => void;

  // Selectors
  getMessageById: (id: string) => MutualAidMessage | undefined;
}

export const useMessageStore = create<MessageStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        messages: [],
        loading: false,
        error: null,

        // Actions
        createNeed: async (params) => {
          set({ loading: true, error: null });
          const result = await messageManager.createNeed(params);

          if (result.success) {
            get().addMessage(result.data);
          } else {
            set({ error: result.error });
          }

          set({ loading: false });
          return result;
        },

        addMessage: (message) => {
          set((state) => ({ messages: [...state.messages, message] }));
        },

        // Selectors
        getMessageById: (id) => {
          return get().messages.find((msg) => msg.message_id === id);
        },
      }),
      { name: 'message-store' }
    )
  )
);
```

### Screen Pattern

```typescript
// src/screens/HomeScreen.tsx

import React, { useEffect } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { MessageCard, Button } from '../components';
import { useMessageStore } from '../stores/messageStore';
import { useNavigation } from '@react-navigation/native';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const messages = useMessageStore((state) => state.messages);
  const loading = useMessageStore((state) => state.loading);
  const loadMessages = useMessageStore((state) => state.loadMessages);

  useEffect(() => {
    loadMessages();
  }, []);

  const handleMessagePress = (message: MutualAidMessage) => {
    navigation.navigate('MessageDetail', { messageId: message.message_id });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <MessageCard message={item} onPress={handleMessagePress} />
        )}
        keyExtractor={(item) => item.message_id}
        refreshing={loading}
        onRefresh={loadMessages}
      />

      <View style={styles.bottomButtons}>
        <Button
          title="Make Request"
          onPress={() => navigation.navigate('RequestWizard')}
        />
        <Button
          title="Make Offer"
          onPress={() => navigation.navigate('OfferWizard')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
});
```

## TypeScript Patterns

### Type Definitions

```typescript
// src/types/message.ts

// Auto-generated from MessageSchema.json
export type MessageType = 'NEED' | 'OFFER' | 'COORDINATION' | 'COMPLETION' | 'REVOCATION';

export type PrimaryCategory =
  | 'FOOD'
  | 'WATER'
  | 'SHELTER'
  | 'CLOTHING'
  // ... rest of categories

export interface MutualAidMessage {
  message_id: string;
  version: number;
  type: MessageType;
  timestamp: string;
  in_response_to: string | null;
  hop_count?: number;
  public: PublicMessageData;
  coordination_key?: string;
  encrypted_payloads?: EncryptedPayload[];
  metadata?: MessageMetadata;
}

// ... rest of types
```

### Result Type (for Error Handling)

```typescript
// src/types/common.ts

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Usage
async function doSomething(): Promise<Result<string>> {
  if (success) {
    return { success: true, data: 'result' };
  } else {
    return { success: false, error: 'error message' };
  }
}

// Consuming
const result = await doSomething();
if (result.success) {
  console.log(result.data); // TypeScript knows this exists
} else {
  console.error(result.error); // TypeScript knows this exists
}
```

### Type Guards

```typescript
// src/types/message.ts

export function isNeedMessage(message: MutualAidMessage): message is NeedMessage {
  return message.type === 'NEED';
}

export function isOfferMessage(message: MutualAidMessage): message is OfferMessage {
  return message.type === 'OFFER';
}

// Usage
if (isNeedMessage(message)) {
  // TypeScript knows message is NeedMessage here
}
```

## Import Order

Organize imports in this order:

```typescript
// 1. React/React Native
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Third-party libraries
import { useNavigation } from '@react-navigation/native';
import create from 'zustand';

// 3. Services
import { messageManager } from '../services/messageManager';
import { bleManager } from '../services/ble/bleManager';

// 4. Stores
import { useMessageStore } from '../stores/messageStore';

// 5. Components
import { Button, MessageCard } from '../components';

// 6. Types
import { MutualAidMessage, MessageType } from '../types/message';

// 7. Constants
import { CATEGORIES } from '../constants/categories';

// 8. Utils
import { calculateDistance } from '../utils/distance';

// 9. Styles (if in separate file)
import styles from './HomeScreen.styles';
```

## Comments and Documentation

### JSDoc for Functions

```typescript
/**
 * Calculate distance between two geographic coordinates
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Implementation...
}
```

### Inline Comments

```typescript
// Use inline comments to explain WHY, not WHAT
// ✅ Good: Explains reasoning
// Round to 3 decimal places to prevent location fingerprinting
const roundedLat = Math.round(lat * 1000) / 1000;

// ❌ Bad: Just describes code
// Round the latitude
const roundedLat = Math.round(lat * 1000) / 1000;
```

### TODO Comments

```typescript
// TODO(username): Add rate limiting to prevent spam
// FIXME: This validation doesn't handle edge case X
// NOTE: This must match the validation in ValidationRules.js
```

## Testing Structure

```typescript
// src/services/validation/__tests__/messageValidator.test.ts

import { messageValidator } from '../messageValidator';
import { mockNeedMessage } from '../../__mocks__/messages';

describe('messageValidator', () => {
  describe('validate', () => {
    it('should validate correct NEED message', () => {
      // Arrange
      const message = mockNeedMessage;

      // Act
      const result = messageValidator.validate(message);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should reject message with missing required fields', () => {
      // ... test implementation
    });
  });

  describe('validatePayloadSize', () => {
    // ... more tests
  });
});
```

## Git Workflow

### Branch Naming

```
feature/message-validation
fix/ble-connection-timeout
refactor/crypto-service
test/coordination-flow
docs/architecture-update
```

### Commit Messages

```
feat: Add message validation service
fix: Resolve BLE connection timeout
refactor: Simplify crypto service interface
test: Add coordination flow integration tests
docs: Update architecture with BLE details
chore: Update dependencies
```

## Environment Configuration

```typescript
// src/config/env.ts

export const config = {
  // BLE
  bleServiceUUID: '0000FE01-0000-1000-8000-00805F9B34FB',
  bleCharacteristicUUID: '0000FE02-0000-1000-8000-00805F9B34FB',
  bleMTU: 512,

  // Message settings
  maxMessageSize: 10000,
  maxHopCount: 10,
  messageExpiration: {
    NEED: 7 * 24 * 60 * 60 * 1000, // 7 days
    OFFER: 7 * 24 * 60 * 60 * 1000,
    COORDINATION: 2 * 24 * 60 * 60 * 1000, // 2 days
  },

  // Storage
  maxMessages: 500,
  maxSeenMessages: 1000,

  // Crypto
  payloadPaddingIncrement: 256,

  // Debug
  enableLogging: __DEV__,
};
```

## Best Practices

1. **One component per file** (exceptions for very small helper components)
2. **Export at declaration** (prefer `export const Foo` over separate export)
3. **Use TypeScript strict mode** (no implicit any)
4. **Avoid default exports** (prefer named exports for better refactoring)
5. **Keep files small** (< 300 lines; split if larger)
6. **Co-locate tests** with source code (`__tests__` directory)
7. **Use absolute imports** for src (`@/services/...`) - configure in tsconfig
8. **Barrel exports** for component directories
9. **Immutable updates** in stores (Zustand requires this)
10. **Pure functions** where possible (easier to test)

## File Templates

### Component Template

```typescript
// src/components/NewComponent.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NewComponentProps {
  // Define props
}

export const NewComponent: React.FC<NewComponentProps> = ({ ...props }) => {
  return (
    <View style={styles.container}>
      <Text>NewComponent</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Styles
  },
});
```

### Service Template

```typescript
// src/services/newService.ts

import { Result } from '../types/common';

/**
 * Service description
 */
class NewService {
  /**
   * Method description
   */
  async doSomething(param: string): Promise<Result<string>> {
    try {
      // Implementation
      return { success: true, data: 'result' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const newService = new NewService();
```

### Test Template

```typescript
// src/services/__tests__/newService.test.ts

import { newService } from '../newService';

describe('newService', () => {
  describe('doSomething', () => {
    it('should do something successfully', async () => {
      // Arrange
      const input = 'test';

      // Act
      const result = await newService.doSomething(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe('expected');
    });

    it('should handle errors gracefully', async () => {
      // ... error test
    });
  });
});
```

## Summary

Following this project structure ensures:
- **Consistency**: Code is predictable and easy to navigate
- **Maintainability**: Changes are localized and easy to make
- **Testability**: Clear boundaries make testing straightforward
- **AI-Friendly**: Claude Code can easily understand and modify code
- **Scalability**: Structure supports growth without reorganization

All new code should follow these patterns for consistency across the codebase.
