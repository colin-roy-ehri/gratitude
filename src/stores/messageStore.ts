/**
 * Message Store - Zustand state management for messages
 * Manages all messages, filters, and message operations
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MutualAidMessage,
  MessageType,
  PrimaryCategory,
} from '../types/message';
import { Result } from '../types/common';
import { messageManager } from '../services/messageManager';
import { messageStoreService } from '../services/storage/messageStore';

interface MessageFilters {
  type: MessageType[];
  category: PrimaryCategory[];
  distance: number; // km
  timeRange: 'today' | 'week' | 'all';
}

interface MessageStore {
  // State
  messages: MutualAidMessage[];
  myMessages: MutualAidMessage[];
  loading: boolean;
  error: string | null;
  lastSyncTimestamp: number | null;

  // Filters
  filters: MessageFilters;

  // Actions - CRUD
  loadMessages: () => Promise<void>;
  addMessage: (message: MutualAidMessage) => void;
  updateMessage: (id: string, updates: Partial<MutualAidMessage>) => void;
  deleteMessage: (id: string) => Promise<void>;

  // Actions - Creation
  createNeed: (
    params: Parameters<typeof messageManager.createNeed>[0]
  ) => Promise<Result<MutualAidMessage>>;
  createOffer: (
    params: Parameters<typeof messageManager.createOffer>[0]
  ) => Promise<Result<MutualAidMessage>>;

  // Actions - Filters
  setFilters: (filters: Partial<MessageFilters>) => void;
  clearFilters: () => void;

  // Actions - Utility
  markMessageExpired: (id: string) => void;
  clearError: () => void;
  clearMessages: () => Promise<void>;

  // Selectors (computed state)
  getFilteredMessages: () => MutualAidMessage[];
  getMyRequests: () => MutualAidMessage[];
  getMyOffers: () => MutualAidMessage[];
  getMessageById: (id: string) => MutualAidMessage | undefined;
  getNearbyMessages: (lat: number, lon: number, radiusKm: number) => MutualAidMessage[];
}

export const useMessageStore = create<MessageStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        messages: [],
        myMessages: [],
        loading: false,
        error: null,
        lastSyncTimestamp: null,
        filters: {
          type: [],
          category: [],
          distance: 10,
          timeRange: 'all',
        },

        // Load messages from storage
        loadMessages: async () => {
          set({ loading: true, error: null });
          try {
            const messages = await messageStoreService.getAllMessages();
            const myMessages = messages.filter((msg) => msg.metadata?.createdLocally);

            set({
              messages,
              myMessages,
              loading: false,
              lastSyncTimestamp: Date.now(),
            });
          } catch (error) {
            set({
              error: (error as Error).message,
              loading: false,
            });
          }
        },

        // Add new message (from BLE or local creation)
        addMessage: (message) => {
          set((state) => {
            // Check if message already exists
            const exists = state.messages.some((m) => m.message_id === message.message_id);
            if (exists) {
              return state; // Don't add duplicates
            }

            return {
              messages: [...state.messages, message],
              myMessages: message.metadata?.createdLocally
                ? [...state.myMessages, message]
                : state.myMessages,
            };
          });
        },

        // Update existing message
        updateMessage: (id, updates) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.message_id === id ? { ...msg, ...updates } : msg
            ),
            myMessages: state.myMessages.map((msg) =>
              msg.message_id === id ? { ...msg, ...updates } : msg
            ),
          }));
        },

        // Delete message
        deleteMessage: async (id) => {
          set({ loading: true, error: null });
          try {
            const result = await messageManager.deleteMessage(id);
            if (result.success) {
              set((state) => ({
                messages: state.messages.filter((msg) => msg.message_id !== id),
                myMessages: state.myMessages.filter((msg) => msg.message_id !== id),
                loading: false,
              }));
            } else {
              set({ error: result.error, loading: false });
            }
          } catch (error) {
            set({
              error: (error as Error).message,
              loading: false,
            });
          }
        },

        // Create NEED message
        createNeed: async (params) => {
          set({ loading: true, error: null });
          try {
            const result = await messageManager.createNeed(params);

            if (result.success) {
              get().addMessage(result.data);
              // Note: BLE broadcast will be triggered in Phase 2
            } else {
              set({ error: result.error });
            }

            set({ loading: false });
            return result;
          } catch (error) {
            const errorMsg = (error as Error).message;
            set({ error: errorMsg, loading: false });
            return { success: false, error: errorMsg };
          }
        },

        // Create OFFER message
        createOffer: async (params) => {
          set({ loading: true, error: null });
          try {
            const result = await messageManager.createOffer(params);

            if (result.success) {
              get().addMessage(result.data);
              // Note: BLE broadcast will be triggered in Phase 2
            } else {
              set({ error: result.error });
            }

            set({ loading: false });
            return result;
          } catch (error) {
            const errorMsg = (error as Error).message;
            set({ error: errorMsg, loading: false });
            return { success: false, error: errorMsg };
          }
        },

        // Set filters
        setFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters },
          }));
        },

        // Clear all filters
        clearFilters: () => {
          set({
            filters: {
              type: [],
              category: [],
              distance: 10,
              timeRange: 'all',
            },
          });
        },

        // Mark message as expired
        markMessageExpired: (id) => {
          get().updateMessage(id, {
            metadata: {
              ...get().getMessageById(id)?.metadata,
              expires_at: new Date().toISOString(),
            },
          });
        },

        // Clear error
        clearError: () => set({ error: null }),

        // Clear all messages (for testing/reset)
        clearMessages: async () => {
          await messageStoreService.clearAll();
          set({ messages: [], myMessages: [] });
        },

        // Selectors
        getFilteredMessages: () => {
          const { messages, filters } = get();
          return messages.filter((msg) => {
            // Filter by type
            if (filters.type.length > 0 && !filters.type.includes(msg.type)) {
              return false;
            }

            // Filter by category
            if (
              filters.category.length > 0 &&
              msg.public.category &&
              !filters.category.includes(msg.public.category.primary)
            ) {
              return false;
            }

            // Filter by time
            if (filters.timeRange === 'today') {
              const today = new Date().setHours(0, 0, 0, 0);
              if (new Date(msg.timestamp) < new Date(today)) {
                return false;
              }
            } else if (filters.timeRange === 'week') {
              const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
              if (new Date(msg.timestamp).getTime() < weekAgo) {
                return false;
              }
            }

            return true;
          });
        },

        getMyRequests: () => {
          return get().myMessages.filter((msg) => msg.type === 'NEED');
        },

        getMyOffers: () => {
          return get().myMessages.filter((msg) => msg.type === 'OFFER');
        },

        getMessageById: (id) => {
          return get().messages.find((msg) => msg.message_id === id);
        },

        getNearbyMessages: (_lat, _lon, _radiusKm) => {
          // TODO: Implement distance calculation using location utils
          // For now, return all messages
          return get().messages;
        },
      }),
      {
        name: 'message-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          messages: state.messages,
          myMessages: state.myMessages,
          filters: state.filters,
        }),
      }
    )
  )
);
