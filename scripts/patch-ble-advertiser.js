#!/usr/bin/env node
/**
 * Post-install script to patch react-native-ble-advertiser
 * Fixes Android build issues with modern SDK versions
 */

const fs = require('fs');
const path = require('path');

const bleAdvertiserPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-ble-advertiser',
  'android',
  'build.gradle'
);

console.log('🔧 Patching react-native-ble-advertiser...');

if (!fs.existsSync(bleAdvertiserPath)) {
  console.log('⚠️  react-native-ble-advertiser not found, skipping patch');
  process.exit(0);
}

try {
  let buildGradle = fs.readFileSync(bleAdvertiserPath, 'utf8');

  // Update compileSdkVersion to 34
  buildGradle = buildGradle.replace(
    /compileSdkVersion\s+\d+/g,
    'compileSdkVersion 34'
  );

  // Update buildToolsVersion
  buildGradle = buildGradle.replace(
    /buildToolsVersion\s+['"][\d.]+['"]/g,
    "buildToolsVersion '34.0.0'"
  );

  // Replace jcenter() with mavenCentral()
  buildGradle = buildGradle.replace(
    /jcenter\(\)/g,
    'mavenCentral()'
  );

  // Ensure compileSdkVersion is at least 34
  if (!buildGradle.includes('compileSdkVersion 34') && !buildGradle.includes('compileSdkVersion 35')) {
    // If no compileSdkVersion found, add it to defaultConfig
    buildGradle = buildGradle.replace(
      /(android\s*{[^}]*)/,
      '$1\n    compileSdkVersion 34'
    );
  }

  fs.writeFileSync(bleAdvertiserPath, buildGradle);
  console.log('✅ Successfully patched react-native-ble-advertiser');
} catch (error) {
  console.error('❌ Error patching react-native-ble-advertiser:', error.message);
  process.exit(1);
}
