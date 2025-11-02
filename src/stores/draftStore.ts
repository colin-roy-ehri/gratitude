import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, Location, Time, QuantityLevel, RecurrencePattern } from '../types/message';

/**
 * Draft state for wizard forms
 */
export interface WizardDraft {
  id: string;
  type: 'request' | 'offer';
  createdAt: string;
  updatedAt: string;
  currentStep: number;

  // Step data
  category?: Category;
  details?: Record<string, any>; // Category-specific attributes
  time?: Time;
  location?: Location;
  quantity?: QuantityLevel;
  recurrencePattern?: RecurrencePattern;
  note?: string;

  // Offer-specific
  inResponseTo?: string; // Message ID
}

interface DraftStore {
  // State
  drafts: WizardDraft[];

  // Actions
  createDraft: (type: 'request' | 'offer', inResponseTo?: string) => string;
  updateDraft: (id: string, updates: Partial<WizardDraft>) => void;
  getDraft: (id: string) => WizardDraft | undefined;
  deleteDraft: (id: string) => void;
  clearOldDrafts: (daysOld?: number) => void;
}

/**
 * Store for managing wizard drafts with auto-save persistence
 */
export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      drafts: [],

      createDraft: (type, inResponseTo) => {
        const id = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const draft: WizardDraft = {
          id,
          type,
          createdAt: now,
          updatedAt: now,
          currentStep: 1,
          inResponseTo,
        };

        set((state) => ({
          drafts: [...state.drafts, draft],
        }));

        return id;
      },

      updateDraft: (id, updates) => {
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id
              ? { ...draft, ...updates, updatedAt: new Date().toISOString() }
              : draft
          ),
        }));
      },

      getDraft: (id) => {
        return get().drafts.find((draft) => draft.id === id);
      },

      deleteDraft: (id) => {
        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.id !== id),
        }));
      },

      clearOldDrafts: (daysOld = 7) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        set((state) => ({
          drafts: state.drafts.filter(
            (draft) => new Date(draft.updatedAt) > cutoffDate
          ),
        }));
      },
    }),
    {
      name: 'draft-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
