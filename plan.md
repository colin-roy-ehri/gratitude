Step 1.2: Define Core Types
File: src/types/message.ts
typescript// Convert JSON schema to TypeScript interfaces
// Define all message types, category enums, attribute types
// Export types for use throughout app
Deliverable: Complete TypeScript type definitions matching JSON schema
Step 1.3: Create JSON Schema Validator
File: src/utils/validation.ts
typescript// Import message-schema.json
// Create Ajv validator instance
// Export validateMessage() function
// Add custom validation for privacy rules (location precision, etc.)
Deliverable: Message validation that enforces schema
Step 1.4: Define Category Constants
File: src/constants/categories.ts
typescript// Define all primary categories with icons
// Define secondary categories per primary
// Define attribute options per category (dietary, size, etc.)
// Export as strongly-typed constants
Deliverable: Complete category system as TypeScript constants
Phase 2: Local Storage & Message Management (Days 4-6)
Step 2.1: Storage Service
File: src/services/storage/messageStore.ts
typescript// Create MessageStore class
// Methods:
//   - saveMessage(message)
//   - getMessage(id)
//   - getMessages(filter)
//   - deleteMessage(id)
//   - getAllMessages()
// Use AsyncStorage for persistence
// Index by message_id and type
Deliverable: Persistent local message storage
Step 2.2: Key Storage Service
File: src/services/storage/keyStore.ts
typescript// Create KeyStore class
// Methods:
//   - saveKeypair(messageId, publicKey, encryptedPrivateKey)
//   - getKeypair(messageId)
//   - deleteKeypair(messageId)
// Encrypt private keys with device key
// Use AsyncStorage for persistence
Deliverable: Secure key storage
Step 2.3: Message Manager
File: src/services/messageManager.ts
typescript// Create MessageManager class
// Coordinates storage, validation, encryption
// Methods:
//   - createNeedMessage(params)
//   - createOfferMessage(params)
//   - createCoordinationMessage(params)
//   - getMyMessages()
//   - getActiveCoordinations()
Deliverable: High-level message management
Phase 3: Cryptography (Days 7-10)
Step 3.1: Key Generation
File: src/services/crypto/keyManagement.ts
typescript// Use react-native-sodium
// Methods:
//   - generateKeypair() // X25519
//   - generateDeviceKey() // From secure random + device ID
//   - deriveEncryptionKey(password)
Deliverable: Cryptographic key generation
Step 3.2: Basic Encryption
File: src/services/crypto/encryption.ts
typescript// Methods:
//   - encrypt(plaintext, recipientPublicKey, nonce)
//   - decrypt(ciphertext, myPrivateKey, nonce)
//   - generateNonce()
// Use libsodium box (X25519 + XSalsa20-Poly1305)
Deliverable: Basic encryption/decryption
Step 3.3: Multi-Payload Encryption
File: src/services/crypto/messageEncryption.ts
typescript// Methods:
//   - encryptForMultipleRecipients(content, recipientKeys[])
//   - decryptPayloads(encryptedPayloads[], myPrivateKey)
//   - padPayload(plaintext) // Pads to next 256-byte increment
//   - createEncryptedPayload(content, recipientKey)
// Returns array of {recipient_key, nonce, payload, payload_size}
// Note: All payloads padded to 256-byte increments (256, 512, 768, 1024, etc.)
Deliverable: Multi-recipient message encryption
Step 3.4: Encryption Integration Tests
File: src/services/crypto/__tests__/encryption.test.ts
typescript// Test:
//   - Key generation
//   - Encrypt/decrypt round-trip
//   - Multi-payload encryption
//   - Payload padding
//   - Wrong key fails to decrypt
Deliverable: Tested crypto implementation
Phase 4: BLE Networking (Days 11-15)
Step 4.1: BLE Manager Setup
File: src/services/ble/bleManager.ts
typescript// Initialize BLE manager
// Methods:
//   - startAdvertising(serviceUUID)
//   - stopAdvertising()
//   - startScanning()
//   - stopScanning()
//   - onDeviceDiscovered(callback)
//   - sendMessage(deviceId, message)
//   - onMessageReceived(callback)
Deliverable: Basic BLE communication
Step 4.2: Message Serialization
File: src/services/ble/serialization.ts
typescript// Methods:
//   - serializeMessage(message) // JSON to Buffer
//   - deserializeMessage(buffer) // Buffer to JSON
//   - chunkMessage(buffer, mtu) // Split large messages
//   - reassembleChunks(chunks[]) // Combine chunks
Deliverable: BLE-compatible message format
Step 4.3: Message Relay Logic
File: src/services/ble/messageRelay.ts
typescript// Create MessageRelay class
// Methods:
//   - onMessageReceived(message)
//   - shouldRelay(message) // Check expiration, seen before, etc.
//   - scheduleRebroadcast(message, delay)
//   - selectMessagesToRelay() // Choose which messages to forward
// Implements flooding/relay strategy
Deliverable: Message propagation system
Step 4.4: Device Discovery
File: src/services/ble/deviceDiscovery.ts
typescript// Methods:
//   - getNearbyDeviceCount()
//   - getActiveDevices()
//   - isDeviceNearby(deviceId)
// Track nearby devices for density calculation
Deliverable: Peer awareness
Phase 5: Matching & Privacy (Days 16-18)
Step 5.1: Network Density Calculator
File: src/services/matching/densityCalculator.ts
typescript// Methods:
//   - calculateDensityScore()
//   - getRecommendedPrecision()
//   - canBroadcastSafely()
// Uses: nearby device count, message volume, geographic diversity
Deliverable: Adaptive privacy based on network density
Step 5.2: Message Matcher
File: src/services/matching/matcher.ts
typescript// Methods:
//   - findMatchesForRequest(requestMessage)
//   - findMatchesForOffer(offerMessage)
//   - calculateMatchScore(request, offer)
// Matches based on category, location, time, attributes
Deliverable: Request/offer matching algorithm
Step 5.3: Location Privacy Utils
File: src/utils/privacy.ts
typescript// Methods:
//   - roundLocationToPrecision(lat, lon, precision)
//   - formatLocationForBroadcast(coords, densityScore)
//   - isLocationSafeToShare(densityScore)
Deliverable: Location privacy helpers
Phase 6: Basic UI (Days 19-25)
Step 6.1: Component Library
Files: src/components/
typescript// Create reusable components:
//   - CategoryIcon.tsx (emoji/icon for each category)
//   - MessageCard.tsx (display request/offer)
//   - WizardStep.tsx (wizard step container)
//   - TimeSelector.tsx (time window picker)
//   - LocationDisplay.tsx (show approximate location)
Deliverable: Reusable UI components
Step 6.2: Home Screen
File: src/screens/HomeScreen.tsx
typescript// Tabs: Requests | Offers | Activity
// Display list of messages
// Filter by type
// Pull to refresh
// Show empty state with QR code
// Buttons: Make Request, Make Offer
Deliverable: Main browsing interface
Step 6.3: Request Wizard (Steps 1-5)
Files: src/screens/RequestWizard/
typescript// Step1_ChooseCategory.tsx
// Step2_SpecifyType.tsx (category-specific attributes)
// Step3_ChooseTime.tsx
// Step4_LocationPrivacy.tsx
// Step5_Review.tsx
// WizardContainer.tsx (manages state, navigation)
Deliverable: Complete request creation flow
Step 6.4: Offer Wizard
Files: src/screens/OfferWizard/
typescript// Similar structure to Request Wizard
// Category-specific attribute selection
// Especially detailed for Coordination/Broker offers
Deliverable: Complete offer creation flow
Step 6.5: Message Detail View
File: src/screens/MessageDetailScreen.tsx
typescript// Display full message details
// Show map with approximate location
// Show all attributes
// If offer: button to "Accept & Coordinate"
// If request: button to "Offer Help"
Deliverable: Detailed message view
Phase 7: Coordination Flow (Days 26-30)
Step 7.1: Match List View
File: src/screens/MatchesScreen.tsx
typescript// Show all responses to user's request
// Display offer details
// Decrypt and show encrypted payloads
// Button to accept and coordinate
Deliverable: View multiple offers
Step 7.2: Coordination Form
File: src/screens/CoordinationForm.tsx
typescript// Choose recipient(s)
// Select time from their availability
// Enter location details (building/floor/unit OR map pin)
// Enter identification details (checkboxes)
// Optional: contact name
// Optional: add broker
// Send button creates encrypted coordination message
Deliverable: Create coordination with encrypted details
Step 7.3: Coordination View
File: src/screens/CoordinationScreen.tsx
typescript// Show active coordination
// Display meeting details
// Mini-chat for coordination messages
// Mark as complete button
// Option to add broker mid-coordination
Deliverable: Manage active coordination
Step 7.4: My Activity Screen
File: src/screens/MyActivityScreen.tsx
typescript// Tabs: My Requests | My Offers
// Show active and completed
// Quick actions (view, message, complete)
Deliverable: User's activity dashboard
Phase 8: Maps & Location (Days 31-33)
Step 8.1: Map Integration
File: src/components/MapView.tsx
typescript// Use react-native-maps with OpenStreetMap
// Display approximate location circle
// Allow precise pin placement
// Show nearby brokers/meeting spots
Deliverable: Map display and pin selection
Step 8.2: Location Selector
File: src/components/LocationSelector.tsx
typescript// Radio: Building numbers OR Map pin
// Building/Floor/Unit inputs (2-char validation)
// Map pin button opens map
// Preview of what others will see
Deliverable: Location input component
Phase 9: Broker System (Days 34-36)
Step 9.1: Broker Selection
File: src/components/BrokerSelector.tsx
typescript// List available brokers
// Show broker details (location, hours, languages)
// Select one or more brokers
// Explain what broker will see
Deliverable: Broker selection UI
Step 9.2: Multi-Recipient Coordination
File: src/services/coordination/multiRecipient.ts
typescript// Methods:
//   - createCoordinationForMultiple(details, recipients[])
//   - customizePayloadForRecipient(details, recipient, role)
//   - sendToAllRecipients(message)
// Creates different encrypted payloads per recipient
Deliverable: Multi-party coordination logic
Step 9.3: Broker Dashboard (Optional)
File: src/screens/BrokerDashboard.tsx
typescript// View coordinations where user is broker
// See context of exchanges (if granted access)
// Send messages to coordination parties
Deliverable: Broker view of active coordinations
Phase 10: Good News & Growth (Days 37-39)
Step 10.1: Activity Feed
File: src/screens/ActivityScreen.tsx
typescript// Display completion messages
// Show anonymized summaries
// Weekly statistics
// Encouraging messaging
Deliverable: Community activity view
Step 10.2: QR Code Generation
File: src/components/QRCodeDisplay.tsx
typescript// Generate QR code for app download
// Include location-specific identifier (optional)
// Share button (save image, print, send)
// Printable poster format
Deliverable: Network growth tool
Step 10.3: Onboarding Flow
File: src/screens/OnboardingScreen.tsx
typescript// Welcome screen
// 3-slide explanation (swipeable)
// Skip button
// Get started button
// Show on first launch only
Deliverable: First-time user experience
Phase 11: Polish & Optimization (Days 40-45)
Step 11.1: Accessibility

