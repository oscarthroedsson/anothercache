import {
  CacheOptions,
  CacheEntry,
  CacheAlarm,
  CacheEvent,
  CacheEventHandler,
} from './types';
import * as setOps from './operations/set';
import * as getOps from './operations/get';
import * as deleteOps from './operations/delete';
import * as mutateOps from './operations/mutate';
import * as utilityOps from './operations/utility';
import * as cleanupOps from './operations/cleanup';
import { CacheRegistry } from './utils/registry';

type EventListenerMap<K, V> = Map<
  K | '*',
  Map<CacheEvent | '*', Set<CacheEventHandler<K, V>>>
>;

export class Cache<K = string, V = any> {
  private storage: Map<K, CacheEntry<V>>;
  private maxEntries: number;
  private maxBytes?: number;
  private ttl?: number;
  private cleanupInterval?: number;
  private cleanupTimer?: ReturnType<typeof setInterval> | number;
  private alarm?: CacheAlarm;
  private autoDeleteAfterUse?: boolean;
  private mergeAllowDuplicates?: boolean;
  private evictionPolicy: 'FIFO' | 'LRU';
  private eventListeners: EventListenerMap<K, V> = new Map();

  constructor(options: CacheOptions = {}) {
    this.storage = new Map();
    this.maxEntries = options.maxEntries || Infinity;
    this.maxBytes = options.maxBytes;
    this.ttl = options.ttl;
    this.cleanupInterval = options.cleanupInterval || 60000; // Default 1 minute
    this.evictionPolicy = options.evictionPolicy || 'FIFO'; // Default FIFO
    this.alarm = options.alarm;
    this.autoDeleteAfterUse = options.autoDeleteAfterUse;
    this.mergeAllowDuplicates = options.mergeAllowDuplicates;

    // Register the instance in the registry
    CacheRegistry.register(this);

    if (this.ttl && this.cleanupInterval)    this.startCleanup();
   
    
  }

