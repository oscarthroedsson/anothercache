import { CacheEntry } from '../types';
import { getSizeInBytes, getCacheSizeInBytes } from '../utils/size';

export interface SetOperations<K, V> {
  storage: Map<K, CacheEntry<V>>;
  maxEntries: number;
  maxBytes?: number;
  ttl?: number;
}

/**
 * Set a value in the cache
 */
export function set<K, V>(
  operations: SetOperations<K, V>,
  key: K,
  value: V
): void {
  const { storage, maxEntries, maxBytes, ttl } = operations;

  // If maxBytes is set, use bytes-based limit
  if (maxBytes) {
    const entrySize = getSizeInBytes(key) + getSizeInBytes(value) + 64; // ~64 bytes overhead per entry

    // Remove oldest entries until we have space
    while (storage.size > 0) {
      const currentSize = getCacheSizeInBytes(storage);
      if (currentSize + entrySize <= maxBytes) {
        break;
      }
      const firstKey = storage.keys().next().value;
      if (firstKey !== undefined) {
        storage.delete(firstKey);
      } else {
        break;
      }
    }
  } else {
    // Fallback to entries-based limit
    if (storage.size >= maxEntries && !storage.has(key)) {
      const firstKey = storage.keys().next().value;
      if (firstKey !== undefined) {
        storage.delete(firstKey);
      }
    }
  }

  const entry: CacheEntry<V> = {
    value,
    createdAt: Date.now(),
    expiresAt: ttl ? Date.now() + ttl : undefined,
  };

  storage.set(key, entry);
}

/**
 * Set multiple values at once
 */
export function setMany<K, V>(
  operations: SetOperations<K, V>,
  entries: Array<[K, V]>
): void {
  entries.forEach(([key, value]) => {
    set(operations, key, value);
  });
}

