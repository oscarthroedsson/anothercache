import { CacheEntry, EvictionPolicy } from '../types';
import { getEntrySize, getCacheSizeInBytes } from '../utils/size';

export interface SetOperations<K, V> {
  storage: Map<K, CacheEntry<V>>;
  maxEntries: number;
  maxBytes?: number;
  ttl?: number;
  evictionPolicy?: EvictionPolicy;
}

/**
 * Find the least recently used key (for LRU eviction)
 * Returns undefined if storage is empty
 */
function findLRUKey<K, V>(storage: Map<K, CacheEntry<V>>): K | undefined {
  if (storage.size === 0) {
    return undefined;
  }

  let oldestKey: K | undefined;
  let oldestTime = Infinity;

  for (const [key, entry] of storage.entries()) {
    const accessTime = entry.lastAccessed ?? entry.createdAt;
    if (accessTime < oldestTime) {
      oldestTime = accessTime;
      oldestKey = key;
    }
  }

  return oldestKey;
}

/**
 * Set a value in the cache
 */
export function set<K, V>(
  operations: SetOperations<K, V>,
  key: K,
  value: V
): void {
  const {
    storage,
    maxEntries,
    maxBytes,
    ttl,
    evictionPolicy = 'FIFO',
  } = operations;
  const now = Date.now();

  // Check if key already exists (before eviction)
  const existingEntry = storage.get(key);
  const isNewKey = !existingEntry;

  // If maxBytes is set, use bytes-based limit
  if (maxBytes) {
    const entrySize = getEntrySize(key, value);

    // If entry is larger than maxBytes, we'll remove all existing entries
    // and set it anyway (user's choice to set a large entry)
    // Remove entries until we have space
    while (storage.size > 0) {
      const currentSize = getCacheSizeInBytes(storage);
      if (currentSize + entrySize <= maxBytes) {
        break;
      }

      // Choose eviction based on policy
      // For LRU, don't consider the key we're about to set (if it's new)
      const keyToRemove =
        evictionPolicy === 'LRU'
          ? findLRUKey(storage)
          : storage.keys().next().value;

      // If no key to remove or keyToRemove is the key we're setting, break
      if (keyToRemove === undefined || keyToRemove === key) {
        break;
      }

      storage.delete(keyToRemove);
    }

    // Note: Entry will be set even if entrySize > maxBytes
    // This allows users to set large entries, clearing the cache if needed
  } else {
    // Fallback to entries-based limit
    if (storage.size >= maxEntries && isNewKey) {
      // Choose eviction based on policy
      const keyToRemove =
        evictionPolicy === 'LRU'
          ? findLRUKey(storage)
          : storage.keys().next().value;

      if (keyToRemove !== undefined) {
        storage.delete(keyToRemove);
      }
    }
  }

  // Create entry
  const entry: CacheEntry<V> = {
    value,
    createdAt: existingEntry?.createdAt ?? now,
    // For LRU: set lastAccessed when creating/updating entry
    lastAccessed: evictionPolicy === 'LRU' ? now : existingEntry?.lastAccessed,
    expiresAt: ttl ? now + ttl : undefined,
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
