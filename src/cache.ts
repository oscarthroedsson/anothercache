import { CacheOptions, CacheEntry, CacheAlarm } from './types';
import * as setOps from './operations/set';
import * as getOps from './operations/get';
import * as deleteOps from './operations/delete';
import * as mutateOps from './operations/mutate';
import * as utilityOps from './operations/utility';
import * as cleanupOps from './operations/cleanup';
import { CacheRegistry } from './utils/registry';

export class Cache<K = string, V = any> {
  private storage: Map<K, CacheEntry<V>>;
  private maxEntries: number;
  private maxBytes?: number;
  private ttl?: number;
  private cleanupInterval?: number;
  private cleanupTimer?: ReturnType<typeof setInterval> | number;
  private alarm?: CacheAlarm;

  constructor(options: CacheOptions = {}) {
    this.storage = new Map();
    this.maxEntries = options.maxEntries || Infinity;
    this.maxBytes = options.maxBytes;
    this.ttl = options.ttl;
    this.cleanupInterval = options.cleanupInterval || 60000; // Default 1 minute
    this.alarm = options.alarm;

    // Register the instance in the registry
    CacheRegistry.register(this);

    if (this.ttl && this.cleanupInterval) {
      this.startCleanup();
    }
  }

  // ========== Set Operations ==========

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    setOps.set(this.getSetOperations(), key, value);
  }

  /**
   * Set multiple values at once
   */
  setMany(entries: Array<[K, V]>): void {
    setOps.setMany(this.getSetOperations(), entries);
  }

  // ========== Get Operations ==========

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    return getOps.get(this.getGetOperations(), key);
  }

  /**
   * Get multiple values at once
   */
  getMany(keys: K[]): Array<V | undefined> {
    return getOps.getMany(this.getGetOperations(), keys);
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: K): boolean {
    return getOps.has(this.getGetOperations(), key);
  }

  /**
   * Get entry with metadata (createdAt, expiresAt)
   */
  getEntry(key: K): CacheEntry<V> | undefined {
    return getOps.getEntry(this.getGetOperations(), key);
  }

  // ========== Delete Operations ==========

  /**
   * Delete a value from the cache
   */
  delete(key: K): boolean {
    return deleteOps.del(this.getDeleteOperations(), key);
  }

  /**
   * Delete multiple values at once
   */
  deleteMany(keys: K[]): number {
    return deleteOps.deleteMany(this.getDeleteOperations(), keys);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    deleteOps.clear(this.getDeleteOperations());
  }

  // ========== Mutate Operations ==========

  /**
   * Update an existing value using a function
   */
  mutate(key: K, updater: (value: V) => V): V | undefined {
    return mutateOps.mutate(this.getMutateOperations(), key, updater);
  }

  /**
   * Update an existing value, or set if it doesn't exist
   */
  upsert(key: K, valueOrUpdater: V | ((value: V | undefined) => V)): V {
    return mutateOps.upsert(this.getMutateOperations(), key, valueOrUpdater);
  }

  /**
   * Increment a numeric value
   * Note: Only works when V is number
   */
  increment(key: K, amount: number = 1): number | undefined {
    return mutateOps.increment(
      this.getMutateOperations() as mutateOps.MutateOperations<K, number>,
      key,
      amount
    );
  }

  /**
   * Decrement a numeric value
   * Note: Only works when V is number
   */
  decrement(key: K, amount: number = 1): number | undefined {
    return mutateOps.decrement(
      this.getMutateOperations() as mutateOps.MutateOperations<K, number>,
      key,
      amount
    );
  }

  /**
   * Append to an array value
   * Note: Only works when V is an array type
   */
  append<T>(key: K, ...items: T[]): T[] | undefined {
    return mutateOps.append(
      this.getMutateOperations() as mutateOps.MutateOperations<K, T[]>,
      key,
      ...items
    );
  }

  /**
   * Merge an object value
   * Note: Only works when V extends Record<string, any>
   */
  merge<T extends Record<string, any>>(
    key: K,
    updates: Partial<T>
  ): T | undefined {
    return mutateOps.merge(
      this.getMutateOperations() as unknown as mutateOps.MutateOperations<K, T>,
      key,
      updates
    );
  }

  // ========== Utility Operations ==========

  /**
   * Get the size of the cache (number of entries)
   */
  size(): number {
    return utilityOps.size(this.getUtilityOperations());
  }

  /**
   * Get the size of the cache in bytes
   */
  sizeInBytes(): number {
    return utilityOps.sizeInBytes(this.getUtilityOperations());
  }

  /**
   * Get all keys in the cache
   */
  keys(): K[] {
    return utilityOps.keys(this.getUtilityOperations());
  }

  /**
   * Get all values in the cache
   */
  values(): V[] {
    return utilityOps.values(this.getUtilityOperations());
  }

  /**
   * Get all entries in the cache
   */
  entries(): Array<[K, V]> {
    return utilityOps.entries(this.getUtilityOperations());
  }

  /**
   * Check if cache is empty
   */
  isEmpty(): boolean {
    return utilityOps.isEmpty(this.getUtilityOperations());
  }

  /**
   * Get a random key from the cache
   */
  randomKey(): K | undefined {
    return utilityOps.randomKey(this.getUtilityOperations());
  }

  // ========== Cleanup Operations ==========

  /**
   * Cleanup expired entries manually
   */
  cleanupExpired(): number {
    return cleanupOps.cleanupExpired(this.getCleanupOperations());
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = cleanupOps.startCleanup(this.getCleanupOperations());
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    cleanupOps.stopCleanup(this.cleanupTimer);
    this.cleanupTimer = undefined;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
    CacheRegistry.unregister(this);
  }

  /**
   * Get alarm configuration (used internally by registry)
   */
  getAlarmConfig(): CacheAlarm | undefined {
    return this.alarm;
  }

  // ========== Internal Helpers ==========

  private getSetOperations(): setOps.SetOperations<K, V> {
    return {
      storage: this.storage,
      maxEntries: this.maxEntries,
      maxBytes: this.maxBytes,
      ttl: this.ttl,
    };
  }

  private getGetOperations(): getOps.GetOperations<K, V> {
    return {
      storage: this.storage,
    };
  }

  private getDeleteOperations(): deleteOps.DeleteOperations<K, V> {
    return {
      storage: this.storage,
    };
  }

  private getMutateOperations(): mutateOps.MutateOperations<K, V> {
    return {
      storage: this.storage,
      maxEntries: this.maxEntries,
      maxBytes: this.maxBytes,
      ttl: this.ttl,
    };
  }

  private getUtilityOperations(): utilityOps.UtilityOperations<K, V> {
    return {
      storage: this.storage,
      ttl: this.ttl,
    };
  }

  private getCleanupOperations(): cleanupOps.CleanupOperations<K, V> {
    return {
      storage: this.storage,
      ttl: this.ttl,
      cleanupInterval: this.cleanupInterval,
    };
  }
}
