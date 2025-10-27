/**
 * BLE (Bluetooth Low Energy) type definitions
 * For mesh networking and message broadcasting
 */

import { MutualAidMessage } from './message';

/**
 * BLE device information
 */
export interface BLEDevice {
  id: string; // Device identifier
  name?: string;
  rssi: number; // Signal strength
  lastSeen: number; // Timestamp
  isConnected: boolean;
}

/**
 * BLE connection state
 */
export type BLEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

/**
 * BLE peripheral state (advertising)
 */
export type BLEPeripheralState = 'stopped' | 'starting' | 'advertising' | 'stopping';

/**
 * BLE central state (scanning)
 */
export type BLECentralState = 'stopped' | 'starting' | 'scanning' | 'stopping';

/**
 * BLE message packet for transmission
 */
export interface BLEMessagePacket {
  messageId: string;
  hopCount: number;
  timestamp: number;
  payload: string; // Base64 encoded message
  checksum: string; // For integrity verification
}

/**
 * BLE service and characteristic UUIDs
 */
export const BLE_SERVICE_UUID = '00000001-0000-1000-8000-00805f9b34fb';
export const BLE_CHARACTERISTIC_UUID = '00000002-0000-1000-8000-00805f9b34fb';

/**
 * BLE transmission result
 */
export interface BLETransmissionResult {
  success: boolean;
  deviceId?: string;
  error?: string;
  timestamp: number;
}

/**
 * BLE scan result
 */
export interface BLEScanResult {
  device: BLEDevice;
  advertisementData?: {
    serviceUUIDs?: string[];
    localName?: string;
    manufacturerData?: string;
  };
}

/**
 * BLE manager configuration
 */
export interface BLEConfig {
  maxConnections: number; // Max simultaneous connections
  scanDuration: number; // How long to scan (ms)
  advertisingInterval: number; // How often to advertise (ms)
  maxHopCount: number; // Max message hops
  transmissionTimeout: number; // Timeout for transmissions (ms)
}

/**
 * Default BLE configuration
 */
export const DEFAULT_BLE_CONFIG: BLEConfig = {
  maxConnections: 5,
  scanDuration: 10000, // 10 seconds
  advertisingInterval: 1000, // 1 second
  maxHopCount: 10,
  transmissionTimeout: 5000, // 5 seconds
};

/**
 * BLE message received event
 */
export interface BLEMessageReceivedEvent {
  message: MutualAidMessage;
  fromDevice: string;
  rssi: number;
  receivedAt: number;
}

/**
 * BLE error types
 */
export type BLEErrorType =
  | 'bluetooth_off'
  | 'permission_denied'
  | 'device_not_found'
  | 'connection_failed'
  | 'transmission_failed'
  | 'scan_failed'
  | 'advertising_failed'
  | 'unknown';

/**
 * BLE error
 */
export interface BLEError {
  type: BLEErrorType;
  message: string;
  deviceId?: string;
  timestamp: number;
}

/**
 * Seen message tracking (for flood control)
 */
export interface SeenMessage {
  messageId: string;
  firstSeen: number;
  hopCount: number;
  fromDevices: string[]; // Which devices sent it
}
