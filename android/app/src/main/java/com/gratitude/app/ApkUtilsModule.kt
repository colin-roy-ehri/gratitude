package com.gratitude.app

import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.io.File
import java.security.MessageDigest

class ApkUtilsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ApkUtils"
    }

    @ReactMethod
    fun getApkPath(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val pm = reactApplicationContext.packageManager
            val ai = pm.getApplicationInfo(packageName, 0)

            // Use publicSourceDir for compatibility with forward-locked apps
            val apkPath = ai.publicSourceDir

            if (apkPath != null && File(apkPath).exists()) {
                promise.resolve(apkPath)
            } else {
                promise.reject("E_APK_NOT_FOUND", "APK file not found")
            }
        } catch (e: Exception) {
            promise.reject("E_APK_PATH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getApkSize(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val pm = reactApplicationContext.packageManager
            val ai = pm.getApplicationInfo(packageName, 0)
            val apkPath = ai.publicSourceDir

            if (apkPath != null) {
                val file = File(apkPath)
                val sizeBytes = file.length()
                promise.resolve(sizeBytes.toDouble())
            } else {
                promise.reject("E_APK_NOT_FOUND", "APK file not found")
            }
        } catch (e: Exception) {
            promise.reject("E_APK_SIZE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getSignatureFingerprint(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val pm = reactApplicationContext.packageManager

            val packageInfo: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                // API 28+: Use GET_SIGNING_CERTIFICATES
                pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            } else {
                // Older versions: Use GET_SIGNATURES (deprecated but necessary)
                @Suppress("DEPRECATION")
                pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
            }

            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }

            if (signatures != null && signatures.isNotEmpty()) {
                // Get the first signature and compute SHA-256 fingerprint
                val signature = signatures[0]
                val md = MessageDigest.getInstance("SHA-256")
                val digest = md.digest(signature.toByteArray())

                // Convert to hex string with colons
                val hexString = digest.joinToString(":") { byte ->
                    "%02X".format(byte)
                }

                promise.resolve(hexString)
            } else {
                promise.reject("E_NO_SIGNATURE", "No signature found")
            }
        } catch (e: Exception) {
            promise.reject("E_SIGNATURE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getApkInfo(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val pm = reactApplicationContext.packageManager
            val ai = pm.getApplicationInfo(packageName, 0)
            val pi = pm.getPackageInfo(packageName, 0)

            val apkPath = ai.publicSourceDir
            val file = File(apkPath)

            val map: WritableMap = Arguments.createMap()
            map.putString("packageName", packageName)
            map.putString("versionName", pi.versionName)
            map.putInt("versionCode", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pi.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                pi.versionCode
            })
            map.putString("apkPath", apkPath)
            map.putDouble("sizeBytes", file.length().toDouble())
            map.putDouble("sizeMB", file.length() / (1024.0 * 1024.0))

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("E_APK_INFO_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getShareableApkUri(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val pm = reactApplicationContext.packageManager
            val ai = pm.getApplicationInfo(packageName, 0)
            val apkFile = File(ai.publicSourceDir)

            // Generate content:// URI using FileProvider
            val authority = "$packageName.fileprovider"
            val apkUri = FileProvider.getUriForFile(
                reactApplicationContext,
                authority,
                apkFile
            )

            promise.resolve(apkUri.toString())
        } catch (e: Exception) {
            promise.reject("E_URI_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun shareApk(title: String, message: String, promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val pm = reactApplicationContext.packageManager
            val ai = pm.getApplicationInfo(packageName, 0)
            val pi = pm.getPackageInfo(packageName, 0)
            val apkFile = File(ai.publicSourceDir)

            // Generate content:// URI using FileProvider
            val authority = "$packageName.fileprovider"
            val apkUri = FileProvider.getUriForFile(
                reactApplicationContext,
                authority,
                apkFile
            )

            // Create share intent with proper permissions
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/vnd.android.package-archive"
                putExtra(Intent.EXTRA_STREAM, apkUri)
                putExtra(Intent.EXTRA_SUBJECT, title)
                putExtra(Intent.EXTRA_TEXT, message)
                // Critical: Grant read permission for the content URI
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                // Use setClipData for SDK 16+ compatibility
                clipData = android.content.ClipData.newRawUri("", apkUri)
            }

            // Create chooser
            val chooserIntent = Intent.createChooser(shareIntent, title)
            chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            reactApplicationContext.startActivity(chooserIntent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("E_SHARE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun verifyApkSignature(apkPath: String, expectedFingerprint: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager

            // Get package info for the APK file
            val packageInfo = pm.getPackageArchiveInfo(
                apkPath,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    PackageManager.GET_SIGNING_CERTIFICATES
                } else {
                    @Suppress("DEPRECATION")
                    PackageManager.GET_SIGNATURES
                }
            )

            if (packageInfo == null) {
                promise.reject("E_INVALID_APK", "Could not read APK file")
                return
            }

            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }

            if (signatures != null && signatures.isNotEmpty()) {
                val signature = signatures[0]
                val md = MessageDigest.getInstance("SHA-256")
                val digest = md.digest(signature.toByteArray())

                val hexString = digest.joinToString(":") { byte ->
                    "%02X".format(byte)
                }

                val map: WritableMap = Arguments.createMap()
                map.putString("fingerprint", hexString)
                map.putBoolean("isValid", hexString.equals(expectedFingerprint, ignoreCase = true))
                map.putString("expectedFingerprint", expectedFingerprint)

                promise.resolve(map)
            } else {
                promise.reject("E_NO_SIGNATURE", "APK has no signature")
            }
        } catch (e: Exception) {
            promise.reject("E_VERIFY_ERROR", e.message, e)
        }
    }
}
