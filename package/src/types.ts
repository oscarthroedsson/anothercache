export interface CacheAlarm {
  onWarning?: () => void;
  onCritical?: () => void;
}

export type EvictionPolicy = 'FIFO' | 'LRU';

export interface CacheOptions {
  maxEntries?: number; // Maximum number of entries
  maxBytes?: number; // Maximum size in bytes
  ttl?: number; // Time to live in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
  evictionPolicy?: EvictionPolicy; // Eviction policy: 'FIFO' (default) or 'LRU'
  alarm?: CacheAlarm; // Alarm callbacks for size warnings
  autoDeleteAfterUse?: boolean; // Automatically delete entry after get() is called
  mergeAllowDuplicates?: boolean; // Allow duplicates when merging arrays (default: false)
}

export interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
  lastAccessed?: number; // Last access time (used for LRU eviction)
  ttlLeft?: number; // Time to live remaining in milliseconds (calculated dynamically)
  age?: number; // Age of the entry in milliseconds (calculated dynamically)
}

export type CacheEvent =
  | 'set'
  | 'setMany'
  | 'get'
  | 'getMany'
  | 'delete'
  | 'deleteMany'
  | 'mutate'
  | 'upsert'
  | 'increment'
  | 'decrement'
  | 'append'
  | 'merge'
  | 'size'
  | 'sizeInBytes'
  | 'keys'
  | 'values'
  | 'entries'
  | 'isEmpty'
  | 'randomKey';

export type CacheEventHandler<K, V> = (
  key: K | K[] | undefined,
  value: V | V[] | undefined,
  event: CacheEvent
) => void;
