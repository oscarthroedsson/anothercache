import { CacheEntry } from '../types';

/**
 * Calculate the approximate size in bytes of a JavaScript value
 */
export function getSizeInBytes(obj: any): number {
  if (obj === null || obj === undefined) {
    return 0;
  }

  let size = 0;

  switch (typeof obj) {
    case 'number':
      size = 8; // 64-bit float
      break;
    case 'string':
      size = obj.length * 2; // UTF-16, 2 bytes per char
      break;
    case 'boolean':
      size = 4; // Boolean
      break;
    case 'object':
      if (Array.isArray(obj)) {
        size = obj.reduce((acc, item) => acc + getSizeInBytes(item), 0);
      } else if (obj instanceof Date) {
        size = 8; // Date object
      } else if (obj instanceof Map) {
        // For Map, iterate over entries
        for (const [key, value] of obj.entries()) {
          size += getSizeInBytes(key);
          size += getSizeInBytes(value);
        }
      } else if (obj instanceof Set) {
        // For Set, iterate over values
        for (const value of obj.values()) {
          size += getSizeInBytes(value);
        }
      } else {
        // Plain object
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            size += getSizeInBytes(key); // Key size
            size += getSizeInBytes(obj[key]); // Value size
          }
        }
      }
      break;
    case 'function':
      size = 0; // Functions are not serialized
      break;
    case 'symbol':
      size = 0; // Symbols are not serialized
      break;
    case 'bigint':
      size = 8; // BigInt
      break;
  }

  return size;
}

/**
 * Calculate the size of a single cache entry (key + value + overhead)
 * This matches the calculation used in getCacheSizeInBytes for consistency
 */
export function getEntrySize<K, V>(key: K, value: V): number {
  return (
    getSizeInBytes(key) + // Key size
    getSizeInBytes(value) + // Value size
    48 + // Map entry overhead + object overhead
    16 // Metadata (createdAt, expiresAt, lastAccessed) - 2-3 numbers * 8 bytes
  );
}

/**
 * Calculate the total size in bytes of a cache storage
 */
export function getCacheSizeInBytes<K, V>(
  storage: Map<K, CacheEntry<V>>
): number {
  let totalSize = 0;

  for (const [key, entry] of storage.entries()) {
    // Size of key
    totalSize += getSizeInBytes(key);

    // Size of entry object overhead (~48 bytes for Map entry + object overhead)
    totalSize += 48;

    // Size of value
    totalSize += getSizeInBytes(entry.value);

    // Size of metadata (createdAt, expiresAt, lastAccessed)
    totalSize += 16; // 2-3 numbers * 8 bytes
  }

  return totalSize;
}
