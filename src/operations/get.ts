import { CacheEntry } from '../types';

export interface GetOperations<K, V> {
  storage: Map<K, CacheEntry<V>>;
}

/**
 * Get a value from the cache
 */
export function get<K, V>(
  operations: GetOperations<K, V>,
  key: K
): V | undefined {
  const { storage } = operations;
  const entry = storage.get(key);

  if (!entry) {
    return undefined;
  }

  // Check if expired
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    storage.delete(key);
    return undefined;
  }

  return entry.value;
}

/**
 * Get multiple values at once
 */
export function getMany<K, V>(
  operations: GetOperations<K, V>,
  keys: K[]
): Array<V | undefined> {
  return keys.map((key) => get(operations, key));
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
 * Get entry with metadata (createdAt, expiresAt)
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

  // Check if expired
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    storage.delete(key);
    return undefined;
  }

  return entry;
}