Screen reader support (add labels)
High contrast mode
Large text support
Voice input for names
Haptic feedback

Step 11.2: Error Handling

Network disconnection handling
Message validation errors
Decryption failures
Storage errors
User-friendly error messages

Step 11.3: Performance

Optimize BLE scanning/advertising
Lazy load message lists
Cache decrypted payloads
Optimize re-renders
Battery usage optimization

Step 11.4: Testing

Unit tests for all services
Integration tests for flows
Manual testing on real devices
Multi-device BLE testing
Stress testing (many messages)

Step 11.5: Documentation

README with setup instructions
Architecture documentation
Message format documentation
Privacy model explanation
User guide

Phase 12: Deployment Prep (Days 46-50)
Step 12.1: Build Configuration

iOS app bundle
Android APK/AAB
App icons
Splash screen
App metadata

Step 12.2: Beta Testing

TestFlight (iOS)
Google Play Beta (Android)
Gather feedback
Fix critical bugs

Step 12.3: Release

App store submission
Website/landing page
QR code generation for distribution
Community outreach materials


Priority Decision Tree
At any point, if you need to make decisions about what to build next:

Can messages be created and stored? → Do Phase 1-2
Is coordination private? → Do Phase 3 (crypto)
Can messages propagate? → Do Phase 4 (BLE)
Is privacy adaptive? → Do Phase 5 (matching)
Can users create requests/offers? → Do Phase 6 (UI)
Can users coordinate? → Do Phase 7 (coordination)
Is location input easy? → Do Phase 8 (maps)
Can brokers help? → Do Phase 9 (brokers)
Does community feel alive? → Do Phase 10 (activity)
Is it polished? → Do Phase 11 (polish)


Testing Checkpoints
After each phase, verify:

 All TypeScript compiles without errors
 Existing tests still pass
 New functionality works on device
 No console errors or warnings
 Privacy guarantees maintained
 User experience intuitive


Key Implementation Notes

Always validate messages before storage or display
Never log decrypted payloads (security)
Pad all encrypted payloads to standard sizes (privacy)
Use TypeScript strict mode (safety)
Test on real devices for BLE (simulator won't work)
Clear sensitive data from memory after use
Handle offline gracefully (queue, sync later)
Keep UI simple (accessibility, dignity)


This plan takes a systematic approach, building from the foundation up. Each phase has clear deliverables and builds on previous work. The order ensures that core functionality (storage, crypto, networking) is solid before adding UI, and that basic flows work before adding advanced features (brokers, multi-recipient).