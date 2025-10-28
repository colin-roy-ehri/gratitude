# Building and Installing APK for Device Testing

## Prerequisites

Your system appears to be WSL2 on Windows. You have two main options:

### Option 1: Expo EAS Build (Recommended - Easiest)

Build in the cloud using Expo's build service. No local Android setup needed.

### Option 2: Local Build

Build locally using Android Studio and the Android SDK. Requires more setup.

---

## Option 1: Expo EAS Build (RECOMMENDED)

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
# If you don't have an account:
# eas register
```

### 3. Configure EAS Build

```bash
eas build:configure
```

This will create `eas.json` with build profiles.

### 4. Build Development APK

```bash
# Build a development APK (includes development tools)
eas build --platform android --profile development

# OR build a preview APK (more production-like, but still debuggable)
eas build --platform android --profile preview
```

The build happens in the cloud and typically takes 10-15 minutes.

### 5. Download APK

Once complete, EAS will provide a download URL. You can:

```bash
# Download to your computer
wget <URL-from-EAS> -O gratitude.apk

# Or scan QR code shown in terminal with your phone
```

### 6. Install on Galaxy S22

**Method A: USB Transfer**

1. Connect S22 to computer via USB
2. Copy APK to phone:
   ```bash
   # If using Windows + WSL2:
   cp gratitude.apk /mnt/c/Users/<YourUsername>/Downloads/
   # Then transfer from Windows to phone
   ```

3. On phone:
   - Open "My Files" or "Downloads"
   - Tap the APK file
   - Allow "Install from Unknown Sources" if prompted
   - Tap "Install"

**Method B: Direct Download on Phone**

1. Open the EAS build URL on your phone's browser
2. Download APK directly
3. Install from Downloads folder

---

## Option 2: Local Build (More Complex)

### 1. Install Android SDK

If you don't have Android Studio installed on Windows:

1. Download Android Studio: https://developer.android.com/studio
2. Install Android SDK (API level 33 or higher)
3. Set environment variables in Windows:
   ```
   ANDROID_HOME=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
   Add to PATH: %ANDROID_HOME%\platform-tools
   Add to PATH: %ANDROID_HOME%\tools
   ```

### 2. Configure WSL2 to Access Windows Android SDK

In WSL2, add to `~/.bashrc`:

```bash
export ANDROID_HOME=/mnt/c/Users/<YourUsername>/AppData/Local/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
```

Reload: `source ~/.bashrc`

### 3. Verify ADB Works

```bash
adb --version
# Should show Android Debug Bridge version
```

### 4. Build APK Locally

```bash
# Generate Android project
npx expo prebuild --platform android

# Build debug APK
cd android
./gradlew assembleDebug

# APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 5. Install via ADB

```bash
# Enable USB debugging on S22:
# Settings > Developer Options > USB Debugging

# Connect S22 via USB, then:
adb devices  # Verify device is connected
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Quick Start Guide (Recommended Path)

For fastest results, use EAS Build:

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login (create account if needed)
eas login

# 3. Initialize EAS
eas build:configure

# 4. Build development APK
eas build --platform android --profile development --local

# Use --local flag to build on your machine instead of cloud
# (still requires Android SDK but faster iteration)
```

**Note:** The `--local` flag requires Android SDK but is faster for testing iterations.

---

## Installing on Galaxy S22

### Enable Developer Mode

1. Go to **Settings > About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings > Developer Options**
4. Enable **USB Debugging**
5. Enable **Install via USB** (if available)

### Grant App Permissions

After installing, the app will request:

- ✅ **Bluetooth** - Required for mesh networking
- ✅ **Location** - Required by Android for BLE scanning
- ✅ **Nearby Devices** (Android 12+) - Required for BLE

**Grant ALL permissions** or BLE won't work.

### Enable Location Services

BLE scanning on Android requires location services to be ON:

1. Swipe down from top
2. Enable **Location**

---

## Testing Checklist

Once installed:

1. ✅ App launches without crashing
2. ✅ Bluetooth permissions granted
3. ✅ Location permission granted
4. ✅ Location services enabled
5. ✅ Bluetooth enabled
6. ✅ Tap "Start Scanning" - should show "Scanning: Yes"
7. ✅ No errors appear in error section

---

## Troubleshooting

### "Module not found" or build errors

```bash
# Clear caches and rebuild
rm -rf node_modules
npm install
npx expo prebuild --clean
```

### EAS build fails

Check `eas.json` exists and package.json has correct version:

```json
{
  "version": "0.1.0",
  "main": "index.js"
}
```

### Gradle error: "compile Java 9+ source, please set compileSdkVersion to 30 or above"

This has been fixed in the codebase. The following files have been configured:

- `android/gradle.properties` - Sets compileSdkVersion to 34
- `android/build.gradle` - Forces all subprojects to use SDK 34
- `android/app/build.gradle` - Java 11 compatibility settings
- `app.json` - Android SDK configuration
- `eas.json` - Build environment variables

If you still see this error, ensure you're using the latest code and try:

```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Rebuild with EAS
eas build --platform android --profile preview --clear-cache
```

### App crashes on launch

Check logs:
```bash
adb logcat | grep "Gratitude"
```

### BLE not working

1. Verify Bluetooth is ON
2. Verify Location services are ON
3. Check all permissions granted in Settings > Apps > Gratitude > Permissions
4. Try revoking and re-granting permissions

### Can't connect to device via USB

```bash
# Restart ADB server
adb kill-server
adb start-server
adb devices
```

On phone, may need to select USB mode:
- Swipe down notification
- Tap USB notification
- Select "File Transfer" or "PTP"

---

## Next Steps After Installation

1. Install on 2nd device (another Android phone)
2. Open app on both devices
3. Both tap "Start Scanning"
4. Wait 10 seconds - devices should discover each other
5. On one device, tap "Broadcast Test Message"
6. Check other device receives the message

See `PHASE2_BLE_POC.md` for detailed testing instructions.
