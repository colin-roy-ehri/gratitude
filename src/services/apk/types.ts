/**
 * APK Sharing and Verification Types
 */

export interface ApkInfo {
  packageName: string;
  versionName: string;
  versionCode: number;
  apkPath: string;
  sizeBytes: number;
  sizeMB: number;
}

export interface SignatureVerificationResult {
  fingerprint: string;
  isValid: boolean;
  expectedFingerprint: string;
}

export interface ApkMetadata {
  packageName: string;
  versionName: string;
  sizeBytes: number;
  signatureFingerprint: string;
  timestamp: number;
}

/**
 * Native Module Interface for ApkUtils
 */
export interface ApkUtilsNativeModule {
  getApkPath(): Promise<string>;
  getApkSize(): Promise<number>;
  getSignatureFingerprint(): Promise<string>;
  getApkInfo(): Promise<ApkInfo>;
  getShareableApkUri(): Promise<string>;
  shareApk(title: string, message: string): Promise<void>;
  verifyApkSignature(
    apkPath: string,
    expectedFingerprint: string
  ): Promise<SignatureVerificationResult>;
}
