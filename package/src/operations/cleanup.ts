import { GetOperations } from './get';

export interface CleanupOperations<K, V> extends GetOperations<K, V> {
  ttl?: number;
  cleanupInterval?: number;
}

/**
 * Cleanup expired entries
 */
export function cleanupExpired<K, V>(
  operations: CleanupOperations<K, V>
): number {
  const { storage, ttl } = operations;

  if (!ttl) {
    return 0;
  }

  let cleaned = 0;
  const now = Date.now();
  for (const [key, entry] of storage.entries()) {
    if (entry.expiresAt && now > entry.expiresAt) {
      storage.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Start automatic cleanup of expired entries
 */
export function startCleanup<K, V>(
  operations: CleanupOperations<K, V>
): ReturnType<typeof setInterval> | number | undefined {
  const { cleanupInterval, ttl } = operations;

  if (!ttl || !cleanupInterval) {
    return undefined;
  }

  if (typeof setInterval === 'undefined') {
    // Not available in all environments
    return undefined;
  }

  return setInterval(() => {
    cleanupExpired(operations);
  }, cleanupInterval);
}

/**
 * Stop automatic cleanup
 */
export function stopCleanup(
  timer: ReturnType<typeof setInterval> | number | undefined
): void {
  if (timer && typeof clearInterval !== 'undefined') {
    clearInterval(timer);
  }
}

