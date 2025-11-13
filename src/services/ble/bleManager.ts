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
  BLE_INVENTORY_CHARACTERISTIC_UUID,
  DeviceBloomFilterSet,
} from '../../types/ble';
import { MutualAidMessage as CompactMessage } from '../../../schemas/mutual-aid-message';
import { Result } from '../../types/common';
import { createBLEPacket, extractMessageFromPacket } from './bleProtocol';
import { MessagePartitioner, BloomFilterSet, AdvertisementPayload } from './messagePartitioner';
import { messageInventory } from './messageInventory';
import { BloomFilter } from './bloomFilter';
import { bleAdvertiser } from './bleAdvertiser';
import { bleScanner, ScannedDevice } from './bleScanner';

class BLEManagerService {
  private manager: BleManager;
  private config: BLEConfig;
  private isScanning: boolean = false;
  private discoveredDevices: Map<string, BLEDevice> = new Map();
  private seenMessages: Map<string, SeenMessage> = new Map();
  private messageReceivedCallback?: (message: CompactMessage, fromDevice: string) => void;
  private errorCallback?: (error: BLEError) => void;

  // Bloom filter support
  private localBloomFilterSet?: BloomFilterSet;
  private discoveredBloomFilters: Map<string, DeviceBloomFilterSet> = new Map();
  private bloomFilterUpdateCallback?: (filterSet: BloomFilterSet) => void;

  // Advertising state
  private isAdvertising: boolean = false;
  private batteryLevel: number = 100;

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

      // Check if Bluetooth is enabled (central mode)
      const state = await this.manager.state();
      if (state !== State.PoweredOn) {
        return {
          success: false,
          error: 'Bluetooth is not enabled. Please enable Bluetooth.',
        };
      }

      // Initialize advertiser
      const advertiserResult = await bleAdvertiser.initialize();
      if (!advertiserResult.success) {
        console.warn('Advertiser initialization failed:', advertiserResult.error);
        // Continue anyway - scanning might still work
      }

      // Set up scanner callback for receiving Bloom filter advertisements
      bleScanner.onAdvertisementReceived((device: ScannedDevice) => {
        this.handleBloomFilterAdvertisement(device.deviceId, device.payload);
      });

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

      // Start BLE advertiser scanning (for Bloom filters)
      const scanResult = await bleScanner.startScanning();
      if (!scanResult.success) {
        this.isScanning = false;
        return scanResult;
      }

      // Also start traditional BLE-PLX scanning for connections
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

      console.log('Started dual-mode BLE scanning (advertisements + connections)');

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
      bleScanner.stopScanning();
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
      // Decode Base64 to get packet using atob (React Native compatible)
      const packetJson = atob(data);
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

      // Add to message inventory
      const isNew = messageInventory.add(result.data, fromDevice, false);

