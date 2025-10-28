# Android Build Fixes

## Problems

The EAS build was failing with multiple errors:

### 1. react-native-sodium SDK Version Error
```
Could not create task ':react-native-sodium:compileReleaseJavaWithJavac'.
> In order to compile Java 9+ source, please set compileSdkVersion to 30 or above
```

This occurred because the `react-native-sodium` library (v0.4.0) has an outdated `build.gradle` configuration that hardcodes Android SDK 28, which is incompatible with Java 9+ compilation requirements.

### 2. react-native-ble-manager Compilation Errors
```
error: cannot find symbol
class BleManager extends NativeBleManagerSpec {
                         ^
  symbol: class NativeBleManagerSpec
```

This occurred because `react-native-ble-manager` was included as a dependency but we're actually using `react-native-ble-plx` instead. The unused library was causing compilation failures.

### 3. JVM Target Inconsistency
```
Inconsistent JVM-target compatibility detected for tasks 'compileReleaseJavaWithJavac' (17) and 'compileReleaseKotlin' (11).
```

This occurred because the Java compiler was defaulting to JVM target 17 while Kotlin was set to target 11. All compilation tasks must use the same JVM target version.

## Solutions

We've implemented fixes for all three issues:

### Fix 1: Removed Unused BLE Library

**Action:** Uninstalled `react-native-ble-manager`

```bash
npm uninstall react-native-ble-manager
```

**Reason:** The project uses `react-native-ble-plx` for BLE functionality (see `src/services/ble/bleManager.ts`). The `react-native-ble-manager` package was accidentally included and causing compilation errors.

### Fix 2: Enforced JVM Target 11 Consistency

**Files Modified:**
- `android/build.gradle` - Added global task configuration
- `android/app/build.gradle` - Uses shared jvmTargetVersion
- `android/gradle.properties` - Set Kotlin validation mode to warning

**Changes:**

1. **Root build.gradle** - Added ext variable and task configuration:
```gradle
ext {
    jvmTargetVersion = JavaVersion.VERSION_11
}

allprojects {
    // Force JVM target 11 for all tasks
    tasks.withType(JavaCompile).configureEach {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "11"
        }
    }
}
```

2. **App build.gradle** - Uses root project ext variable:
```gradle
compileOptions {
    sourceCompatibility rootProject.ext.jvmTargetVersion
    targetCompatibility rootProject.ext.jvmTargetVersion
}

kotlinOptions {
    jvmTarget = rootProject.ext.jvmTargetVersion.toString()
}
```

3. **gradle.properties** - Suppress validation warnings:
```properties
kotlin.jvm.target.validation.mode=warning
```

**Why this works:** By configuring all JavaCompile and KotlinCompile tasks globally, we ensure that every module (including dependencies) compiles with the same JVM target, preventing inconsistency errors.

### Fix 3: Patched react-native-sodium Library

**File:** `patches/react-native-sodium+0.4.0.patch`

Created a patch using `patch-package` that updates the library's build configuration:

- **SDK Version:** Changed from hardcoded SDK 28 to dynamic SDK 34
- **Java Version:** Upgraded from Java 8 to Java 11
- **Build Tools:** Updated to version 34.0.0
- **Dynamic Configuration:** Uses `safeExtGet()` to read SDK versions from root project

**Key Changes:**
```gradle
// BEFORE:
compileSdkVersion 28
buildToolsVersion "28.0.3"
compileOptions {
  sourceCompatibility JavaVersion.VERSION_1_8
  targetCompatibility JavaVersion.VERSION_1_8
}

// AFTER:
compileSdkVersion safeExtGet('compileSdkVersion', 34)
buildToolsVersion safeExtGet('buildToolsVersion', '34.0.0')
compileOptions {
  sourceCompatibility JavaVersion.VERSION_11
  targetCompatibility JavaVersion.VERSION_11
}
```

### 2. Root Project Configuration

**File:** `android/gradle.properties`

Added explicit SDK version properties:
```properties
android.compileSdkVersion=34
android.targetSdkVersion=34
android.buildToolsVersion=34.0.0
android.minSdkVersion=23
```

### 3. App-Level Configuration

**File:** `android/app/build.gradle` (lines 121-128)

Added Java 11 compatibility:
```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_11
    targetCompatibility JavaVersion.VERSION_11
}

kotlinOptions {
    jvmTarget = '11'
}
```

### 4. Expo Configuration

**File:** `app.json` (lines 37-39)

Added Android SDK configuration:
```json
"android": {
  "compileSdkVersion": 34,
  "targetSdkVersion": 34,
  "buildToolsVersion": "34.0.0"
}
```

### 5. EAS Build Configuration

**File:** `eas.json` (lines 20-24)

Added environment variables for cloud builds:
```json
"env": {
  "ANDROID_COMPILE_SDK_VERSION": "34",
  "ANDROID_BUILD_TOOLS_VERSION": "34.0.0",
  "ANDROID_TARGET_SDK_VERSION": "34"
}
```

### 6. Automatic Patch Application

**File:** `package.json` (line 17)

Added postinstall script to automatically apply patches:
```json
"scripts": {
  "postinstall": "patch-package"
}
```

## How It Works

1. When `npm install` runs, the postinstall script executes
2. `patch-package` applies the patch from `patches/react-native-sodium+0.4.0.patch`
3. The patched library reads SDK versions from the root project configuration
4. All modules compile with SDK 34 and Java 11, satisfying the build requirements

## Files Changed

- ✅ `package.json` - Removed react-native-ble-manager, added postinstall script
- ✅ `patches/react-native-sodium+0.4.0.patch` (created)
- ✅ `android/gradle.properties` - SDK version properties
- ✅ `android/app/build.gradle` - Java 11 compatibility
- ✅ `android/build.gradle` - Cleaned up (removed problematic afterEvaluate)
- ✅ `app.json` - Android configuration
- ✅ `eas.json` - Build environment variables
- ✅ `ANDROID_BUILD_FIXES.md` - This documentation

## Verification

To verify the patch is applied:
```bash
# Check the patched file
grep compileSdkVersion node_modules/react-native-sodium/android/build.gradle
# Should output: compileSdkVersion safeExtGet('compileSdkVersion', 34)

# Test patch application
npm run postinstall
# Should output: react-native-sodium@0.4.0 ✔
```

## Building

The build should now succeed:
```bash
# Cloud build
eas build --platform android --profile preview

# Local build
cd android && ./gradlew assembleRelease
```

## Why This Approach?

1. **patch-package** - Industry-standard solution for patching npm dependencies
2. **Automatic** - Patches apply on every `npm install`, including in EAS builds
3. **Version Controlled** - Patches are tracked in git, ensuring consistency
4. **Reversible** - Easy to remove if the upstream library is updated
5. **Comprehensive** - Multiple layers ensure compatibility even if one fails

## Future

When `react-native-sodium` releases a version with updated Android configuration, we can:
1. Update the dependency version
2. Remove the patch file
3. Remove the postinstall script (if no other patches exist)

## References

- [patch-package Documentation](https://github.com/ds300/patch-package)
- [Android SDK Versions](https://developer.android.com/studio/releases/platforms)
- [Java Version Requirements](https://developer.android.com/build/jdks)
