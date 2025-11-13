/**
 * MUTUAL AID MESSAGE FORMAT SPEC
 * Binary Compact Format v1.0
 * 
 * For React Native offline-first P2P applications
 */

// ============================================================================
// QUICK REFERENCE: SIZE BREAKDOWN
// ============================================================================

/*
Component                   Bytes    Notes
─────────────────────────────────────────────────────────────────
VERSION                       1      Format version (0x01)
FLAGS                         1      Message type + optional field flags
UNSPSC CODE                   4      Product/service classification
START TIMESTAMP               4      UTC Unix seconds
END TIMESTAMP                 4      UTC Unix seconds
LATITUDE                      4      Scaled int32 (×100,000)
LONGITUDE                     4      Scaled int32 (×100,000)
WINDOW COUNT                  1      Number of time windows (0-255)
WINDOWS                      5 each  Availability time blocks
ED25519 PUBLIC KEY           32      Sender verification key
─────────────────────────────────────────────────────────────────
SUBTOTAL (base, no optionals): ~64   bytes

OPTIONAL FIELDS (if present):
  qty                         2      Unit quantity
  uom                         1      Unit of measure (enum)
  size                        1      Size category (enum)
  floor                       2      Floor number (0-999)
  room                        2      Room number (0-9999)
  diet                        1      Diet code (0-9)
─────────────────────────────────────────────────────────────────
TOTAL (all optionals):       ~75     bytes
*/

// ============================================================================
// MESSAGE TYPE ENUM
// ============================================================================

enum MessageType {
  REQUEST = 0,   // Sender is offering/requesting availability
  RESPONSE = 1,  // Recipient's reply to REQUEST
  MATCH = 2,     // Both sides agree - potential transaction
}

// ============================================================================
// ENUMS FOR OPTIONAL FIELDS
// ============================================================================

// Unit of Measure
enum UnitOfMeasure {
  UNIT = 0,      // Individual items/servings
  KG = 1,        // Kilograms
  LB = 2,        // Pounds
  L = 3,         // Liters
  GAL = 4,       // Gallons
  CASE = 5,      // Case/box
  DOZEN = 6,
  MEAL = 7,
}

// Size category
enum SizeCode {
  SMALL = 0,
  MEDIUM = 1,
  LARGE = 2,
  XLARGE = 3,
  BULK = 4,
}

// Diet codes (0-9)
//  0 = No restrictions
//  1 = Vegan
//  2 = Vegetarian
//  3 = Gluten-free
//  4 = Dairy-free
//  5 = Halal
//  6 = Kosher
//  7 = Nut-free
//  8 = Low-sodium
//  9 = Other/custom

// ============================================================================
// AVAILABILITY WINDOW (CRON-LIKE)
// ============================================================================

/*
TimeWindow {
  startHour: 0-23        // Local time hour
  startMinute: 0-59      // Local time minute
  endHour: 0-23          // Local time hour
  endMinute: 0-59        // Local time minute
  daysOfWeek: 0x00-0x7F  // Bitmask for Sun-Sat
}

Days of week bitmask:
  Bit 0: Sunday
  Bit 1: Monday
  Bit 2: Tuesday
  Bit 3: Wednesday
  Bit 4: Thursday
  Bit 5: Friday
  Bit 6: Saturday

Examples:
  0x7F = 0111_1111 = Every day (Sunday through Saturday)
  0x3E = 0011_1110 = Monday through Friday (typical workweek)
  0x40 = 0100_0000 = Saturday only
  0x41 = 0100_0001 = Sunday and Saturday (weekend)
*/

// ============================================================================
// COORDINATE PRECISION
// ============================================================================

/*
Coordinates are stored as scaled int32 values:

  storage_value = coordinate_decimal * 100,000
  coordinate_decimal = storage_value / 100,000

Examples:
  40.7128°N = 4,071,280 (stored)
  -74.0060°W = -7,400,600 (stored)
  
Precision: ±0.00001° ≈ ±1.1 meters accuracy
This is sufficient for neighborhood-scale mutual aid coordination.
*/

// ============================================================================
// FLAGS BYTE BREAKDOWN
// ============================================================================

/*
FLAGS BYTE:
  Bits 0-1: Message Type
    00 = REQUEST
    01 = RESPONSE
    10 = MATCH
    11 = reserved

  Bits 2-7: Optional Field Presence Flags
    Bit 2: qty present
    Bit 3: uom present
    Bit 4: size present
    Bit 5: floor present
    Bit 6: room present
    Bit 7: diet present

Example FLAGS byte:
  0xC7 = 1100_0111
    Bits 0-1: 11 (decimal 3) = Message type RESERVED
    Bit 2: 1 = qty present ✓
    Bit 3: 1 = uom present ✓
    Bit 4: 1 = size present ✓
    Bit 5: 0 = floor not present
    Bit 6: 0 = room not present
    Bit 7: 1 = diet present ✓
*/

// ============================================================================
// REAL-WORLD EXAMPLE SCENARIOS
// ============================================================================

