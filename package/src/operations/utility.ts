import { GetOperations } from './get';
import { cleanupExpired } from './cleanup';
import { getCacheSizeInBytes } from '../utils/size';

export interface UtilityOperations<K, V> extends GetOperations<K, V> {
  ttl?: number;
}

/**
 * Get the size of the cache (number of entries)
 */
export function size<K, V>(operations: UtilityOperations<K, V>): number {
  cleanupExpired(operations);
  return operations.storage.size;
}

/**
 * Get the size of the cache in bytes
 */
export function sizeInBytes<K, V>(
  operations: UtilityOperations<K, V>
): number {
  cleanupExpired(operations);
  return getCacheSizeInBytes(operations.storage);
}

/**
 * Get all keys in the cache
 */
export function keys<K, V>(operations: UtilityOperations<K, V>): K[] {
  cleanupExpired(operations);
  return Array.from(operations.storage.keys());
}

/**
 * Get all values in the cache
 */
export function values<K, V>(operations: UtilityOperations<K, V>): V[] {
  cleanupExpired(operations);
  return Array.from(operations.storage.values()).map((entry) => entry.value);
}

/**
 * Get all entries in the cache
 */
export function entries<K, V>(
  operations: UtilityOperations<K, V>
): Array<[K, V]> {
  cleanupExpired(operations);
  return Array.from(operations.storage.entries()).map(([key, entry]) => [
    key,
    entry.value,
  ]);
}

/**
 * Check if cache is empty
 */
export function isEmpty<K, V>(operations: UtilityOperations<K, V>): boolean {
  return size(operations) === 0;
}

/**
 * Get a random key from the cache
 */
export function randomKey<K, V>(
  operations: UtilityOperations<K, V>
): K | undefined {
  const allKeys = keys(operations);
  if (allKeys.length === 0) {
    return undefined;
  }
  const randomIndex = Math.floor(Math.random() * allKeys.length);
  return allKeys[randomIndex];
}

