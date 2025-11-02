/**
 * APK Sharing Service
 * Handles sharing the app's APK file with other devices
 */

import { NativeModules, Platform } from 'react-native';
import type { Result } from '../../types/base';
import type { ApkInfo, ApkUtilsNativeModule, ApkMetadata } from './types';

const ApkUtils: ApkUtilsNativeModule = NativeModules.ApkUtils;

class ApkSharingService {
  /**
   * Get information about the current APK
   */
  async getApkInfo(): Promise<Result<ApkInfo>> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'APK sharing is only available on Android',
      };
    }

    try {
      const info = await ApkUtils.getApkInfo();
      return { success: true, data: info };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get APK info: ${error}`,
      };
    }
  }

  /**
   * Get the APK's signature fingerprint
   */
  async getSignatureFingerprint(): Promise<Result<string>> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'Signature verification is only available on Android',
      };
    }

    try {
      const fingerprint = await ApkUtils.getSignatureFingerprint();
      return { success: true, data: fingerprint };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get signature: ${error}`,
      };
    }
  }

  /**
   * Get APK metadata for sharing
   */
  async getApkMetadata(): Promise<Result<ApkMetadata>> {
    const infoResult = await this.getApkInfo();
    if (!infoResult.success) {
      return { success: false, error: infoResult.error };
    }

    const signatureResult = await this.getSignatureFingerprint();
    if (!signatureResult.success) {
      return { success: false, error: signatureResult.error };
    }

    const metadata: ApkMetadata = {
      packageName: infoResult.data.packageName,
      versionName: infoResult.data.versionName,
      sizeBytes: infoResult.data.sizeBytes,
      signatureFingerprint: signatureResult.data,
      timestamp: Date.now(),
    };

    return { success: true, data: metadata };
  }

  /**
   * Share the APK file using Android's share sheet
   * This will show options including Nearby Share, Bluetooth, etc.
   */
  async shareApk(): Promise<Result<void>> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'APK sharing is only available on Android',
      };
    }

    try {
      // Get APK info and signature for the share message
      const info = await ApkUtils.getApkInfo();
      const signature = await ApkUtils.getSignatureFingerprint();

      // Prepare share message with metadata
      const shareMessage =
        `Gratitude Mutual Aid App v${info.versionName}\n\n` +
        `📱 Install this app to join the mutual aid network!\n\n` +
        `✅ Signature: ${signature.substring(0, 20)}...\n` +
        `📦 Size: ${info.sizeMB.toFixed(2)} MB\n\n` +
        `The app will verify this APK's signature before installation.`;

      // Use native share method with proper FileProvider permissions
      await ApkUtils.shareApk('Share Gratitude App', shareMessage);

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to share APK: ${error}`,
      };
    }
  }

  /**
   * Format signature fingerprint for display
   */
  formatFingerprint(fingerprint: string, maxLength: number = 40): string {
    if (fingerprint.length <= maxLength) {
      return fingerprint;
    }
    return `${fingerprint.substring(0, maxLength)}...`;
  }

  /**
   * Format file size for display
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}

export const apkSharingService = new ApkSharingService();
