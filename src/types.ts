export interface CacheAlarm {
  onWarning?: () => void;
  onCritical?: () => void;
}

export interface CacheOptions {
  maxEntries?: number; // Maximum number of entries
  maxBytes?: number; // Maximum size in bytes
  ttl?: number; // Time to live in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
  alarm?: CacheAlarm; // Alarm callbacks for size warnings
}

export interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
}
