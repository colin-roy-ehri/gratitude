/**
 * Bloom Filter Implementation
 * Optimized for 16-byte (128-bit) filters storing ~25-30 messages at 8-13% false positive rate
 * Uses Ed25519 public keys (32 bytes) as input for hash functions
 */

export class BloomFilter {
  private bits: Uint8Array; // 16 bytes = 128 bits
  private readonly size: number = 128; // bits

  constructor(data?: Uint8Array) {
    if (data && data.length === 16) {
      this.bits = new Uint8Array(data);
    } else {
      this.bits = new Uint8Array(16); // All zeros
    }
  }

  /**
   * Add a message's public key to the Bloom filter
   * Uses 3 hash functions for optimal 25-message capacity
   */
  add(publicKey: Uint8Array): void {
    if (publicKey.length !== 32) {
      throw new Error('Public key must be 32 bytes');
    }

    const h1 = this.hash1(publicKey);
    const h2 = this.hash2(publicKey);
    const h3 = this.hash3(publicKey);

    this.setBit(h1);
    this.setBit(h2);
    this.setBit(h3);
  }

  /**
   * Check if a message's public key might be in the filter
   * Returns true if possibly present (with false positive probability)
   * Returns false if definitely not present (no false negatives)
   */
  contains(publicKey: Uint8Array): boolean {
    if (publicKey.length !== 32) {
      throw new Error('Public key must be 32 bytes');
    }

    const h1 = this.hash1(publicKey);
    const h2 = this.hash2(publicKey);
    const h3 = this.hash3(publicKey);

    return this.getBit(h1) && this.getBit(h2) && this.getBit(h3);
  }

  /**
   * Hash function 1: Uses bytes 0-3 of public key
   */
  private hash1(publicKey: Uint8Array): number {
    const view = new DataView(publicKey.buffer, publicKey.byteOffset);
    const value = view.getUint32(0, true); // Little-endian
    return value % this.size;
  }

  /**
   * Hash function 2: Uses bytes 8-11 of public key
   */
  private hash2(publicKey: Uint8Array): number {
    const view = new DataView(publicKey.buffer, publicKey.byteOffset);
    const value = view.getUint32(8, true);
    return value % this.size;
  }

  /**
   * Hash function 3: Uses bytes 16-19 of public key
   */
  private hash3(publicKey: Uint8Array): number {
    const view = new DataView(publicKey.buffer, publicKey.byteOffset);
    const value = view.getUint32(16, true);
    return value % this.size;
  }

  /**
   * Set a bit at the given position
   */
  private setBit(position: number): void {
    const byteIndex = Math.floor(position / 8);
    const bitIndex = position % 8;
    this.bits[byteIndex] |= (1 << bitIndex);
  }

  /**
   * Get a bit at the given position
   */
  private getBit(position: number): boolean {
    const byteIndex = Math.floor(position / 8);
    const bitIndex = position % 8;
    return (this.bits[byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * Serialize to 16-byte array for transmission
   */
  serialize(): Uint8Array {
    return new Uint8Array(this.bits);
  }

  /**
   * Get the raw bit array
   */
  getBits(): Uint8Array {
    return this.bits;
  }

  /**
   * Count number of set bits (for diagnostics)
   */
  countSetBits(): number {
    let count = 0;
    for (let i = 0; i < this.size; i++) {
      if (this.getBit(i)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all bits
   */
  clear(): void {
    this.bits.fill(0);
  }

  /**
   * Create Bloom filter from array of public keys
   */
  static fromMessages(publicKeys: Uint8Array[]): BloomFilter {
    const filter = new BloomFilter();
    for (const publicKey of publicKeys) {
      filter.add(publicKey);
    }
    return filter;
  }

  /**
   * Estimate false positive probability based on set bits and expected count
   * Formula: p ≈ (setBits / totalBits)^k where k=3 hash functions
   */
  estimateFalsePositiveRate(expectedMessageCount: number): number {
    const k = 3; // number of hash functions
    const n = expectedMessageCount;
    const m = this.size;

    // Theoretical formula: p = (1 - e^(-kn/m))^k
    const p = Math.pow(1 - Math.exp((-k * n) / m), k);
    return p;
  }
}

/**
 * Calculate partition hash from public key (for filter assignment)
 * Uses first 4 bytes as uniformly distributed hash value
 */
export function getPartitionHash(publicKey: Uint8Array): number {
  if (publicKey.length !== 32) {
    throw new Error('Public key must be 32 bytes');
  }

  const view = new DataView(publicKey.buffer, publicKey.byteOffset);
  return view.getUint32(0, true); // Little-endian uint32
}

/**
 * Get filter index (partition ID) for a message
 * @param publicKey - Message's public key
 * @param partitionBits - Number of bits used for partitioning
 * @returns Filter index (0 to 2^partitionBits - 1)
 */
export function getFilterIndex(publicKey: Uint8Array, partitionBits: number): number {
  const hash = getPartitionHash(publicKey);
  // Take the top N bits
  const mask = (1 << partitionBits) - 1;
  return (hash >>> (32 - partitionBits)) & mask;
}
