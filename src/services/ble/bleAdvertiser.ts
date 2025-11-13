/**
 * BLE Advertiser Service
 * Handles BLE peripheral/advertising mode using react-native-ble-advertiser
 * Broadcasts Bloom filters in rotating advertisements
 */

import BLEAdvertiser from 'react-native-ble-advertiser';
import { BLE_SERVICE_UUID } from '../../types/ble';
import { AdvertisementPayload, encodeAdvertisementPayload } from './messagePartitioner';
import { Result } from '../../types/common';

export class BLEAdvertiserService {
  private isAdvertising: boolean = false;
  private advertisementRotationTimer?: NodeJS.Timeout;
  private currentAdvertisementIndex: number = 0;
  private advertisementPayloads: AdvertisementPayload[] = [];
  private rotationInterval: number = 200; // ms

  /**
   * Initialize BLE advertiser
   */
  async initialize(): Promise<Result<void>> {
    try {
      // Set company ID (0xFFFF for testing)
      BLEAdvertiser.setCompanyId(0xFFFF);

      console.log('BLE Advertiser initialized with company ID 0xFFFF');

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Advertiser initialization failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Start advertising with Bloom filter payloads
   * Rotates through multiple payloads at specified interval
   */
  async startAdvertising(
    payloads: AdvertisementPayload[],
    batteryLevel: number = 100,
    flags: number = 0
  ): Promise<Result<void>> {
    try {
      if (this.isAdvertising) {
        await this.stopAdvertising();
      }

      if (payloads.length === 0) {
        return {
          success: false,
          error: 'No advertisement payloads provided',
        };
      }

      this.advertisementPayloads = payloads;
      this.currentAdvertisementIndex = 0;

      // Start with first payload
      const result = await this.broadcastPayload(payloads[0], 0);

      if (!result.success) {
        return result;
      }

      this.isAdvertising = true;

      // If multiple payloads, start rotation timer
      if (payloads.length > 1) {
        this.startRotation();
      }

      console.log(`Started advertising ${payloads.length} Bloom filter(s) with ${this.rotationInterval}ms rotation`);

      return { success: true, data: undefined };
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
    if (this.advertisementRotationTimer) {
      clearInterval(this.advertisementRotationTimer);
      this.advertisementRotationTimer = undefined;
    }

    if (this.isAdvertising) {
      try {
        BLEAdvertiser.stopBroadcast();
        this.isAdvertising = false;
        console.log('Stopped advertising');
      } catch (error) {
        console.error('Error stopping advertising:', error);
      }
    }
  }

  /**
   * Broadcast a single payload
   */
  private async broadcastPayload(
    payload: AdvertisementPayload,
    sequenceNumber: number
  ): Promise<Result<void>> {
    try {
      // Update sequence number for rotation tracking
      payload.sequenceNumber = sequenceNumber;

      // Encode to bytes
      const payloadBytes = encodeAdvertisementPayload(payload);

      // Convert to array for react-native-ble-advertiser
      // Note: The company ID is already set via setCompanyId(), so we just pass the payload
      const manufacturerDataArray = Array.from(payloadBytes);

      // Configure advertisement
      await BLEAdvertiser.broadcast(
        [BLE_SERVICE_UUID], // Service UUIDs (array)
        manufacturerDataArray, // Manufacturer data
        {
          advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_POWER,
          txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
          connectable: true,
          includeDeviceName: false,
          includeTxPowerLevel: false,
        }
      );

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to broadcast payload: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Start rotating through advertisement payloads
   */
  private startRotation(): void {
    let sequenceNumber = 0;

    this.advertisementRotationTimer = setInterval(async () => {
      if (!this.isAdvertising || this.advertisementPayloads.length === 0) {
        return;
      }

      // Move to next payload
      this.currentAdvertisementIndex =
        (this.currentAdvertisementIndex + 1) % this.advertisementPayloads.length;

      const payload = this.advertisementPayloads[this.currentAdvertisementIndex];

      // Increment sequence number
      sequenceNumber = (sequenceNumber + 1) % 65536;

      // Broadcast next payload
      const result = await this.broadcastPayload(payload, sequenceNumber);

      if (!result.success) {
        console.error('Failed to rotate advertisement:', result.error);
      }
    }, this.rotationInterval);
  }

  /**
   * Update rotation interval (ms)
   */
  setRotationInterval(intervalMs: number): void {
    this.rotationInterval = intervalMs;

    // Restart rotation with new interval if currently advertising
    if (this.isAdvertising && this.advertisementPayloads.length > 1) {
      if (this.advertisementRotationTimer) {
        clearInterval(this.advertisementRotationTimer);
      }
      this.startRotation();
    }
  }

  /**
   * Check if currently advertising
   */
  isCurrentlyAdvertising(): boolean {
    return this.isAdvertising;
  }

  /**
   * Get current advertisement stats
   */
  getStats(): {
    isAdvertising: boolean;
    payloadCount: number;
    currentIndex: number;
    rotationInterval: number;
  } {
    return {
      isAdvertising: this.isAdvertising,
      payloadCount: this.advertisementPayloads.length,
      currentIndex: this.currentAdvertisementIndex,
      rotationInterval: this.rotationInterval,
    };
  }
}

/**
 * Singleton instance
 */
export const bleAdvertiser = new BLEAdvertiserService();
