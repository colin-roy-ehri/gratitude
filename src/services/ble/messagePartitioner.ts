/**
 * Message Partitioner - Hash-based distribution of messages across Bloom filters
 * Partitions messages into filters of ~25 messages each for optimal false positive rate
 */

import { BloomFilter, getFilterIndex } from './bloomFilter';
import { MutualAidMessage } from '../../../schemas/mutual-aid-message';

export interface BloomFilterSet {
  filters: BloomFilter[];
  partitionBits: number;
  totalMessages: number;
  messagesPerFilter: number[];
  estimatedFalsePositiveRate: number;
  lastUpdated: number;
}

export class MessagePartitioner {
  private static readonly TARGET_MESSAGES_PER_FILTER = 25;

  /**
   * Create a set of Bloom filters from a list of messages
   * Messages are distributed based on hash prefix for natural load balancing
   */
  static partition(messages: MutualAidMessage[]): BloomFilterSet {
    const totalMessages = messages.length;

    if (totalMessages === 0) {
      return {
        filters: [],
        partitionBits: 0,
        totalMessages: 0,
        messagesPerFilter: [],
        estimatedFalsePositiveRate: 0,
        lastUpdated: Date.now(),
      };
    }

    // Calculate number of filters needed
    const numFilters = Math.ceil(totalMessages / this.TARGET_MESSAGES_PER_FILTER);

    // Calculate partition bits (log2 of num filters, rounded up)
    const partitionBits = Math.ceil(Math.log2(numFilters));
    const totalFilterSlots = Math.pow(2, partitionBits);

    // Initialize filters and message counters
    const filters: BloomFilter[] = [];
    const messagesPerFilter: number[] = [];
    const messagesByFilter: Map<number, Uint8Array[]> = new Map();

    for (let i = 0; i < totalFilterSlots; i++) {
      messagesByFilter.set(i, []);
      messagesPerFilter.push(0);
    }

    // Distribute messages to filters based on hash prefix
    for (const message of messages) {
      const filterIndex = getFilterIndex(message.publicKey, partitionBits);
      const filterMessages = messagesByFilter.get(filterIndex)!;
      filterMessages.push(message.publicKey);
      messagesPerFilter[filterIndex]++;
    }

    // Build Bloom filter for each partition
    for (let i = 0; i < totalFilterSlots; i++) {
      const publicKeys = messagesByFilter.get(i)!;
      const filter = BloomFilter.fromMessages(publicKeys);
      filters.push(filter);
    }

    // Calculate average false positive rate
    const avgMessagesPerFilter = totalMessages / numFilters;
    const estimatedFalsePositiveRate = filters[0].estimateFalsePositiveRate(
      Math.ceil(avgMessagesPerFilter)
    );

    return {
      filters,
      partitionBits,
      totalMessages,
      messagesPerFilter,
      estimatedFalsePositiveRate,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Check if a message belongs to a specific filter based on hash prefix
   */
  static messageInFilter(
    publicKey: Uint8Array,
    filterIndex: number,
    partitionBits: number
  ): boolean {
    const messageFilterIndex = getFilterIndex(publicKey, partitionBits);
    return messageFilterIndex === filterIndex;
  }

  /**
   * Get statistics about filter distribution
   */
  static getDistributionStats(filterSet: BloomFilterSet): {
    min: number;
    max: number;
    mean: number;
    std: number;
    nonEmptyFilters: number;
  } {
    const counts = filterSet.messagesPerFilter.filter((c) => c > 0);

    if (counts.length === 0) {
      return { min: 0, max: 0, mean: 0, std: 0, nonEmptyFilters: 0 };
    }

    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;

    const variance =
      counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const std = Math.sqrt(variance);

    return {
      min,
      max,
      mean,
      std,
      nonEmptyFilters: counts.length,
    };
  }

  /**
   * Serialize filter set to advertisement payload format
   * Returns array of payloads, one per filter
   */
  static serializeForAdvertisement(
    filterSet: BloomFilterSet,
    batteryLevel: number,
    flags: number
  ): AdvertisementPayload[] {
    const payloads: AdvertisementPayload[] = [];

    for (let i = 0; i < filterSet.filters.length; i++) {
      const filter = filterSet.filters[i];

      // Skip empty filters
      if (filterSet.messagesPerFilter[i] === 0) {
        continue;
      }

      const payload: AdvertisementPayload = {
        bloomFilter: filter.serialize(),
        filterIndex: i,
        totalFilters: filterSet.filters.length,
        messageCount: filterSet.totalMessages,
        timestamp: Math.floor(filterSet.lastUpdated / 1000), // Unix timestamp in seconds
        batteryLevel,
        flags,
        sequenceNumber: 0, // Will be incremented during rotation
      };

      payloads.push(payload);
    }

    return payloads;
  }

  /**
   * Deserialize advertisement payload
   */
  static deserializeAdvertisement(data: Uint8Array): AdvertisementPayload | null {
    // Payload structure (27 bytes):
    // - Bloom filter: 16 bytes
    // - Filter index: 1 byte
    // - Total filters: 1 byte
    // - Message count: 1 byte
    // - Timestamp: 4 bytes (Unix seconds)
    // - Battery level: 1 byte
    // - Flags: 1 byte
    // - Sequence number: 2 bytes

    if (data.length < 27) {
      return null;
    }

    const view = new DataView(data.buffer, data.byteOffset);

    return {
      bloomFilter: data.slice(0, 16),
      filterIndex: data[16],
      totalFilters: data[17],
      messageCount: data[18],
      timestamp: view.getUint32(19, true),
      batteryLevel: data[23],
      flags: data[24],
      sequenceNumber: view.getUint16(25, true),
    };
  }
}

/**
 * Advertisement payload structure
 */
export interface AdvertisementPayload {
  bloomFilter: Uint8Array; // 16 bytes
  filterIndex: number; // Which filter in the set (0-255)
  totalFilters: number; // Total filters in set (0-255)
  messageCount: number; // Total messages across all filters (0-255)
  timestamp: number; // Unix timestamp in seconds
  batteryLevel: number; // 0-100%
  flags: number; // Capability flags (bit 0: can relay, bit 1: is stationary, etc.)
  sequenceNumber: number; // Rotation counter for synchronization (0-65535)
}

/**
 * Encode advertisement payload to bytes
 */
export function encodeAdvertisementPayload(payload: AdvertisementPayload): Uint8Array {
  const data = new Uint8Array(27);
  const view = new DataView(data.buffer);

  // Bloom filter: 16 bytes
  data.set(payload.bloomFilter, 0);

  // Metadata: 11 bytes
  data[16] = payload.filterIndex;
  data[17] = payload.totalFilters;
  data[18] = payload.messageCount;
  view.setUint32(19, payload.timestamp, true);
  data[23] = payload.batteryLevel;
  data[24] = payload.flags;
  view.setUint16(25, payload.sequenceNumber, true);

  return data;
}
