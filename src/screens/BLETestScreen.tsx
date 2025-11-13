/**
 * BLE Test Screen - For testing Bluetooth mesh networking
 * This screen allows testing BLE discovery, connections, and message broadcast
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { useBLEStore } from '../stores/bleStore';
import { createBLETestMessage } from '../services/ble/bleTestMessage';
import MutualAidMessageCodec, { MessageType } from '../../schemas/mutual-aid-message';
import { uint8ArrayToHex } from '../utils/buffer';
import { MessagePartitioner } from '../services/ble/messagePartitioner';

export function BLETestScreen() {
  const {
    isInitialized,
    centralState,
    isAdvertising,
    discoveredDevices,
    receivedMessages,
    errors,
    stats,
    localBloomFilterSet,
    discoveredBloomFilters,
    messageInventoryCount,
    initialize,
    startScanning,
    stopScanning,
    broadcastMessage,
    clearErrors,
    clearMessages,
    refreshBloomFilters,
    startAdvertising,
    stopAdvertising,
  } = useBLEStore();

  const [numTestMessages, setNumTestMessages] = useState('10');

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

  const handleStartAdvertising = async () => {
    try {
      await startAdvertising();
    } catch (error) {
      Alert.alert('Error', `Failed to start advertising: ${(error as Error).message}`);
    }
  };

  const handleStopAdvertising = async () => {
    try {
      await stopAdvertising();
    } catch (error) {
      Alert.alert('Error', `Failed to stop advertising: ${(error as Error).message}`);
    }
  };

  const handleBroadcastTestMessage = async () => {
    try {
      // Create a test message using compact format
      const message = createBLETestMessage();

      // Show message details
      const binary = MutualAidMessageCodec.serialize(message);
      console.log('Broadcasting message:', MutualAidMessageCodec.toString(message));
      console.log('Message size:', binary.byteLength, 'bytes');

      // Broadcast via BLE
      await broadcastMessage(message);
      Alert.alert(
        'Success',
        `Test message broadcast via BLE\nSize: ${binary.byteLength} bytes\nType: ${MessageType[message.messageType]}\nUNSPSC: ${message.unspsc}`
      );
    } catch (error) {
      Alert.alert('Error', `Failed to broadcast: ${(error as Error).message}`);
    }
  };

  const handleGenerateMultipleMessages = async () => {
    try {
      const count = parseInt(numTestMessages, 10);
      if (isNaN(count) || count < 1 || count > 255) {
        Alert.alert('Error', 'Please enter a number between 1 and 255');
        return;
      }

      for (let i = 0; i < count; i++) {
        const message = createBLETestMessage();
        await broadcastMessage(message);
      }

      Alert.alert('Success', `Generated ${count} test messages\nInventory now has ${messageInventoryCount} total messages`);
    } catch (error) {
      Alert.alert('Error', `Failed to generate messages: ${(error as Error).message}`);
    }
  };

  const formatTimeWindow = (window: any) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activeDays = days.filter((_, i) => window.daysOfWeek & (1 << i));
    return `${window.startHour.toString().padStart(2, '0')}:${window.startMinute.toString().padStart(2, '0')}-${window.endHour.toString().padStart(2, '0')}:${window.endMinute.toString().padStart(2, '0')} ${activeDays.join(',')}`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>BLE Mesh Network Test</Text>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text>Initialized: {isInitialized ? 'Yes' : 'No'}</Text>
        <Text>Scanning: {centralState === 'scanning' ? 'Yes' : 'No'}</Text>
        <Text>Advertising: {isAdvertising ? 'Yes' : 'No'}</Text>
        <Text>Devices Discovered: {stats.devicesDiscovered}</Text>
        <Text>Messages Seen: {stats.messagesSeen}</Text>
        <Text>Messages Received: {stats.messagesReceived}</Text>
        <Text>Messages Broadcast: {stats.messagesBroadcast}</Text>
      </View>

      {/* Bloom Filter Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bloom Filters (Local)</Text>
        <Text>Inventory Messages: {messageInventoryCount}</Text>
        {localBloomFilterSet && (
          <>
            <Text>Bloom Filters: {localBloomFilterSet.filters.length}</Text>
            <Text>
              Partition Bits: {localBloomFilterSet.partitionBits} ({Math.pow(2, localBloomFilterSet.partitionBits)} slots)
            </Text>
            <Text>
              False Positive Rate: {(localBloomFilterSet.estimatedFalsePositiveRate * 100).toFixed(1)}%
            </Text>
            <Text style={styles.subsectionTitle}>Distribution:</Text>
            {localBloomFilterSet.messagesPerFilter.map((count, index) => {
              if (count === 0) return null;
              const stats = MessagePartitioner.getDistributionStats(localBloomFilterSet);
              return (
                <Text key={index} style={styles.filterInfo}>
                  Filter {index}: {count} messages
                </Text>
              );
            })}
            <Text style={styles.subsectionTitle}>Stats:</Text>
            <Text>
              Distribution: min={MessagePartitioner.getDistributionStats(localBloomFilterSet).min},
              max={MessagePartitioner.getDistributionStats(localBloomFilterSet).max},
              mean={MessagePartitioner.getDistributionStats(localBloomFilterSet).mean.toFixed(1)}
            </Text>
          </>
        )}
        {!localBloomFilterSet && <Text style={styles.emptyText}>No Bloom filters yet</Text>}
      </View>

      {/* Discovered Bloom Filters */}
      {discoveredBloomFilters.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Discovered Bloom Filters ({discoveredBloomFilters.length})
          </Text>
          {discoveredBloomFilters.map((deviceFilters) => (
            <View key={deviceFilters.deviceId} style={styles.bloomFilterDevice}>
              <Text style={styles.deviceName}>Device: {deviceFilters.deviceId.slice(0, 8)}...</Text>
              <Text>Messages: {deviceFilters.messageCount}</Text>
              <Text>Filters Received: {deviceFilters.filters.size}/{deviceFilters.totalFilters}</Text>
              <Text>Battery: {deviceFilters.batteryLevel}%</Text>
            </View>
          ))}
        </View>
      )}

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
            title={isAdvertising ? 'Stop Advertising' : 'Start Advertising'}
            onPress={isAdvertising ? handleStopAdvertising : handleStartAdvertising}
            disabled={!isInitialized || messageInventoryCount === 0}
            color={isAdvertising ? '#ff6b6b' : '#4c6ef5'}
          />
        </View>
        <View style={styles.buttonRow}>
          <Button
            title="Broadcast Test Message"
            onPress={handleBroadcastTestMessage}
            disabled={!isInitialized}
          />
        </View>
        <View style={styles.buttonRow}>
          <Text style={styles.inputLabel}>Generate Multiple Messages:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={numTestMessages}
              onChangeText={setNumTestMessages}
              keyboardType="numeric"
              placeholder="Number (1-255)"
            />
            <Button
              title="Generate"
              onPress={handleGenerateMultipleMessages}
              disabled={!isInitialized}
            />
          </View>
        </View>
        {errors.length > 0 && (
          <View style={styles.buttonRow}>
            <Button title="Clear Errors" onPress={clearErrors} color="#ff6b6b" />
          </View>
        )}
        {receivedMessages.length > 0 && (
          <View style={styles.buttonRow}>
            <Button title="Clear Messages" onPress={clearMessages} color="#868e96" />
          </View>
        )}
      </View>

      {/* Received Messages */}
      {receivedMessages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Received Messages ({receivedMessages.length})
          </Text>
          <FlatList
            data={receivedMessages}
            scrollEnabled={false}
            keyExtractor={(item, index) => `${uint8ArrayToHex(item.publicKey.slice(0, 8))}-${index}`}
            renderItem={({ item }) => {
              const messageId = uint8ArrayToHex(item.publicKey.slice(0, 8));
              return (
                <View style={styles.messageItem}>
                  <Text style={styles.messageLine}>
                    <Text style={styles.messageLabel}>ID:</Text> {messageId}
                  </Text>
                  <Text style={styles.messageLine}>
                    <Text style={styles.messageLabel}>Type:</Text> {MessageType[item.messageType]}
                  </Text>
                  <Text style={styles.messageLine}>
                    <Text style={styles.messageLabel}>UNSPSC:</Text> {item.unspsc}
                  </Text>
                  <Text style={styles.messageLine}>
                    <Text style={styles.messageLabel}>Location:</Text> {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </Text>
                  {item.windows && item.windows.length > 0 && (
                    <Text style={styles.messageLine}>
                      <Text style={styles.messageLabel}>Time:</Text> {formatTimeWindow(item.windows[0])}
                    </Text>
                  )}
                  {item.optional && (
                    <>
                      {item.optional.qty !== undefined && (
                        <Text style={styles.messageLine}>
                          <Text style={styles.messageLabel}>Qty:</Text> {item.optional.qty}
                        </Text>
                      )}
                      {item.optional.floor !== undefined && (
                        <Text style={styles.messageLine}>
                          <Text style={styles.messageLabel}>Floor:</Text> {item.optional.floor}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No messages received yet</Text>
            }
          />
        </View>
      )}

      {/* Discovered Devices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Discovered Devices ({discoveredDevices.length})
        </Text>
        <FlatList
          data={discoveredDevices}
          scrollEnabled={false}
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
            scrollEnabled={false}
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
    </ScrollView>
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
  messageItem: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#4c6ef5',
  },
  messageLine: {
    fontSize: 13,
    marginBottom: 2,
  },
  messageLabel: {
    fontWeight: '600',
    color: '#495057',
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
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    color: '#495057',
  },
  filterInfo: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  bloomFilterDevice: {
    padding: 8,
    backgroundColor: '#e3f2fd',
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
});