      if (isNew) {
        console.log('Added received message to inventory:', packet.messageId);
        // Regenerate Bloom filters with updated inventory
        this.regenerateBloomFilters();
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
    message: CompactMessage,
    hopCount: number = 0
  ): Promise<Result<void>> {
    try {
      // Create BLE packet (includes encoding to binary format)
      const packetResult = createBLEPacket(message);

      if (!packetResult.success) {
        return { success: false, error: packetResult.error };
      }

      const packet = packetResult.data;

      // Add to message inventory if new
      const isNew = messageInventory.add(message, 'local', true);

      if (isNew) {
        console.log('Added new message to inventory:', packet.messageId);
        // Regenerate Bloom filters with updated inventory
        this.regenerateBloomFilters();
      }

      // Mark as seen (our own message)
      // Use the packet's messageId which is derived from public key
      this.markMessageAsSeen(packet.messageId, 'local', hopCount);

      // TODO: Implement actual BLE advertising with Bloom filters
      // For now, just log that we would broadcast
      console.log('Broadcasting message:', packet.messageId, 'hop:', hopCount);
      console.log(
        `Current inventory: ${messageInventory.count()} messages, ${this.localBloomFilterSet?.filters.length || 0} Bloom filters`
      );

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
  onMessageReceived(callback: (message: CompactMessage, fromDevice: string) => void): void {
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
   * Regenerate Bloom filter set from current message inventory
   */
  regenerateBloomFilters(): void {
    const messages = messageInventory.getAll();
    this.localBloomFilterSet = MessagePartitioner.partition(messages);

    console.log(
      `Generated ${this.localBloomFilterSet.filters.length} Bloom filters for ${messages.length} messages`
    );
    console.log(
      `Estimated false positive rate: ${(this.localBloomFilterSet.estimatedFalsePositiveRate * 100).toFixed(1)}%`
    );

    // Notify callback
    if (this.bloomFilterUpdateCallback && this.localBloomFilterSet) {
      this.bloomFilterUpdateCallback(this.localBloomFilterSet);
    }

    // Restart advertising with new filters if currently advertising
    if (this.isAdvertising) {
      this.startAdvertising();
    }
  }

  /**
   * Start advertising Bloom filters
   */
  async startAdvertising(batteryLevel?: number): Promise<Result<void>> {
    try {
      if (batteryLevel !== undefined) {
        this.batteryLevel = batteryLevel;
      }

      if (!this.localBloomFilterSet || this.localBloomFilterSet.filters.length === 0) {
        // Generate Bloom filters if we don't have any
        this.regenerateBloomFilters();

        if (!this.localBloomFilterSet || this.localBloomFilterSet.filters.length === 0) {
          return {
            success: false,
            error: 'No messages to advertise. Create some messages first.',
          };
        }
      }

      // Generate advertisement payloads
      const flags = 0; // TODO: Add capability flags
      const payloads = MessagePartitioner.serializeForAdvertisement(
        this.localBloomFilterSet,
        this.batteryLevel,
        flags
      );

      if (payloads.length === 0) {
        return {
          success: false,
          error: 'Failed to generate advertisement payloads',
        };
      }

      // Start advertising
      const result = await bleAdvertiser.startAdvertising(payloads, this.batteryLevel, flags);

      if (result.success) {
        this.isAdvertising = true;
        console.log(`Started advertising ${payloads.length} Bloom filter payloads`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to start advertising: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Stop advertising
   */
  async stopAdvertising(): Promise<void> {
    if (this.isAdvertising) {
      await bleAdvertiser.stopAdvertising();
      this.isAdvertising = false;
      console.log('Stopped advertising Bloom filters');
    }
  }

  /**
   * Check if currently advertising
   */
  isCurrentlyAdvertising(): boolean {
    return this.isAdvertising;
  }

  /**
   * Get current Bloom filter set
   */
  getBloomFilterSet(): BloomFilterSet | undefined {
    return this.localBloomFilterSet;
  }

  /**
   * Get discovered Bloom filter sets from other devices
   */
  getDiscoveredBloomFilters(): DeviceBloomFilterSet[] {
    return Array.from(this.discoveredBloomFilters.values());
  }

  /**
   * Set callback for Bloom filter updates
   */
  onBloomFilterUpdate(callback: (filterSet: BloomFilterSet) => void): void {
    this.bloomFilterUpdateCallback = callback;
  }

  /**
   * Check if we should connect to a device based on Bloom filter analysis
   * Returns true if the device likely has messages we don't have
   */
  private shouldConnectToDevice(deviceId: string): boolean {
    const deviceFilters = this.discoveredBloomFilters.get(deviceId);

    if (!deviceFilters) {
      // No Bloom filter data yet, skip for now
      return false;
    }

    if (!this.localBloomFilterSet || this.localBloomFilterSet.totalMessages === 0) {
      // We have no messages, so we should receive from anyone
      return deviceFilters.messageCount > 0;
    }

    // Check if any of our messages are NOT in their Bloom filters
    // This means they might need our messages
    const ourMessages = messageInventory.getAllPublicKeys();
    let potentiallyNewForThem = false;

    for (const publicKey of ourMessages) {
      // Check against all their filters
      let inAnyFilter = false;

      for (const [filterIndex, filterData] of deviceFilters.filters.entries()) {
        const filter = new BloomFilter(filterData);

        // Check if this message belongs to this filter's partition
        if (
          this.localBloomFilterSet &&
          MessagePartitioner.messageInFilter(
            publicKey,
            filterIndex,
            this.localBloomFilterSet.partitionBits
          )
        ) {
          if (filter.contains(publicKey)) {
            inAnyFilter = true;
            break;
          }
        }
      }

      if (!inAnyFilter) {
        potentiallyNewForThem = true;
        break;
      }
    }

    return potentiallyNewForThem;
  }

  /**
   * Handle discovered Bloom filter advertisement
   */
  private handleBloomFilterAdvertisement(deviceId: string, payload: AdvertisementPayload): void {
    let deviceFilters = this.discoveredBloomFilters.get(deviceId);

    if (!deviceFilters) {
      deviceFilters = {
        deviceId,
        filters: new Map(),
        totalFilters: payload.totalFilters,
        messageCount: payload.messageCount,
        lastSeen: Date.now(),
        batteryLevel: payload.batteryLevel,
        flags: payload.flags,
      };
      this.discoveredBloomFilters.set(deviceId, deviceFilters);
    }

    // Update filter data
    deviceFilters.filters.set(payload.filterIndex, payload.bloomFilter);
    deviceFilters.lastSeen = Date.now();
    deviceFilters.batteryLevel = payload.batteryLevel;

    console.log(
      `Received Bloom filter ${payload.filterIndex + 1}/${payload.totalFilters} from ${deviceId} (${payload.messageCount} messages)`
    );

    // If we've collected enough filters and it looks promising, consider connecting
    // Fast scan mode: connect after seeing first filter with potential matches
    if (deviceFilters.filters.size >= 1 && this.shouldConnectToDevice(deviceId)) {
      console.log(`Bloom filter analysis suggests connecting to ${deviceId}`);
      this.connectAndExchangeInventory(deviceId);
    }
  }

  /**
   * Connect to device and exchange message inventories
   */
  private async connectAndExchangeInventory(deviceId: string): Promise<void> {
    try {
      console.log(`Connecting to ${deviceId} for inventory exchange...`);

      const device = await this.manager.connectToDevice(deviceId, {
        timeout: this.config.transmissionTimeout,
      });

      await device.discoverAllServicesAndCharacteristics();

      // Read their message inventory
      const characteristic = await device.readCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_INVENTORY_CHARACTERISTIC_UUID
      );

      if (characteristic.value) {
        const theirMessageIds = this.decodeMessageInventory(characteristic.value);
        console.log(`Device ${deviceId} has ${theirMessageIds.length} messages`);

        // Calculate what we need to send
        const messagesToSend = messageInventory.calculateMessagesToSend(theirMessageIds);
        console.log(`Will send ${messagesToSend.length} messages to ${deviceId}`);

        // Calculate what we need to receive
        const messageIdsToReceive =
          messageInventory.calculateMessageIdsToReceive(theirMessageIds);
        console.log(`Will request ${messageIdsToReceive.length} messages from ${deviceId}`);

        // For now, just log the exchange
        // TODO: Implement actual message transfer in Phase 3
      }

      await device.cancelConnection();
    } catch (error) {
      console.debug(`Inventory exchange with ${deviceId} failed:`, error);
    }
  }

  /**
   * Encode message inventory to Base64 for characteristic transmission
   */
  private encodeMessageInventory(messageIds: string[]): string {
    const json = JSON.stringify({ messageIds });
    return btoa(json); // Base64 encode
  }

  /**
   * Decode message inventory from Base64
   */
  private decodeMessageInventory(data: string): string[] {
    try {
      const json = atob(data); // Base64 decode
      const parsed = JSON.parse(json);
      return parsed.messageIds || [];
    } catch (error) {
      console.error('Failed to decode message inventory:', error);
      return [];
    }
  }

  /**
   * Cleanup and destroy manager
   */
  destroy(): void {
    this.stopScanning();
    this.stopAdvertising();
    this.discoveredDevices.clear();
    this.seenMessages.clear();
    this.discoveredBloomFilters.clear();
    this.manager.destroy();
  }
}

export const bleManager = new BLEManagerService();
