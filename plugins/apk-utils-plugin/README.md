# APK Utils Plugin

Custom Expo config plugin for Gratitude app that adds native Android functionality for APK sharing and verification.

## Features

This plugin adds the following native Android capabilities:

- **APK Sharing**: Share the app's APK file via Android share sheet (Nearby Share, Bluetooth, etc.)
- **APK Metadata**: Get APK information (version, size, package name)
- **Signature Verification**: Get and verify APK SHA-256 signatures for security
- **FileProvider Configuration**: Automatically configures Android FileProvider for secure file sharing

## What it does

1. Copies Kotlin native modules (`ApkUtilsModule.kt`, `ApkUtilsPackage.kt`) to the Android project
2. Registers the `ApkUtilsPackage` in `MainApplication.kt`
3. Configures FileProvider in `AndroidManifest.xml`
4. Adds XML resource file (`file_paths.xml`) for FileProvider paths

## Usage

This plugin is automatically applied during `npx expo prebuild` or `eas build`.

The native module is accessed in JavaScript via:

```javascript
import { NativeModules } from 'react-native';
const { ApkUtils } = NativeModules;

// Use the native methods
const apkInfo = await ApkUtils.getApkInfo();
const signature = await ApkUtils.getSignatureFingerprint();
await ApkUtils.shareApk('Title', 'Message');
```

## Native Methods

- `getApkInfo()`: Returns package name, version, and size
- `getApkSize()`: Returns APK file size in bytes
- `getSignatureFingerprint()`: Returns SHA-256 signature fingerprint
- `getShareableApkUri()`: Returns FileProvider content:// URI for the APK
- `shareApk(title, message)`: Opens Android share sheet with the APK
- `verifyApkSignature(apkPath, expectedFingerprint)`: Verifies an APK's signature

## Files

```
plugins/apk-utils-plugin/
├── index.js                                    # Main plugin file
├── android/
│   └── src/
│       └── main/
│           ├── java/com/gratitude/app/
│           │   ├── ApkUtilsModule.kt          # Native module implementation
│           │   └── ApkUtilsPackage.kt         # React Native package
│           └── res/
│               └── xml/
│                   └── file_paths.xml         # FileProvider configuration
└── README.md
```
