# Deployment Scripts

Quick reference for deploying builds to EAS.

## Scripts Available

### `./dev_deploy.sh` - Deploy Android APK

Builds and deploys an Android APK for testing on devices.

**Usage:**
```bash
./dev_deploy.sh
```

**What it does:**
1. Checks if EAS CLI is installed (installs if missing)
2. Checks if you're logged in (prompts if not)
3. Builds Android APK using the `preview` profile
4. Provides download instructions

**Build profile used:** `preview` (from eas.json)
- Release build (optimized)
- No development tools
- Suitable for real device testing
- Creates APK (not AAB) for easy sideloading

### `./dev_build_status.sh` - Check Build Status

Shows the status of recent EAS builds.

**Usage:**
```bash
./dev_build_status.sh
```

**What it shows:**
- Last 5 builds
- Status (in-progress, completed, failed)
- Download URLs for completed builds
- Helpful commands for managing builds

## Quick Start

**First time setup:**
```bash
# 1. Run the deploy script
./dev_deploy.sh

# It will prompt you to:
# - Install EAS CLI (if needed)
# - Login to Expo (create free account if needed)

# 2. Wait for build (10-15 minutes)
# Check status with:
./dev_build_status.sh

# 3. Download APK from the URL provided
# 4. Install on Android device
```

## Installing the APK on Your Device

### Option 1: Download Directly on Phone
1. Open the EAS build URL on your Android device
2. Download the APK
3. Tap to install (enable "Install from Unknown Sources" if prompted)

### Option 2: USB Installation
```bash
# Download APK to computer
wget <EAS-URL> -O gratitude.apk

# Connect phone via USB (enable USB debugging)
adb install gratitude.apk
```

### Option 3: Share with Others
- Send the EAS build URL via text/email
- Or download and share the APK file directly
- No app store required!

## Manual Commands

If you prefer not to use the scripts:

```bash
# Login to EAS
eas login

# Start a build
eas build --platform android --profile preview

# Check build status
eas build:list

# View specific build
eas build:view [BUILD_ID]

# Cancel a build
eas build:cancel [BUILD_ID]
```

## Build Profiles (eas.json)

**`preview` (default)** - Recommended for testing
- Release build with optimizations
- No development tools
- Creates APK for sideloading
- Suitable for sharing with testers

**`development`**
- Includes development tools
- Slower performance
- Larger file size
- Good for debugging during development

**`production`**
- Production-ready build
- Creates AAB for Google Play Store
- Not used for sideloading

## Troubleshooting

**"EAS CLI not found"**
```bash
npm install -g eas-cli
```

**"Not logged in"**
```bash
eas login
```

**"Build failed"**
```bash
# View build logs
eas build:view [BUILD_ID]

# Check ANDROID_BUILD_FIXES.md for common issues
```

**Build takes too long**
- Typical build time: 10-15 minutes
- Check status: `./dev_build_status.sh`
- First build may take longer (cache warming)

## Next Steps After Build

1. **Download APK** from the URL provided by EAS
2. **Install on Galaxy S22** (see BUILDING_APK.md)
3. **Test BLE functionality** (see PHASE2_BLE_POC.md)
4. **Share with others** - Just send them the APK URL or file!

## For More Details

- Full build guide: `BUILDING_APK.md`
- Build troubleshooting: `ANDROID_BUILD_FIXES.md`
- BLE testing instructions: `PHASE2_BLE_POC.md`
