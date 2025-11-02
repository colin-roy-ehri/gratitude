# Phase 3: APK Self-Sharing Feature

## Overview

The Gratitude app now includes the ability to share its own APK file with other Android devices, enabling decentralized peer-to-peer distribution. This feature is essential for the mutual aid use case, allowing users to spread the app at events, protests, or community gatherings without relying on centralized app stores.

## Features Implemented

### ✅ Sprint 1: Basic APK Sharing (Completed)

1. **Native Module (ApkUtilsModule.kt)**
   - Get APK file path from installed app
   - Extract APK metadata (version, size, package name)
   - Compute SHA-256 signature fingerprint
   - Verify APK signatures

2. **TypeScript Service Layer**
   - `apkSharingService.ts` - Handle APK sharing via Android share sheet
   - `apkVerificationService.ts` - Cryptographic signature verification
   - Type definitions in `types.ts`

3. **User Interface**
   - `ShareApkScreen.tsx` - Full-featured UI for sharing the app
   - Displays APK info, version, size, and signature
   - One-tap sharing via Android share sheet
   - Instructions for recipients

4. **Android Configuration**
   - FileProvider setup for secure file sharing
   - Permissions: REQUEST_INSTALL_PACKAGES
   - file_paths.xml configuration

5. **Navigation**
   - Simple tab bar in App.tsx
   - Toggle between "BLE Test" and "Share App" screens

## How It Works

### Sharing Flow

```
User taps "Share App"
    ↓
App reads its own APK file path
    ↓
Generates metadata (version, size, signature)
    ↓
Opens Android share sheet
    ↓
User selects sharing method:
  • Nearby Share (WiFi Direct/BLE)
  • Bluetooth
  • Email, messaging, etc.
    ↓
Recipient receives APK file
    ↓
(Future) App verifies signature
    ↓
Recipient installs app
```

### Security Model

**Signature Verification:**
- Every APK is signed with a cryptographic certificate
- The app extracts the SHA-256 fingerprint of its own signature
- This fingerprint is displayed to users for manual verification
- (Phase 3 Sprint 2) Automatic verification before installation

**Trust Chain:**
```
EAS Build Server
  Signs APK with your key
    ↓
User 1 downloads from EAS
  Gets legitimate signed APK
    ↓
User 1 shares to User 2
  Via Nearby Share/Bluetooth
    ↓
User 2's app verifies signature
  Compares against embedded trusted signature
    ↓
Installation allowed if signature matches
```

**Security Limitations (Important):**
- The trusted signature is embedded in the app code
- Attackers can decompile and replace it
- This is NOT foolproof security
- It raises the bar and works well for mutual aid use case
- Initial distribution must be from trusted source (your EAS build)

## Usage Instructions

### For App Sharers (User 1)

1. **Open the Gratitude app**
2. **Tap "📤 Share App" tab**
3. **Review app information:**
   - Version number
   - File size
   - Signature fingerprint
4. **Tap "📤 Share App via Android Share"**
5. **Select sharing method:**
   - **Nearby Share** (recommended for in-person)
   - **Bluetooth** (works without internet)
   - Email/messaging (for remote sharing)
6. **Complete the transfer**

### For App Receivers (User 2)

1. **Accept the file transfer** (APK file)
2. **Tap the downloaded APK** to install
3. **Enable "Install from Unknown Sources"** if prompted:
   - Settings → Security → Unknown Sources → Enable
4. **(Future) App shows signature verification screen**
5. **Tap "Install"** when ready
6. **Grant app permissions** when prompted

## File Structure

```
src/
├── services/
│   └── apk/
│       ├── apkSharingService.ts       # Share APK logic
│       ├── apkVerificationService.ts  # Verify signatures
│       └── types.ts                    # APK-related types
└── screens/
    └── ShareApkScreen.tsx             # Share UI

android/app/src/main/java/com/gratitude/app/
├── ApkUtilsModule.kt                  # Native APK utilities
└── ApkUtilsPackage.kt                 # Register module

android/app/src/main/
├── AndroidManifest.xml                # Permissions & FileProvider
└── res/xml/file_paths.xml             # FileProvider paths
```

## Technical Details

### Native Module Methods

**ApkUtilsModule.kt** exposes these methods to React Native:

```kotlin
getApkPath(): Promise<string>
// Returns: "/data/app/.../base.apk"

getApkSize(): Promise<number>
// Returns: size in bytes

getSignatureFingerprint(): Promise<string>
// Returns: "A1:B2:C3:..." (SHA-256 hex string)

getApkInfo(): Promise<ApkInfo>
// Returns: { packageName, versionName, versionCode, apkPath, sizeBytes, sizeMB }

getShareableApkUri(): Promise<string>
// Returns: "content://com.gratitude.app.fileprovider/..." (FileProvider URI)
// Used for sharing - works on Android 7.0+ without FileUriExposedException

verifyApkSignature(apkPath: string, expectedFingerprint: string): Promise<VerificationResult>
// Returns: { fingerprint, isValid, expectedFingerprint }
```

### Sharing Methods Available

When user taps "Share App", Android shows share sheet with:

1. **Nearby Share** (Android 6.0+)
   - Uses WiFi Direct or Bluetooth
   - Automatic protocol selection
   - Fast for large files

2. **Bluetooth File Transfer**
   - Classic Bluetooth (not BLE)
   - Works on all Android devices
   - Slower but universal

3. **Other Apps**
   - Email clients
   - Messaging apps (WhatsApp, Signal, etc.)
   - Cloud storage (Drive, Dropbox, etc.)
   - File sharing apps

## Configuration

### Setting Up Signature Verification

**After building your first signed APK:**

