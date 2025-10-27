/**
 * BLE Store - Zustand state management for BLE operations
 * Manages BLE state, discovered devices, and message transmission
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  BLEDevice,
  BLEError,
  BLECentralState,
} from '../types/ble';
import { MutualAidMessage } from '../types/message';
import { bleManager } from '../services/ble/bleManager';
import { useMessageStore } from './messageStore';

interface BLEStore {
  // State
  isInitialized: boolean;
  centralState: BLECentralState;
  discoveredDevices: BLEDevice[];
  errors: BLEError[];
  stats: {
    devicesDiscovered: number;
    messagesSeen: number;
    messagesReceived: number;
    messagesBroadcast: number;
  };

  // Actions
  initialize: () => Promise<void>;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  broadcastMessage: (message: MutualAidMessage) => Promise<void>;
  clearErrors: () => void;
  destroy: () => void;

  // Internal handlers
  handleMessageReceived: (message: MutualAidMessage, fromDevice: string) => void;
  handleError: (error: BLEError) => void;
}

export const useBLEStore = create<BLEStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      isInitialized: false,
      centralState: 'stopped',
      discoveredDevices: [],
      errors: [],
      stats: {
        devicesDiscovered: 0,
        messagesSeen: 0,
        messagesReceived: 0,
        messagesBroadcast: 0,
      },

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

      // Broadcast a message
      broadcastMessage: async (message: MutualAidMessage) => {
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
      handleMessageReceived: (message: MutualAidMessage, fromDevice: string) => {
        console.log('Received message from BLE:', message.message_id, 'from', fromDevice);

        // Add message to message store
        useMessageStore.getState().addMessage(message);

        // Update stats
        set((state) => ({
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

      // Destroy BLE manager
      destroy: () => {
        bleManager.destroy();
        set({
          isInitialized: false,
          centralState: 'stopped',
          discoveredDevices: [],
          errors: [],
        });
      },
    }),
    { name: 'ble-store' }
  )
);
