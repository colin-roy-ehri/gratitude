#!/bin/bash

# dev_build_status.sh - Check status of EAS builds
# Usage: ./dev_build_status.sh

echo "📊 EAS Build Status"
echo "==================="
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Please run ./dev_deploy.sh first."
    exit 1
fi

# Check if logged in
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please run: eas login"
    exit 1
fi

# Show recent builds
echo "Recent builds:"
eas build:list --limit 5

echo ""
echo "💡 Commands:"
echo "   View specific build:  eas build:view [BUILD_ID]"
echo "   Cancel a build:       eas build:cancel [BUILD_ID]"
echo "   Download APK:         Copy URL from build list above"
echo ""
