/**
 * Expo config plugin to fix react-native-ble-advertiser build issues
 * Patches the Android build.gradle to use updated SDK versions
 */

const { withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withBLEAdvertiser(config) {
  return withProjectBuildGradle(config, async (config) => {
    // After the project is generated, patch the BLE advertiser module
    const bleAdvertiserPath = path.join(
      config.modRequest.projectRoot,
      'node_modules',
      'react-native-ble-advertiser',
      'android',
      'build.gradle'
    );

    if (fs.existsSync(bleAdvertiserPath)) {
      let buildGradle = fs.readFileSync(bleAdvertiserPath, 'utf8');

      // Update compileSdkVersion to 34
      buildGradle = buildGradle.replace(
        /compileSdkVersion.*$/m,
        'compileSdkVersion 34'
      );

      // Update buildToolsVersion
      buildGradle = buildGradle.replace(
        /buildToolsVersion.*$/m,
        "buildToolsVersion '34.0.0'"
      );

      // Replace jcenter() with mavenCentral()
      buildGradle = buildGradle.replace(
        /jcenter\(\)/g,
        'mavenCentral()'
      );

      fs.writeFileSync(bleAdvertiserPath, buildGradle);
      console.log('✅ Patched react-native-ble-advertiser build.gradle');
    }

    return config;
  });
};
