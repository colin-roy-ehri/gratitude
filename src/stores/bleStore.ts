/**
 * BLE Store - Zustand state management for BLE operations
 * Manages BLE state, discovered devices, and message transmission
 * Uses compact binary message format for efficient BLE communication
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  BLEDevice,
  BLEError,
  BLECentralState,
  DeviceBloomFilterSet,
} from '../types/ble';
import { MutualAidMessage as CompactMessage } from '../../schemas/mutual-aid-message';
import { bleManager } from '../services/ble/bleManager';
import { uint8ArrayToHex } from '../utils/buffer';
import { BloomFilterSet } from '../services/ble/messagePartitioner';
import { messageInventory } from '../services/ble/messageInventory';

interface BLEStore {
  // State
  isInitialized: boolean;
  centralState: BLECentralState;
  isAdvertising: boolean;
  discoveredDevices: BLEDevice[];
  receivedMessages: CompactMessage[];
  errors: BLEError[];
  stats: {
    devicesDiscovered: number;
    messagesSeen: number;
    messagesReceived: number;
    messagesBroadcast: number;
  };

  // Bloom filter state
  localBloomFilterSet?: BloomFilterSet;
  discoveredBloomFilters: DeviceBloomFilterSet[];
  messageInventoryCount: number;

  // Actions
  initialize: () => Promise<void>;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  broadcastMessage: (message: CompactMessage) => Promise<void>;
  clearErrors: () => void;
  clearMessages: () => void;
  destroy: () => void;

  // Bloom filter actions
  refreshBloomFilters: () => void;

  // Advertising actions
  startAdvertising: () => Promise<void>;
  stopAdvertising: () => Promise<void>;

  // Internal handlers
  handleMessageReceived: (message: CompactMessage, fromDevice: string) => void;
  handleError: (error: BLEError) => void;
  handleBloomFilterUpdate: (filterSet: BloomFilterSet) => void;
}

export const useBLEStore = create<BLEStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      isInitialized: false,
      centralState: 'stopped',
      isAdvertising: false,
      discoveredDevices: [],
      receivedMessages: [],
      errors: [],
      stats: {
        devicesDiscovered: 0,
        messagesSeen: 0,
        messagesReceived: 0,
        messagesBroadcast: 0,
      },

      // Bloom filter state
      localBloomFilterSet: undefined,
      discoveredBloomFilters: [],
      messageInventoryCount: 0,

      // Initialize BLE manager
      initialize: async () => {
        try {
          set({ centralState: 'starting' });

          const result = await bleManager.initialize();

          if (!result.success) {
            get().handleError({
              type: 'bluetooth_off',
              message: result.error || 'BLE initialization failed',
              timestamp: Date.now(),
            });
            set({ centralState: 'stopped' });
            return;
          }

          // Set up callbacks
          bleManager.onMessageReceived((message, fromDevice) => {
            get().handleMessageReceived(message, fromDevice);
          });

          bleManager.onError((error) => {
            get().handleError(error);
          });

          bleManager.onBloomFilterUpdate((filterSet) => {
            get().handleBloomFilterUpdate(filterSet);
          });

          set({
            isInitialized: true,
            centralState: 'stopped',
          });
        } catch (error) {
          get().handleError({
            type: 'unknown',
            message: (error as Error).message,
            timestamp: Date.now(),
          });
          set({ centralState: 'stopped' });
        }
      },

      // Start scanning for devices
      startScanning: async () => {
        const { isInitialized, centralState } = get();

        if (!isInitialized) {
          await get().initialize();
        }

        if (centralState === 'scanning') {
          return; // Already scanning
        }

        set({ centralState: 'starting' });

        const result = await bleManager.startScanning();

        if (result.success) {
          set({ centralState: 'scanning' });

          // Update devices periodically while scanning
          const interval = setInterval(() => {
            if (get().centralState !== 'scanning') {
              clearInterval(interval);
              return;
            }

            const devices = bleManager.getDiscoveredDevices();
            const stats = bleManager.getStats();

            set({
              discoveredDevices: devices,
              stats: {
                ...get().stats,
                devicesDiscovered: stats.devicesDiscovered,
                messagesSeen: stats.messagesSeen,
              },
            });
          }, 1000);
        } else {
          get().handleError({
            type: 'scan_failed',
            message: result.error || 'Failed to start scanning',
            timestamp: Date.now(),
          });
          set({ centralState: 'stopped' });
        }
      },

      // Stop scanning
      stopScanning: () => {
        bleManager.stopScanning();
        set({ centralState: 'stopped' });
      },

      // Broadcast a message using compact format
      broadcastMessage: async (message: CompactMessage) => {
        const { isInitialized } = get();

        if (!isInitialized) {
          await get().initialize();
        }

        const result = await bleManager.broadcastMessage(message);

        if (result.success) {
          set((state) => ({
            stats: {
              ...state.stats,
              messagesBroadcast: state.stats.messagesBroadcast + 1,
            },
          }));
        } else {
          get().handleError({
            type: 'transmission_failed',
            message: result.error || 'Failed to broadcast message',
            timestamp: Date.now(),
          });
        }
      },

      // Handle received message
      handleMessageReceived: (message: CompactMessage, fromDevice: string) => {
        const messageId = uint8ArrayToHex(message.publicKey.slice(0, 16));
        console.log('Received message from BLE:', messageId, 'from', fromDevice);

        // Store received message
        set((state) => ({
          receivedMessages: [...state.receivedMessages, message],
          stats: {
            ...state.stats,
            messagesReceived: state.stats.messagesReceived + 1,
          },
        }));
      },

      // Handle errors
      handleError: (error: BLEError) => {
        console.error('BLE Error:', error);

        set((state) => ({
          errors: [...state.errors, error],
        }));
      },

      // Clear errors
      clearErrors: () => {
        set({ errors: [] });
      },

      // Clear received messages
      clearMessages: () => {
        set({ receivedMessages: [] });
      },

      // Refresh Bloom filters manually
      refreshBloomFilters: () => {
        bleManager.regenerateBloomFilters();
        const filterSet = bleManager.getBloomFilterSet();
        const inventoryCount = messageInventory.count();

        set({
          localBloomFilterSet: filterSet,
          messageInventoryCount: inventoryCount,
        });
      },

      // Handle Bloom filter update
      handleBloomFilterUpdate: (filterSet: BloomFilterSet) => {
        set({
          localBloomFilterSet: filterSet,
          messageInventoryCount: messageInventory.count(),
          discoveredBloomFilters: bleManager.getDiscoveredBloomFilters(),
          isAdvertising: bleManager.isCurrentlyAdvertising(),
        });
      },

      // Start advertising Bloom filters
      startAdvertising: async () => {
        const { isInitialized } = get();

        if (!isInitialized) {
          await get().initialize();
        }

        const result = await bleManager.startAdvertising();

        if (result.success) {
          set({ isAdvertising: true });
        } else {
          get().handleError({
            type: 'advertising_failed',
            message: result.error || 'Failed to start advertising',
            timestamp: Date.now(),
          });
        }
      },

      // Stop advertising
      stopAdvertising: async () => {
        await bleManager.stopAdvertising();
        set({ isAdvertising: false });
      },

      // Destroy BLE manager
      destroy: () => {
        bleManager.destroy();
        messageInventory.clear();
        set({
          isInitialized: false,
          centralState: 'stopped',
          isAdvertising: false,
          discoveredDevices: [],
          receivedMessages: [],
          errors: [],
          localBloomFilterSet: undefined,
          discoveredBloomFilters: [],
          messageInventoryCount: 0,
        });
      },
    }),
    { name: 'ble-store' }
  )
);
