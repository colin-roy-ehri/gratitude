# Gratitude - Mutual Aid Coordination App

A privacy-focused, offline-first mutual aid coordination app using BLE mesh networking. Connect with neighbors to share resources, offer help, and coordinate exchanges—all without requiring internet connectivity or centralized servers.

## Project Status

**Current Phase**: Phase 0 Complete - Architecture & Foundation
**Next Phase**: Phase 1 - Core Message System

## Architecture

This project follows a systematic implementation plan with clear phases. See the architecture documents for detailed information:

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design, module boundaries, data flow
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - Zustand stores structure and patterns
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Error taxonomy and recovery strategies
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) - Unit/integration test approach
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File organization and coding conventions

## Key Features

- **Privacy First**: Adaptive location precision, end-to-end encryption, gradual disclosure
- **Offline Capable**: BLE mesh networking, no internet required
- **Accessible**: Designed for users with limited literacy, tech experience, or disabilities
- **Dignified**: No charity mechanics, equal treatment of needs and offers
- **Secure**: X25519 + XSalsa20-Poly1305 encryption, 256-byte payload padding

## Tech Stack

- **React Native** (Expo bare workflow)
- **TypeScript** (strict mode)
- **Zustand** (state management)
- **BLE Manager** (Bluetooth Low Energy)
- **libsodium** (cryptography)
- **AsyncStorage** (persistence)
- **Jest** (testing)

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Android SDK (for Android development)
- Physical Android device (for BLE testing)

## Installation

```bash
# Install dependencies
npm install

# Install Expo CLI globally (if not already installed)
npm install -g expo-cli

# For Android development, ensure you have:
# - Android Studio installed
# - Android SDK configured
# - An Android device or emulator
```

## Development

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint

# Fix lint issues
npm run lint:fix
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── constants/        # App-wide constants
├── hooks/            # Custom React hooks
├── navigation/       # React Navigation setup
├── screens/          # Top-level screen components
├── services/         # Business logic (stateless)
│   ├── ble/          # BLE networking services
│   ├── crypto/       # Cryptography services
│   ├── storage/      # Storage abstractions
│   └── validation/   # Message validation
├── stores/           # Zustand state management
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## Implementation Plan

### ✅ Phase 0: Architecture & Foundation (Days 1-3)
- Architecture documents
- Project scaffolding
- TypeScript configuration
- Testing infrastructure

### 🔄 Phase 1: Core Message System (Days 4-7)
- TypeScript types from schema
- Message validation
- Local storage
- Message manager

### ⏳ Phase 2: BLE Proof of Concept (Days 8-13)
- BLE manager
- Message serialization
- Message relay
- Device discovery

### ⏳ Phase 3: Cryptography (Days 14-17)
- Key management
- Encryption/decryption
- Multi-payload encryption

### ⏳ Phase 4: Minimal UI (Days 18-22)
- Basic navigation
- Request/offer wizards
- Message list

### ⏳ Phase 5: Coordination Flow (Days 23-26)
- Accept offer
- Share encrypted details
- Message thread

### ⏳ Phase 6: Android APK (Days 27-30)
- Build APK
- Permissions handling
- Sideload testing

## Testing

The project follows a comprehensive testing strategy:

- **Unit Tests** (80% coverage target): All services, stores, and utilities
- **Integration Tests** (15%): Cross-service interactions
- **BLE Tests** (5%): Real device testing for Bluetooth functionality

Run tests with:
```bash
npm test
```

## Privacy & Security

This app is designed with privacy as a core principle:

- **No central server**: All data stays on devices
- **End-to-end encryption**: Coordination details encrypted per-recipient
- **Adaptive location precision**: Based on network density
- **Payload padding**: All encrypted data padded to 256-byte increments
- **Ephemeral keys**: Per-message keys for deniability
- **No tracking**: No analytics, no user IDs, no logging of sensitive data

## Contributing

This is currently in POC (Proof of Concept) phase. Contributions will be welcomed after initial testing with local dev network.

## License

See [LICENSE](./LICENSE) file for details.

## Contact

For questions or feedback, please open an issue on GitHub.

---

**Note**: This app uses Bluetooth Low Energy (BLE) which requires testing on real Android devices. Simulators/emulators do not support BLE functionality.
