import { GetOperations } from './get';

export interface DeleteOperations<K, V> extends GetOperations<K, V> {}

/**
 * Delete a value from the cache
 */
export function del<K, V>(
  operations: DeleteOperations<K, V>,
  key: K
): boolean {
  return operations.storage.delete(key);
}

/**
 * Delete multiple values at once
 */
export function deleteMany<K, V>(
  operations: DeleteOperations<K, V>,
  keys: K[]
): number {
  let deleted = 0;
  keys.forEach((key) => {
    if (del(operations, key)) {
      deleted++;
    }
  });
  return deleted;
}

/**
 * Clear all entries from the cache
 */
export function clear<K, V>(operations: DeleteOperations<K, V>): void {
  operations.storage.clear();
}

