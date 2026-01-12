import { CacheEntry, EvictionPolicy } from '../types';

export interface GetOperations<K, V> {
  storage: Map<K, CacheEntry<V>>;
  autoDeleteAfterUse?: boolean;
  evictionPolicy?: EvictionPolicy;
}

/**
 * Get a value from the cache
 */
export function get<K, V>(
  operations: GetOperations<K, V>,
  key: K
): V | undefined {
  const { storage, autoDeleteAfterUse, evictionPolicy = 'FIFO' } = operations;
  const entry = storage.get(key);

  if (!entry) {
    return undefined;
  }

  // Check if expired
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    storage.delete(key);
    return undefined;
  }

  const value = entry.value;

  // Update lastAccessed for LRU policy
  if (evictionPolicy === 'LRU' && !autoDeleteAfterUse) {
    entry.lastAccessed = Date.now();
  }

  // Auto-delete after use if enabled
  if (autoDeleteAfterUse) {
    storage.delete(key);
  }

  return value;
}

/**
 * Get multiple values at once
 * Returns only existing values (filters out undefined)
 */
export function getMany<K, V>(operations: GetOperations<K, V>, keys: K[]): V[] {
  return keys
    .map((key) => get(operations, key))
    .filter((value): value is V => value !== undefined);
}

/**
 * Check if a key exists in the cache
 */
export function has<K, V>(operations: GetOperations<K, V>, key: K): boolean {
  const { storage } = operations;
  const entry = storage.get(key);

  if (!entry) {
    return false;
  }

  // Check if expired
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    storage.delete(key);
    return false;
  }

  return true;
}

/**
 * Get entry with metadata (createdAt, expiresAt, ttlLeft, age)
 */
export function getEntry<K, V>(
  operations: GetOperations<K, V>,
  key: K
): CacheEntry<V> | undefined {
  const { storage } = operations;
  const entry = storage.get(key);

  if (!entry) {
    return undefined;
  }

  const now = Date.now();

  // Check if expired
  if (entry.expiresAt && now > entry.expiresAt) {
    storage.delete(key);
    return undefined;
  }

  // Calculate age
  const age = now - entry.createdAt;

  // Calculate ttlLeft if expiresAt exists
  const ttlLeft = entry.expiresAt ? entry.expiresAt - now : undefined;

  return {
    ...entry,
    age,
    ttlLeft,
  };
}

/**
 * Peek at a value without updating access time or triggering auto-delete
 * Useful for checking values without affecting eviction order
 */
export function peek<K, V>(
  operations: GetOperations<K, V>,
  key: K
): V | undefined {
  const { storage } = operations;
  const entry = storage.get(key);

  if (!entry) {
    return undefined;
  }

  // Check if expired (but don't delete - just return undefined)
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    return undefined;
  }

  return entry.value;
}
