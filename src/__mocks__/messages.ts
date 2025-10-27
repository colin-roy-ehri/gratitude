/**
 * Mock messages for testing
 */

import { MutualAidMessage } from '../types/message';

export const mockNeedMessage: MutualAidMessage = {
  message_id: '550e8400-e29b-41d4-a716-446655440000',
  version: 1,
  type: 'NEED',
  timestamp: '2025-10-26T14:30:00Z',
  in_response_to: null,
  hop_count: 0,
  public: {
    category: {
      primary: 'FOOD',
      secondary: ['Groceries'],
      attributes: {
        dietary: ['Vegetarian'],
        preparation: ['Raw_ingredients'],
        portion: 'Family_small_2-4',
      },
    },
    location: {
      coords: '37.423±0.05,-122.084±0.05',
      precision_level: 'low',
    },
    time: {
      pattern: 'This_week',
      windows: [
        {
          days: ['Mon', 'Tue', 'Wed'],
          time_blocks: ['Afternoon_15-18', 'Evening_18-21'],
        },
      ],
    },
    quantity: 'Medium_amount',
    recurrence_pattern: 'One_time',
  },
  coordination_key: 'MCowBQYDK2VuAyEA...',
  encrypted_payloads: [],
  metadata: {
    relay_eligible: true,
    expires_at: '2025-11-02T14:30:00Z',
    priority: 'normal',
    createdLocally: true,
  },
};

export const mockOfferMessage: MutualAidMessage = {
  message_id: '650e8400-e29b-41d4-a716-446655440001',
  version: 1,
  type: 'OFFER',
  timestamp: '2025-10-26T15:00:00Z',
  in_response_to: '550e8400-e29b-41d4-a716-446655440000',
  hop_count: 0,
  public: {
    category: {
      primary: 'FOOD',
      secondary: ['Groceries'],
      attributes: {
        dietary: ['Vegetarian'],
        preparation: ['Ready_to_eat'],
        portion: 'Family_small_2-4',
      },
    },
    location: {
      coords: '37.420±0.05,-122.080±0.05',
      precision_level: 'low',
    },
    time: {
      pattern: 'Today',
      windows: [
        {
          days: ['Tue'],
          time_blocks: ['Evening_18-21'],
        },
      ],
    },
    quantity: 'Medium_amount',
    recurrence_pattern: 'One_time',
  },
  coordination_key: 'MCowBQYDK2VuAyEB...',
  encrypted_payloads: [],
  metadata: {
    relay_eligible: true,
    expires_at: '2025-11-02T15:00:00Z',
    priority: 'high',
  },
};

export const mockCoordinationMessage: MutualAidMessage = {
  message_id: '750e8400-e29b-41d4-a716-446655440002',
  version: 1,
  type: 'COORDINATION',
  timestamp: '2025-10-26T16:00:00Z',
  in_response_to: '650e8400-e29b-41d4-a716-446655440001',
  hop_count: 0,
  public: {
    category: {
      primary: 'FOOD',
    },
    location: {
      coords: '37.423±0.05,-122.084±0.05',
      precision_level: 'low',
    },
  },
  coordination_key: 'MCowBQYDK2VuAyEC...',
  encrypted_payloads: [
    {
      recipient_key: 'MCowBQYDK2VuAyEB...',
      nonce: 'abcdef1234567890',
      payload: 'encrypted_data_here',
      payload_size: 256, // Must be multiple of 256
      hint: 'for_coordination',
    },
  ],
  metadata: {
    relay_eligible: true,
    expires_at: '2025-10-28T16:00:00Z',
    priority: 'high',
  },
};

export const mockInvalidMessage = {
  message_id: 'invalid-uuid',
  version: 1,
  type: 'NEED',
  // Missing required fields
};
