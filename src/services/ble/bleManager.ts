/**
 * BLE Manager - Main service for Bluetooth Low Energy operations
 * Handles scanning, advertising, connections, and message transmission
 */

import { BleManager, Device, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  BLEDevice,
  BLEConfig,
  DEFAULT_BLE_CONFIG,
  BLEMessagePacket,
  BLEError,
  BLEErrorType,
  SeenMessage,
  BLE_SERVICE_UUID,
  BLE_CHARACTERISTIC_UUID,
} from '../../types/ble';
import { MutualAidMessage } from '../../types/message';
import { Result } from '../../types/common';
import { createBLEPacket, extractMessageFromPacket } from './bleProtocol';

class BLEManagerService {
  private manager: BleManager;
  private config: BLEConfig;
  private isScanning: boolean = false;
  private discoveredDevices: Map<string, BLEDevice> = new Map();
  private seenMessages: Map<string, SeenMessage> = new Map();
  private messageReceivedCallback?: (message: MutualAidMessage, fromDevice: string) => void;
  private errorCallback?: (error: BLEError) => void;

  constructor(config: BLEConfig = DEFAULT_BLE_CONFIG) {
    this.manager = new BleManager();
    this.config = config;
  }

  /**
   * Initialize BLE manager and check permissions
   */
  async initialize(): Promise<Result<void>> {
    try {
      // Request permissions on Android
      if (Platform.OS === 'android') {
        const permissionResult = await this.requestAndroidPermissions();
        if (!permissionResult.success) {
          return permissionResult;
        }
      }

      // Check if Bluetooth is enabled
      const state = await this.manager.state();
      if (state !== State.PoweredOn) {
        return {
          success: false,
          error: 'Bluetooth is not enabled. Please enable Bluetooth.',
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `BLE initialization failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Request necessary Android BLE permissions
   */
  private async requestAndroidPermissions(): Promise<Result<void>> {
    try {
      if (Platform.OS !== 'android') {
        return { success: true, data: undefined };
      }

      const apiLevel = Platform.Version;

      // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      if (apiLevel >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        if (
          granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          return {
            success: false,
            error: 'Bluetooth permissions not granted',
          };
        }
      } else {
        // Android 11 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return {
            success: false,
            error: 'Location permission not granted (required for BLE)',
          };
        }
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Permission request failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Start scanning for nearby BLE devices
   */
  async startScanning(): Promise<Result<void>> {
    try {
      if (this.isScanning) {
        return { success: true, data: undefined };
      }

      this.isScanning = true;
      this.discoveredDevices.clear();

      this.manager.startDeviceScan(
        [BLE_SERVICE_UUID],
        { allowDuplicates: false },
        (error: any, device: Device | null) => {
          if (error) {
            this.handleError('scan_failed', error.message);
            return;
          }

          if (device) {
            this.handleDeviceDiscovered(device);
          }
        }
      );

      // Auto-stop scanning after configured duration
      setTimeout(() => {
        this.stopScanning();
      }, this.config.scanDuration);

      return { success: true, data: undefined };
    } catch (error) {
      this.isScanning = false;
      return {
        success: false,
        error: `Failed to start scanning: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Stop scanning for devices
   */
  stopScanning(): void {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
    }
  }

  /**
   * Handle discovered device
   */
  private handleDeviceDiscovered(device: Device): void {
    const bleDevice: BLEDevice = {
      id: device.id,
      name: device.name || device.localName || undefined,
      rssi: device.rssi || -100,
      lastSeen: Date.now(),
      isConnected: false,
    };

    this.discoveredDevices.set(device.id, bleDevice);

    // Attempt to connect and read messages
    this.connectAndReadMessages(device.id);
  }

  /**
   * Connect to a device and read messages
   */
  private async connectAndReadMessages(deviceId: string): Promise<void> {
    try {
      // Connect to device
      const device = await this.manager.connectToDevice(deviceId, {
        timeout: this.config.transmissionTimeout,
      });

      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();

      // Read message characteristic
      const characteristic = await device.readCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHARACTERISTIC_UUID
      );

      if (characteristic.value) {
        this.handleReceivedData(characteristic.value, deviceId);
      }

      // Disconnect after reading
      await device.cancelConnection();
    } catch (error) {
      // Connection errors are common in mesh networks, log but don't alert
      console.debug(`Connection to ${deviceId} failed:`, error);
    }
  }

  /**
   * Handle received BLE data
   */
  private handleReceivedData(data: string, fromDevice: string): void {
    try {
      // Decode Base64 to get packet
      const packetJson = Buffer.from(data, 'base64').toString('utf-8');
      const packet: BLEMessagePacket = JSON.parse(packetJson);

      // Check if we've already seen this message
      if (this.hasSeenMessage(packet.messageId)) {
        return; // Don't process duplicates
      }

      // Extract message from packet
      const result = extractMessageFromPacket(packet);
      if (!result.success) {
        console.error('Failed to extract message:', result.error);
        return;
      }

      // Mark as seen
      this.markMessageAsSeen(packet.messageId, fromDevice, packet.hopCount);

      // Notify callback
      if (this.messageReceivedCallback) {
        this.messageReceivedCallback(result.data, fromDevice);
      }

      // Re-broadcast if under hop limit
      if (packet.hopCount < this.config.maxHopCount) {
        this.broadcastMessage(result.data, packet.hopCount + 1);
      }
    } catch (error) {
      console.error('Error handling received data:', error);
    }
  }

  /**
   * Check if we've already seen a message
   */
  private hasSeenMessage(messageId: string): boolean {
    return this.seenMessages.has(messageId);
  }

  /**
   * Mark a message as seen
   */
  private markMessageAsSeen(messageId: string, fromDevice: string, hopCount: number): void {
    const seen = this.seenMessages.get(messageId);

    if (seen) {
      seen.fromDevices.push(fromDevice);
    } else {
      this.seenMessages.set(messageId, {
        messageId,
        firstSeen: Date.now(),
        hopCount,
        fromDevices: [fromDevice],
      });
    }

    // Clean up old seen messages (older than 1 hour)
    this.cleanupSeenMessages();
  }

  /**
   * Clean up old seen messages to prevent memory growth
   */
  private cleanupSeenMessages(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [messageId, seen] of this.seenMessages.entries()) {
      if (seen.firstSeen < oneHourAgo) {
        this.seenMessages.delete(messageId);
      }
    }
  }

  /**
   * Broadcast a message to nearby devices
   */
  async broadcastMessage(
    message: MutualAidMessage,
    hopCount: number = 0
  ): Promise<Result<void>> {
    try {
      // Create BLE packet
      const packetResult = createBLEPacket({
        ...message,
        hop_count: hopCount,
      });

      if (!packetResult.success) {
        return { success: false, error: packetResult.error };
      }

      // Encode packet for BLE
      const packetJson = JSON.stringify(packetResult.data);
      // const encoded = Buffer.from(packetJson, 'utf-8').toString('base64');

      // Mark as seen (our own message)
      this.markMessageAsSeen(message.message_id, 'local', hopCount);

      // In a real implementation, would start advertising with this data
      // For POC, we'll use writeCharacteristic to connected devices
      console.log('Broadcasting message:', message.message_id, 'hop:', hopCount, 'size:', packetJson.length);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Broadcast failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Set callback for received messages
   */
  onMessageReceived(callback: (message: MutualAidMessage, fromDevice: string) => void): void {
    this.messageReceivedCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: BLEError) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Handle BLE errors
   */
  private handleError(type: BLEErrorType, message: string, deviceId?: string): void {
    const error: BLEError = {
      type,
      message,
      deviceId,
      timestamp: Date.now(),
    };

    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  /**
   * Get discovered devices
   */
  getDiscoveredDevices(): BLEDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    devicesDiscovered: number;
    messagesSeen: number;
    isScanning: boolean;
  } {
    return {
      devicesDiscovered: this.discoveredDevices.size,
      messagesSeen: this.seenMessages.size,
      isScanning: this.isScanning,
    };
  }

  /**
   * Cleanup and destroy manager
   */
  destroy(): void {
    this.stopScanning();
    this.discoveredDevices.clear();
    this.seenMessages.clear();
    this.manager.destroy();
  }
}

export const bleManager = new BLEManagerService();