1. **Build APK with EAS:**
   ```bash
   ./dev_deploy.sh
   ```

2. **Install on device and open "Share App" tab**

3. **Copy the signature fingerprint shown**

4. **Edit `src/services/apk/apkVerificationService.ts`:**
   ```typescript
   export const TRUSTED_SIGNATURE_FINGERPRINT: string =
     'A1:B2:C3:D4:E5:F6:...'; // Paste your signature here

   export const SIGNATURE_VERIFICATION_ENABLED: boolean = true;
   ```

5. **Rebuild the app** - all future builds will verify signatures

### Permissions Required

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
```

Already included in AndroidManifest.xml.

## Testing

### Test Scenario 1: Nearby Share

**You'll need:**
- 2 Android devices
- Both devices have Location enabled
- Both devices have Bluetooth enabled

**Steps:**
1. Device 1: Build and install APK
2. Device 1: Open app → "Share App" tab
3. Device 1: Tap "Share App via Android Share"
4. Device 1: Select "Nearby Share"
5. Device 2: Accept the transfer
6. Device 2: Tap the APK file to install
7. Device 2: Grant permissions and install

**Expected Result:**
- Transfer completes successfully
- APK installs on Device 2
- App functions normally on Device 2

### Test Scenario 2: Bluetooth

Same as above, but select "Bluetooth" instead of "Nearby Share".

**Note:** Bluetooth transfer is slower (~1-2 MB/min) but more universal.

### Test Scenario 3: Signature Verification (Future)

1. Modify the APK (add a byte, change something)
2. Try to install modified APK
3. **Expected:** Verification screen shows "❌ Invalid Signature"
4. **Expected:** User is warned not to install

## Known Limitations

### Current Phase

1. **No automatic verification UI yet** - Sprint 2 work
2. **Manual signature comparison** - Users must check fingerprints themselves
3. **APK Reception not detected** - App doesn't auto-open for received APKs yet

### General Limitations

1. **Android Only**
   - iOS doesn't support sideloading
   - Use TestFlight for iOS (centralized)

2. **Large File Size**
   - APK is ~20-50 MB
   - Bluetooth transfers can be slow
   - Nearby Share mitigates this with WiFi Direct

3. **Security Trade-offs**
   - Embedded signature can be replaced by attackers
   - Not suitable for high-security applications
   - Good enough for mutual aid use case

4. **User Education Required**
   - Users must understand "Install from Unknown Sources"
   - Users should verify signature fingerprints
   - Initial download must be from trusted source

## Next Steps (Sprint 2)

### Planned Features

1. **ApkVerificationScreen.tsx**
   - Show signature verification UI
   - Display both signatures side-by-side
   - Color-coded verification result
   - "Install" button only if verified

2. **ApkReceiverModule.kt**
   - Detect incoming APK files
   - Auto-trigger verification
   - Deep link to verification screen

3. **Installation Flow**
   - Request install permission
   - Trigger installation after verification
   - Handle permission denial gracefully

4. **Error Handling**
   - Better error messages
   - Recovery suggestions
   - Offline support

## Troubleshooting

### "APK sharing is only available on Android"

**Problem:** Trying to share on iOS or web
**Solution:** This feature only works on Android devices

### "Failed to share APK: Attempt to invoke virtual method on a null object reference"

**Problem:** This was an issue in the initial implementation where we used `file://` URIs
**Solution:** ✅ **FIXED** - Now using FileProvider with `content://` URIs
**Details:** Android 7.0+ (API 24+) requires FileProvider for sharing files from private app directories. The `getShareableApkUri()` method now generates proper `content://` URIs.

### "Failed to share APK"

**Problem:** FileProvider not configured correctly
**Solution:**
1. Check `AndroidManifest.xml` has FileProvider
2. Check `res/xml/file_paths.xml` exists
3. Rebuild app

### "Install blocked"

**Problem:** Android blocked installation from unknown source
**Solution:**
1. Go to Settings → Security
2. Enable "Unknown Sources" or "Install Unknown Apps"
3. Grant permission to file manager/browser
4. Try installing again

### Nearby Share not appearing

**Problem:** Device doesn't support Nearby Share
**Solution:**
- Requires Android 6.0+ with Google Play Services
- Fall back to Bluetooth
- Or use email/messaging

### Transfer fails mid-way

**Problem:** Connection interrupted
**Solution:**
- Keep devices close together
- Don't lock screens during transfer
- Retry the transfer

## Documentation

- **This file:** Phase 3 implementation details
- **ANDROID_BUILD_FIXES.md:** Build configuration and troubleshooting
- **BUILDING_APK.md:** How to build APKs with EAS
- **DEPLOY_SCRIPTS.md:** Quick deployment guide

## Success Metrics

✅ User can tap "Share App" and see share sheet
✅ Nearby Share and Bluetooth appear as options
✅ APK transfers successfully between devices
✅ Recipient can install the received APK
✅ Signature fingerprint is displayed correctly
✅ App includes instructions for recipients

## Future Enhancements

### Short Term (Sprint 2)
- Automatic signature verification on receive
- Installation prompt after verification
- Better error handling

### Medium Term
- QR code sharing (device hosts web server, recipient scans)
- Offline APK repository (keep multiple versions)
- Verified sharer list (trusted community members)

### Long Term
- P2P update distribution
- Version checking and auto-update
- Signature revocation list
- Multi-signature verification (community signing)

## Contributing

When adding features to APK sharing:

1. **Update this document** with new features
2. **Add tests** for native modules
3. **Update UI** with clear instructions
4. **Consider security implications**
5. **Test on multiple Android versions**

## License

Same as main project - supporting decentralized mutual aid networks.