// Scenario 1: Food bank offering produce
// ─────────────────────────────────────
/*
Message: REQUEST (we're offering help)
UNSPSC: 50201506 (fresh produce)
Location: Food bank
Time windows:
  - 09:00-17:00 Monday-Friday (0x3E)
  - 14:00-16:00 Saturday (0x40)
Optional:
  - qty: 100 kg
  - uom: KG
  - floor: 0 (ground floor)

Size: ~64 bytes → fits easily in single BLE packet
*/

// Scenario 2: Individual requesting meals
// ────────────────────────────────────────
/*
Message: RESPONSE (we're requesting)
UNSPSC: 50201710 (prepared meals/takeout)
Location: 3rd floor apartment
Time windows:
  - 18:00-20:00 Daily (0x7F)
Optional:
  - qty: 5
  - uom: MEAL
  - floor: 3
  - room: 305
  - diet: 1 (vegan)

Size: ~70 bytes → still well under 512 byte limit
*/

// Scenario 3: Community garden offering surplus
// ──────────────────────────────────────────────
/*
Message: REQUEST (surplus available)
UNSPSC: 50201506 (fresh produce)
Time windows:
  - 10:00-16:00 Saturday-Sunday (0x41)
Optional:
  - qty: 200
  - uom: UNIT
  - size: BULK

Size: ~65 bytes
*/

// ============================================================================
// IMPLEMENTATION CONSIDERATIONS FOR REACT NATIVE
// ============================================================================

/*
1. SECURE STORAGE
   - Store user's Ed25519 private key in React Native Secure Storage
   - Use @react-native-community/hooks or Keychain
   - NEVER transmit private key in messages

2. BLE INTEGRATION
   - Use react-native-ble-plx or similar
   - Message fits in single BLE write (251 byte MTU standard)
   - Can include multiple messages in notification batches

3. SIGNING & VERIFICATION
   - Use libsodium (via expo-sodium or react-native-sodium) for Ed25519
   - Sign the serialized message bytes
   - Transmit signature separately or in envelope

4. TIME ZONES
   - Store windows in LOCAL time (not UTC)
   - Each client interprets based on their timezone
   - Use Intl.DateTimeFormat for display

5. PERFORMANCE
   - Serialization/deserialization is O(n) with small constant
   - No heavy parsing needed (pure binary)
   - ~1ms on modern phones for full round-trip

6. FORWARD COMPATIBILITY
   - Version byte (0x01) allows future format changes
   - Unknown optional flags should be skipped
   - Add new fields with new version number
*/

// ============================================================================
// UNSPSC EXAMPLES FOR MUTUAL AID
// ============================================================================

/*
Common UNSPSC codes:

50201506  - Fresh vegetables
50201507  - Fresh fruits
50201710  - Prepared meals, takeout
50201735  - Beverages (non-alcoholic)
72101505  - Medical supplies
72101506  - First aid kits
72101620  - Wheelchairs, mobility aids
48191503  - Clothing
48191504  - Footwear
72101702  - Hygiene products

Note: UNSPSC is a 8-digit hierarchical code
For simplicity, store as uint32 (allows 0-99999999)
*/

// ============================================================================
// TESTING & VALIDATION
// ============================================================================

/*
1. ROUND-TRIP TEST
   Create message → Serialize → Deserialize → Compare
   All fields should match exactly (within floating point tolerance)

2. SIZE VERIFICATION
   Measure serialized buffer length
   Verify ≤ 512 bytes
   Benchmark with various window counts

3. COORDINATE PRECISION
   Test coordinates near boundaries (±90/-180, etc.)
   Verify 5-decimal precision is maintained

4. OPTIONAL FIELD COMBINATIONS
   Test all 64 combinations of optional field flags
   Test with no optional fields
   Test with all optional fields

5. BLE COMPATIBILITY
   Test serialized output over actual BLE connection
   Verify round-trip over network

6. EDGE CASES
   Midnight transitions (23:59 → 00:00)
   All-day windows (00:00 → 23:59)
   Single-day windows (one-time offers)
*/

// ============================================================================
// MIGRATION / VERSION HANDLING
// ============================================================================

/*
If you need to extend this format in the future:

Current: version = 0x01
Future:  version = 0x02

Differences might include:
  - Additional optional fields
  - Extended coordinate precision
  - Signature inclusion in message
  - Multi-language labels
  - Priority/urgency flags

Decoder pseudocode:
  
  version = readByte(buffer, 0)
  
  if version == 0x01:
    return deserializeV1(buffer)
  elif version == 0x02:
    return deserializeV2(buffer)
  else:
    throw UnknownVersionError(version)

Keep old deserializers for backwards compatibility.
*/

// ============================================================================
// REFERENCES
// ============================================================================

/*
- Ed25519 standard: https://ed25519.cr.yp.to/
- UNSPSC classification: https://www.unspsc.org/
- BLE specification: https://www.bluetooth.com/
- Binary encoding: little-endian (Intel convention)
- Timezone handling: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
*/
