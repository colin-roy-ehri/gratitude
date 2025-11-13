/**
 * Expo Config Plugin for APK Utils Module
 * Adds native Android code for APK sharing and verification
 */

const {
  withMainApplication,
  withAppBuildGradle,
  withAndroidManifest,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Add the ApkUtils native modules to MainApplication.kt
 */
function withApkUtilsPackage(config) {
  return withMainApplication(config, async (config) => {
    const { modResults } = config;
    let content = modResults.contents;

    // Add import for ApkUtilsPackage
    if (!content.includes('import com.gratitude.app.ApkUtilsPackage')) {
      // Find the package declaration and add import after it
      const packageMatch = content.match(/package\s+[\w.]+\s*\n/);
      if (packageMatch) {
        const insertIndex = packageMatch.index + packageMatch[0].length;
        content =
          content.slice(0, insertIndex) +
          'import com.gratitude.app.ApkUtilsPackage\n' +
          content.slice(insertIndex);
      }
    }

    // Add ApkUtilsPackage to the packages list
    if (!content.includes('ApkUtilsPackage()')) {
      // Find the return statement and modify it
      const returnMatch = content.match(
        /return\s+PackageList\(this\)\.packages/
      );
      if (returnMatch) {
        const replacement = `val packages = PackageList(this).packages.toMutableList()
            packages.add(ApkUtilsPackage())
            return packages`;
        content = content.replace(returnMatch[0], replacement);
      }
    }

    modResults.contents = content;
    return config;
  });
}

/**
 * Add FileProvider configuration to AndroidManifest.xml
 */
function withFileProvider(config) {
  return withAndroidManifest(config, async (config) => {
    const { manifest } = config.modResults;

    // Find the application element
    const application = manifest.application[0];

    // Check if FileProvider already exists
    const hasFileProvider = application.provider?.some(
      (provider) =>
        provider.$['android:authorities']?.includes('.fileprovider')
    );

    if (!hasFileProvider) {
      // Add FileProvider
      if (!application.provider) {
        application.provider = [];
      }

      application.provider.push({
        $: {
          'android:name': 'androidx.core.content.FileProvider',
          'android:authorities': '${applicationId}.fileprovider',
          'android:exported': 'false',
          'android:grantUriPermissions': 'true',
        },
        'meta-data': [
          {
            $: {
              'android:name': 'android.support.FILE_PROVIDER_PATHS',
              'android:resource': '@xml/file_paths',
            },
          },
        ],
      });
    }

    return config;
  });
}

/**
 * Copy native module files to the Android project
 */
function withApkUtilsNativeFiles(config) {
  return withAppBuildGradle(config, async (config) => {
    const { modRequest } = config;
    const projectRoot = modRequest.projectRoot;

    // Source files in the plugin directory
    const pluginDir = path.join(projectRoot, 'plugins', 'apk-utils-plugin');
    const sourceDir = path.join(pluginDir, 'android', 'src', 'main');

    // Destination in the Android project
    const androidDir = path.join(projectRoot, 'android');
    const destDir = path.join(androidDir, 'app', 'src', 'main');

    // Copy Kotlin files
    const kotlinSourceDir = path.join(
      sourceDir,
      'java',
      'com',
      'gratitude',
      'app'
    );
    const kotlinDestDir = path.join(
      destDir,
      'java',
      'com',
      'gratitude',
      'app'
    );

    if (fs.existsSync(kotlinSourceDir)) {
      fs.mkdirSync(kotlinDestDir, { recursive: true });

      const files = fs.readdirSync(kotlinSourceDir);
      files.forEach((file) => {
        if (file.endsWith('.kt')) {
          const source = path.join(kotlinSourceDir, file);
          const dest = path.join(kotlinDestDir, file);
          fs.copyFileSync(source, dest);
        }
      });
    }

    // Copy XML resource files
    const xmlSourceDir = path.join(sourceDir, 'res', 'xml');
    const xmlDestDir = path.join(destDir, 'res', 'xml');

    if (fs.existsSync(xmlSourceDir)) {
      fs.mkdirSync(xmlDestDir, { recursive: true });

      const files = fs.readdirSync(xmlSourceDir);
      files.forEach((file) => {
        if (file.endsWith('.xml')) {
          const source = path.join(xmlSourceDir, file);
          const dest = path.join(xmlDestDir, file);
          fs.copyFileSync(source, dest);
        }
      });
    }

    return config;
  });
}

/**
 * Main plugin function
 */
const withApkUtils = (config) => {
  config = withApkUtilsPackage(config);
  config = withFileProvider(config);
  config = withApkUtilsNativeFiles(config);
  return config;
};

module.exports = withApkUtils;