  // ========== Set Operations ==========

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    setOps.set(this.getSetOperations(), key, value);
    this.emit('set', key, value);
  }

  /**
   * Set multiple values at once
   */
  setMany(entries: Array<[K, V]>): void {
    setOps.setMany(this.getSetOperations(), entries);
    const keys = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    this.emit('setMany', keys, values);
  }

  // ========== Get Operations ==========

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const value = getOps.get(this.getGetOperations(), key);
    this.emit('get', key, value);
    return value;
  }

  /**
   * Get multiple values at once
   * Returns only existing values (filters out undefined)
   */
  getMany(keys: K[]): V[] {
    const values = getOps.getMany(this.getGetOperations(), keys);
    this.emit('getMany', keys, values);
    return values;
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

  /**
   * Peek at a value without updating access time or triggering auto-delete
   * Useful for checking values without affecting eviction order
   */
  peek(key: K): V | undefined {
    return getOps.peek(this.getGetOperations(), key);
  }

  // ========== Delete Operations ==========

  /**
   * Delete a value from the cache
   */
  delete(key: K): boolean {
    const existed = deleteOps.del(this.getDeleteOperations(), key);
    if (existed) {
      this.emit('delete', key, undefined);
    }
    return existed;
  }

  /**
   * Delete multiple values at once
   */
  deleteMany(keys: K[]): number {
    const deleted = deleteOps.deleteMany(this.getDeleteOperations(), keys);
    if (deleted > 0) {
      this.emit('deleteMany', keys.slice(0, deleted), undefined);
    }
    return deleted;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    deleteOps.clear(this.getDeleteOperations());
    // Note: clear doesn't emit deleteMany event as it's a bulk operation
  }

  // ========== Mutate Operations ==========

  /**
   * Update an existing value using a function
   * @template T - Optional type parameter for better type inference in updater function (must extend V)
   */
  mutate<T extends V = V>(key: K, updater: (value: T) => T): T | undefined {
    const result = mutateOps.mutate(
      this.getMutateOperations(),
      key,
      updater as unknown as (value: V) => V
    ) as T | undefined;
    this.emit('mutate', key, result);
    return result;
  }

  /**
   * Update an existing value, or set if it doesn't exist
   */
  upsert(key: K, valueOrUpdater: V | ((value: V | undefined) => V)): V {
    const result = mutateOps.upsert(
      this.getMutateOperations(),
      key,
      valueOrUpdater
    );
    this.emit('upsert', key, result);
    return result;
  }

  /**
   * Increment a numeric value
   * Note: Only works when V is number
   */
  increment(key: K, amount: number = 1): number | undefined {
    const result = mutateOps.increment(
      this.getMutateOperations() as mutateOps.MutateOperations<K, number>,
      key,
      amount
    );
    this.emit('increment', key, result as any);
    return result;
  }

  /**
   * Decrement a numeric value
   * Note: Only works when V is number
   */
  decrement(key: K, amount: number = 1): number | undefined {
    const result = mutateOps.decrement(
      this.getMutateOperations() as mutateOps.MutateOperations<K, number>,
      key,
      amount
    );
    this.emit('decrement', key, result as any);
    return result;
  }

  /**
   * Append to an array value
   * Note: Only works when V is an array type
   */
  append<T>(key: K, ...items: T[]): T[] | undefined {
    const result = mutateOps.append(
      this.getMutateOperations() as mutateOps.MutateOperations<K, T[]>,
      key,
      ...items
    );
    this.emit('append', key, result as any);
    return result;
  }

  /**
   * Merge values based on type:
   * - Objects: Shallow merge properties
   * - Arrays: Concatenate (with optional duplicate filtering)
   * - Strings: Concatenate
   * - Numbers: Concatenate as strings then convert back to number (4 + 2 = 42)
   */
  merge(
    key: K,
    updates: any,
    options?: { allowDuplicates?: boolean }
  ): V | undefined {
    const mergeOptions = {
      allowDuplicates:
        options?.allowDuplicates ?? this.mergeAllowDuplicates ?? false,
    };
    const result = mutateOps.merge(
      this.getMutateOperations(),
      key,
      updates,
      mergeOptions
    );
    this.emit('merge', key, result);
    return result;
  }

  // ========== Utility Operations ==========

  /**
   * Get the size of the cache (number of entries)
   */
  size(): number {
    const result = utilityOps.size(this.getUtilityOperations());
    this.emit('size', undefined, undefined);
    return result;
  }

  /**
   * Get the size of the cache in bytes
   */
  sizeInBytes(): number {
    const result = utilityOps.sizeInBytes(this.getUtilityOperations());
    this.emit('sizeInBytes', undefined, undefined);
    return result;
  }

  /**
   * Get all keys in the cache
   */
  keys(): K[] {
    const result = utilityOps.keys(this.getUtilityOperations());
    this.emit('keys', undefined, result as any);
    return result;
  }

  /**
   * Get all values in the cache
   */
  values(): V[] {
    const result = utilityOps.values(this.getUtilityOperations());
    this.emit('values', undefined, result);
    return result;
  }

  /**
   * Get all entries in the cache
   */
  entries(): Array<[K, V]> {
    const result = utilityOps.entries(this.getUtilityOperations());
    this.emit('entries', undefined, result as any);
    return result;
  }

  /**
   * Check if cache is empty
   */
  isEmpty(): boolean {
    const result = utilityOps.isEmpty(this.getUtilityOperations());
    this.emit('isEmpty', undefined, result as any);
    return result;
  }

  /**
   * Get a random key from the cache
   */
  randomKey(): K | undefined {
    const result = utilityOps.randomKey(this.getUtilityOperations());
    this.emit('randomKey', undefined, undefined);
    return result;
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
    this.eventListeners.clear();
    CacheRegistry.unregister(this);
  }

  // ========== Event System ==========

  /**
   * Register an event listener
   * @param key - The key to listen to, or '*' for all keys
   * @param eventOrHandler - The event name, or handler if event is omitted
   * @param handler - The handler function (optional if event is omitted)
   */
  on(
    key: K | '*',
    eventOrHandler: CacheEvent | '*' | CacheEventHandler<K, V>,
    handler?: CacheEventHandler<K, V>
  ): void {
    let event: CacheEvent | '*';
    let callback: CacheEventHandler<K, V>;

    // Handle: on(key, handler) - all events for this key
    if (typeof eventOrHandler === 'function') {
      event = '*';
      callback = eventOrHandler;
    }
    // Handle: on(key, event, handler) - specific event for this key
    else {
      event = eventOrHandler;
      if (!handler) {
        throw new Error('Handler function is required when event is specified');
      }
      callback = handler;
    }

    // Get or create listener map for this key
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, new Map());
    }

    const keyListeners = this.eventListeners.get(key)!;

    // Get or create listener set for this event
    if (!keyListeners.has(event)) {
      keyListeners.set(event, new Set());
    }

    keyListeners.get(event)!.add(callback);
  }

  /**
   * Remove an event listener
   */
  off(
    key: K | '*',
    eventOrHandler?: CacheEvent | '*' | CacheEventHandler<K, V>,
    handler?: CacheEventHandler<K, V>
  ): void {
    if (!this.eventListeners.has(key)) {
      return;
    }

    const keyListeners = this.eventListeners.get(key)!;

    // Handle: off(key) - remove all listeners for this key
    if (eventOrHandler === undefined) {
      keyListeners.clear();
      return;
    }

    // Handle: off(key, handler) - remove handler from all events
    if (typeof eventOrHandler === 'function') {
      for (const listeners of keyListeners.values()) {
        listeners.delete(eventOrHandler);
      }
      return;
    }

    // Handle: off(key, event) - remove all handlers for this event
    if (handler === undefined) {
      keyListeners.delete(eventOrHandler);
      return;
    }

    // Handle: off(key, event, handler) - remove specific handler
    const eventListeners = keyListeners.get(eventOrHandler);
    if (eventListeners) {
      eventListeners.delete(handler);
    }
  }

  /**
   * Emit an event (internal use)
   */
  private emit(event: CacheEvent, key?: K | K[], value?: V | V[]): void {
    // Emit for specific keys
    if (key !== undefined) {
      if (Array.isArray(key)) {
        // For array keys, emit to each key individually
        for (const k of key) {
          this.emitForKey(event, k, k, value);
        }
        // Also emit to wildcard listeners with the array
        this.emitForKey(event, '*', key as any, value);
      } else {
        // For single key, emit to that key and wildcard
        this.emitForKey(event, key, key, value);
        this.emitForKey(event, '*', key, value);
      }
    } else {
      // Emit for wildcard key listeners when no key specified
      this.emitForKey(event, '*', undefined, value);
    }
  }

  /**
   * Emit event for a specific key (internal use)
   */
  private emitForKey(
    event: CacheEvent,
    listenerKey: K | '*',
    actualKey: K | undefined,
    value?: V | V[]
  ): void {
    const keyListeners = this.eventListeners.get(listenerKey);
    if (!keyListeners) {
      return;
    }

    // Emit for specific event listeners
    const eventListeners = keyListeners.get(event);
    if (eventListeners) {
      for (const handler of eventListeners) {
        try {
          handler(actualKey, value, event);
        } catch (error) {
          // Don't let event handler errors break the cache
          console.error('Error in cache event handler:', error);
        }
      }
    }

    // Emit for wildcard event listeners
    const wildcardListeners = keyListeners.get('*');
    if (wildcardListeners) {
      for (const handler of wildcardListeners) {
        try {
          handler(actualKey, value, event);
        } catch (error) {
          console.error('Error in cache event handler:', error);
        }
      }
    }
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
      evictionPolicy: this.evictionPolicy,
    };
  }

  private getGetOperations(): getOps.GetOperations<K, V> {
    return {
      storage: this.storage,
      autoDeleteAfterUse: this.autoDeleteAfterUse,
      evictionPolicy: this.evictionPolicy,
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
