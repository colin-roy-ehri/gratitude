/**
 * APK Verification Service
 * Handles verification of received APK files against trusted signatures
 */

import { NativeModules, Platform } from 'react-native';
import type { Result } from '../../types/base';
import type { ApkUtilsNativeModule, SignatureVerificationResult } from './types';

const ApkUtils: ApkUtilsNativeModule = NativeModules.ApkUtils;

/**
 * TRUSTED_SIGNATURE_FINGERPRINT
 *
 * This is the SHA-256 fingerprint of the APK signing certificate.
 * It should match the signature of APKs built by EAS with your signing key.
 *
 * How to get this value:
 * 1. Build a signed APK with EAS
 * 2. Install it on a device
 * 3. Open the app and go to "Share App" screen
 * 4. Copy the signature fingerprint shown
 * 5. Paste it here
 *
 * SECURITY NOTE:
 * This provides tamper detection but is not foolproof. An attacker who
 * decompiles the APK can replace this value. However, it raises the bar
 * and works well for the mutual aid use case where initial distribution
 * is from a trusted source (e.g., your EAS build URL).
 *
 * For production, consider:
 * - Certificate pinning
 * - Remote signature verification
 * - Code obfuscation
 */
export const TRUSTED_SIGNATURE_FINGERPRINT: string =
  '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00';

/**
 * Set this to true after you've built a signed APK and updated
 * TRUSTED_SIGNATURE_FINGERPRINT with the actual value.
 */
export const SIGNATURE_VERIFICATION_ENABLED: boolean = false;

class ApkVerificationService {
  /**
   * Verify that an APK file has the trusted signature
   */
  async verifyApk(apkPath: string): Promise<Result<SignatureVerificationResult>> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'APK verification is only available on Android',
      };
    }

    try {
      const result = await ApkUtils.verifyApkSignature(
        apkPath,
        TRUSTED_SIGNATURE_FINGERPRINT
      );
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Failed to verify APK: ${error}`,
      };
    }
  }

  /**
   * Check if the current app's signature matches the trusted signature
   * Useful for confirming the trusted signature is correct
   */
  async verifySelf(): Promise<Result<boolean>> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'Self-verification is only available on Android',
      };
    }

    try {
      const currentSignature = await ApkUtils.getSignatureFingerprint();
      const matches = currentSignature.toUpperCase() === TRUSTED_SIGNATURE_FINGERPRINT.toUpperCase();
      return { success: true, data: matches };
    } catch (error) {
      return {
        success: false,
        error: `Failed to verify self: ${error}`,
      };
    }
  }

  /**
   * Get the current app's signature (for initial setup)
   */
  async getCurrentSignature(): Promise<Result<string>> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'Signature retrieval is only available on Android',
      };
    }

    try {
      const signature = await ApkUtils.getSignatureFingerprint();
      return { success: true, data: signature };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get signature: ${error}`,
      };
    }
  }

  /**
   * Compare two signature fingerprints
   */
  compareSignatures(signature1: string, signature2: string): boolean {
    return signature1.toUpperCase() === signature2.toUpperCase();
  }

  /**
   * Check if signature verification is properly configured
   */
  isConfigured(): boolean {
    return (
      SIGNATURE_VERIFICATION_ENABLED &&
      TRUSTED_SIGNATURE_FINGERPRINT !==
        '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00'
    );
  }
}

export const apkVerificationService = new ApkVerificationService();
