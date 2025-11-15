/**
 * BLE Scanner Service
 * Handles BLE scanning using react-native-ble-advertiser
 * Parses Bloom filter advertisements from other devices
 */

import BLEAdvertiser from 'react-native-ble-advertiser';
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { BLE_SERVICE_UUID } from '../../types/ble';
import { AdvertisementPayload, MessagePartitioner } from './messagePartitioner';
import { Result } from '../../types/common';

const eventEmitter = new NativeEventEmitter(NativeModules.BLEAdvertiser);

export interface ScannedDevice {
  deviceId: string;
  payload: AdvertisementPayload;
  rssi: number;
  scannedAt: number;
}

export class BLEScannerService {
  private isScanning: boolean = false;
  private advertisementCallback?: (device: ScannedDevice) => void;
  private eventSubscription?: any;

  /**
   * Request BLE scan permissions (Android 12+)
   */
  private async requestScanPermissions(): Promise<Result<void>> {
    try {
      if (Platform.OS !== 'android') {
        return { success: true, data: undefined };
      }

      const apiLevel = Platform.Version;

      // Android 12+ requires explicit BLUETOOTH_SCAN permission
      if (apiLevel >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        console.log('BLE scan permissions:', granted);

        if (granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED) {
          return {
            success: false,
            error: 'BLUETOOTH_SCAN permission not granted',
          };
        }

        if (granted['android.permission.BLUETOOTH_ADVERTISE'] !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('BLUETOOTH_ADVERTISE permission not granted - advertising may not work');
        }
      } else {
        // Android 11 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return {
            success: false,
            error: 'Location permission not granted (required for BLE scanning)',
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
   * Start scanning for BLE advertisements
   */
  async startScanning(): Promise<Result<void>> {
    try {
      if (this.isScanning) {
        return { success: true, data: undefined };
      }

      // Request permissions before scanning
      const permissionResult = await this.requestScanPermissions();
      if (!permissionResult.success) {
        return permissionResult;
      }

      console.log('Permissions granted, starting BLE advertisement scan...');

      // Set up event listener for advertisements
      this.eventSubscription = eventEmitter.addListener('onDeviceFound', (event) => {
        this.handleDeviceFound(event);
      });

      // Start scanning for our service UUID
      console.log('Calling BLEAdvertiser.scanByService...');
      BLEAdvertiser.scanByService(BLE_SERVICE_UUID, {
        scanMode: BLEAdvertiser.SCAN_MODE_LOW_LATENCY, // Fast scanning for mesh
      });

      this.isScanning = true;
      console.log('Started BLE scanning for advertisements');

      return { success: true, data: undefined };
    } catch (error) {
      console.error('BLE scan error:', error);
      return {
        success: false,
        error: `Failed to start scanning: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Stop scanning
   */
  async stopScanning(): Promise<void> {
    if (this.isScanning) {
      try {
        BLEAdvertiser.stopScan();

        if (this.eventSubscription) {
          this.eventSubscription.remove();
          this.eventSubscription = undefined;
        }

        this.isScanning = false;
        console.log('Stopped BLE scanning');
      } catch (error) {
        console.error('Error stopping scanning:', error);
      }
    }
  }

  /**
   * Handle discovered device advertisement
   */
  private handleDeviceFound(event: any): void {
    try {
      // Extract device info
      const deviceId = event.deviceAddress || event.deviceUUID || 'unknown';
      const rssi = event.rssi || -100;

      console.log('Device found:', deviceId, 'RSSI:', rssi);

      // Extract manufacturer data
      // react-native-ble-advertiser returns manufacturerData as array
      if (!event.manufacturerData || event.manufacturerData.length < 27) {
        // Too small to contain our payload (27 bytes)
        console.log('Manufacturer data too small:', event.manufacturerData?.length);
        return;
      }

      // The manufacturer data should be our 27-byte payload
      // (company ID is already filtered by the library)
      const payloadData = new Uint8Array(event.manufacturerData);

      console.log('Parsing payload, size:', payloadData.length);

      // Deserialize advertisement payload
      const payload = MessagePartitioner.deserializeAdvertisement(payloadData);

      if (!payload) {
        console.warn('Failed to deserialize advertisement payload');
        return;
      }

      console.log(`Received Bloom filter ${payload.filterIndex + 1}/${payload.totalFilters}, ${payload.messageCount} total messages`);

      // Create scanned device object
      const scannedDevice: ScannedDevice = {
        deviceId,
        payload,
        rssi,
        scannedAt: Date.now(),
      };

      // Notify callback
      if (this.advertisementCallback) {
        this.advertisementCallback(scannedDevice);
      }
    } catch (error) {
      console.error('Error handling device found:', error);
    }
  }

  /**
   * Set callback for discovered advertisements
   */
  onAdvertisementReceived(callback: (device: ScannedDevice) => void): void {
    this.advertisementCallback = callback;
  }

  /**
   * Check if currently scanning
   */
  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}

/**
 * Singleton instance
 */
export const bleScanner = new BLEScannerService();
