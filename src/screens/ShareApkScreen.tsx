/**
 * Share APK Screen
 * Allows users to share the Gratitude app with other devices
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { apkSharingService } from '../services/apk/apkSharingService';
import { apkVerificationService, SIGNATURE_VERIFICATION_ENABLED } from '../services/apk/apkVerificationService';
import type { ApkInfo } from '../services/apk/types';

export function ShareApkScreen() {
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [signature, setSignature] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadApkInfo();
  }, []);

  const loadApkInfo = async () => {
    if (Platform.OS !== 'android') {
      setError('APK sharing is only available on Android');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Get APK info
    const infoResult = await apkSharingService.getApkInfo();
    if (!infoResult.success) {
      setError(infoResult.error || 'Failed to load APK info');
      setLoading(false);
      return;
    }
    setApkInfo(infoResult.data);

    // Get signature
    const signatureResult = await apkSharingService.getSignatureFingerprint();
    if (!signatureResult.success) {
      setError(signatureResult.error || 'Failed to load signature');
      setLoading(false);
      return;
    }
    setSignature(signatureResult.data);

    setLoading(false);
  };

  const handleShare = async () => {
    setSharing(true);
    const result = await apkSharingService.shareApk();
    setSharing(false);

    if (!result.success) {
      Alert.alert('Share Failed', result.error || 'Could not share APK');
    }
  };

  const handleCopySignature = () => {
    // In a real app, you'd use Clipboard API
    Alert.alert(
      'Signature Fingerprint',
      signature,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading APK information...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadApkInfo}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Share Gratitude App</Text>
      <Text style={styles.subtitle}>
        Help grow the mutual aid network by sharing this app with others
      </Text>

      {apkInfo && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📱 App Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>{apkInfo.versionName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Size:</Text>
            <Text style={styles.infoValue}>
              {apkSharingService.formatSize(apkInfo.sizeBytes)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Package:</Text>
            <Text style={styles.infoValue}>{apkInfo.packageName}</Text>
          </View>
        </View>
      )}

      <View style={styles.securityCard}>
        <Text style={styles.securityTitle}>🔒 Security Information</Text>

        <Text style={styles.securityLabel}>Signature Fingerprint (SHA-256):</Text>
        <TouchableOpacity
          style={styles.signatureBox}
          onPress={handleCopySignature}
        >
          <Text style={styles.signatureText}>
            {apkSharingService.formatFingerprint(signature, 60)}
          </Text>
        </TouchableOpacity>
        <Text style={styles.securityHint}>Tap to view full signature</Text>

        {!SIGNATURE_VERIFICATION_ENABLED && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Signature verification is not yet configured. After building a
              signed APK, copy this signature to apkVerificationService.ts
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
        onPress={handleShare}
        disabled={sharing}
      >
        {sharing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.shareButtonText}>📤 Share App via Android Share</Text>
        )}
      </TouchableOpacity>

      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>📋 How to Share:</Text>
        <Text style={styles.instructionText}>
          1. Tap "Share App via Android Share"{'\n'}
          2. Choose sharing method:{'\n'}
          {'   '}• Nearby Share (recommended){'\n'}
          {'   '}• Bluetooth{'\n'}
          {'   '}• Email, messaging, etc.{'\n'}
          3. Recipient receives the APK file{'\n'}
          4. App will verify signature before installation
        </Text>
      </View>

      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>🤝 Recipient Instructions:</Text>
        <Text style={styles.instructionText}>
          1. Accept the file transfer{'\n'}
          2. Open the downloaded APK{'\n'}
          3. Enable "Install from Unknown Sources" if prompted{'\n'}
          4. App will verify the signature{'\n'}
          5. Tap "Install" if verification succeeds
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Gratitude uses peer-to-peer distribution to enable mutual aid without
          centralized control. Share freely!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  securityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  securityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  signatureBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signatureText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#333',
  },
  securityHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningText: {
    fontSize: 13,
    color: '#e65100',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginVertical: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  shareButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionsCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#0d47a1',
    lineHeight: 22,
  },
  footer: {
    marginTop: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
