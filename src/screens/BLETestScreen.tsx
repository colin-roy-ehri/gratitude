/**
 * BLE Test Screen - For testing Bluetooth mesh networking
 * This screen allows testing BLE discovery, connections, and message broadcast
 */

import React, { useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { useBLEStore } from '../stores/bleStore';
import { useMessageStore } from '../stores/messageStore';

export function BLETestScreen() {
  const {
    isInitialized,
    centralState,
    discoveredDevices,
    errors,
    stats,
    initialize,
    startScanning,
    stopScanning,
    broadcastMessage,
    clearErrors,
  } = useBLEStore();

  const { createNeed } = useMessageStore();

  useEffect(() => {
    // Initialize BLE on mount
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const handleStartScanning = async () => {
    try {
      await startScanning();
    } catch (error) {
      Alert.alert('Error', `Failed to start scanning: ${(error as Error).message}`);
    }
  };

  const handleStopScanning = () => {
    stopScanning();
  };

  const handleBroadcastTestMessage = async () => {
    try {
      // Create a test NEED message
      const result = await createNeed({
        category: 'FOOD',
        secondary: ['Test Message'],
        location: { lat: 37.7749, lon: -122.4194 },
        quantity: 'Small_amount',
        nearbyDeviceCount: stats.devicesDiscovered,
      });

      if (result.success) {
        // Broadcast via BLE
        await broadcastMessage(result.data);
        Alert.alert('Success', 'Test message broadcast via BLE');
      } else {
        Alert.alert('Error', result.error || 'Failed to create message');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to broadcast: ${(error as Error).message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Mesh Network Test</Text>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text>Initialized: {isInitialized ? 'Yes' : 'No'}</Text>
        <Text>Scanning: {centralState === 'scanning' ? 'Yes' : 'No'}</Text>
        <Text>Devices Discovered: {stats.devicesDiscovered}</Text>
        <Text>Messages Seen: {stats.messagesSeen}</Text>
        <Text>Messages Received: {stats.messagesReceived}</Text>
        <Text>Messages Broadcast: {stats.messagesBroadcast}</Text>
      </View>

      {/* Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Controls</Text>
        <View style={styles.buttonRow}>
          <Button
            title={centralState === 'scanning' ? 'Stop Scanning' : 'Start Scanning'}
            onPress={centralState === 'scanning' ? handleStopScanning : handleStartScanning}
            disabled={!isInitialized}
          />
        </View>
        <View style={styles.buttonRow}>
          <Button
            title="Broadcast Test Message"
            onPress={handleBroadcastTestMessage}
            disabled={!isInitialized}
          />
        </View>
        {errors.length > 0 && (
          <View style={styles.buttonRow}>
            <Button title="Clear Errors" onPress={clearErrors} color="#ff6b6b" />
          </View>
        )}
      </View>

      {/* Discovered Devices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Discovered Devices ({discoveredDevices.length})
        </Text>
        <FlatList
          data={discoveredDevices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.deviceItem}>
              <Text style={styles.deviceName}>{item.name || 'Unknown'}</Text>
              <Text style={styles.deviceId}>{item.id}</Text>
              <Text style={styles.deviceRssi}>RSSI: {item.rssi} dBm</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No devices discovered yet</Text>
          }
        />
      </View>

      {/* Errors */}
      {errors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Errors ({errors.length})</Text>
          <FlatList
            data={errors}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.errorItem}>
                <Text style={styles.errorType}>{item.type}</Text>
                <Text style={styles.errorMessage}>{item.message}</Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  buttonRow: {
    marginVertical: 4,
  },
  deviceItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
  },
  deviceRssi: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 16,
  },
  errorItem: {
    padding: 8,
    backgroundColor: '#fff5f5',
    marginBottom: 4,
    borderRadius: 4,
  },
  errorType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c92a2a',
  },
  errorMessage: {
    fontSize: 12,
    color: '#666',
  },
});
