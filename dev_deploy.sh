#!/bin/bash

# dev_deploy.sh - Deploy Android APK to EAS for testing
# Usage: ./dev_deploy.sh

set -e  # Exit on any error

echo "🚀 Starting EAS Android build for development testing..."
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in to EAS
if ! eas whoami &> /dev/null; then
    echo "🔐 Not logged in to EAS. Please login:"
    eas login
fi

echo "📦 Building Android APK (preview profile)..."
echo "   This will build a release APK suitable for testing on devices."
echo ""

# Build for Android using the preview profile
# - preview profile creates a release build
# - buildType: apk (not aab) for easy sideloading
# - distribution: internal (no Google Play store submission)
eas build --platform android --profile preview

echo ""
echo "✅ Build submitted to EAS!"
echo ""
echo "📱 Next steps:"
echo "   1. Wait for build to complete (check status with 'eas build:list')"
echo "   2. Download APK from the URL provided"
echo "   3. Install on Galaxy S22 via:"
echo "      - Download directly on phone, or"
echo "      - USB: adb install app.apk"
echo ""
echo "💡 Tips:"
echo "   - View build logs: eas build:view"
echo "   - Cancel build: eas build:cancel"
echo "   - Check build status: eas build:list"
echo ""
