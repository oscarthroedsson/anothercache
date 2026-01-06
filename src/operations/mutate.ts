import { CacheEntry } from '../types';
import { GetOperations, get } from './get';
import { SetOperations, set } from './set';

export interface MutateOperations<K, V>
  extends GetOperations<K, V>, SetOperations<K, V> {}

/**
 * Update an existing value using a function
 */
export function mutate<K, V>(
  operations: MutateOperations<K, V>,
  key: K,
  updater: (value: V) => V
): V | undefined {
  const currentValue = get(operations, key);
  if (currentValue === undefined) {
    return undefined;
  }

  const newValue = updater(currentValue);
  set(operations, key, newValue);
  return newValue;
}

/**
 * Update an existing value, or set if it doesn't exist
 */
export function upsert<K, V>(
  operations: MutateOperations<K, V>,
  key: K,
  valueOrUpdater: V | ((value: V | undefined) => V)
): V {
  if (typeof valueOrUpdater === 'function') {
    const updater = valueOrUpdater as (value: V | undefined) => V;
    const currentValue = get(operations, key);
    const newValue = updater(currentValue);
    set(operations, key, newValue);
    return newValue;
  } else {
    set(operations, key, valueOrUpdater);
    return valueOrUpdater;
  }
}

/**
 * Increment a numeric value
 */
export function increment<K>(
  operations: MutateOperations<K, number>,
  key: K,
  amount: number = 1
): number | undefined {
  return mutate(operations, key, (value) => value + amount);
}

/**
 * Decrement a numeric value
 */
export function decrement<K>(
  operations: MutateOperations<K, number>,
  key: K,
  amount: number = 1
): number | undefined {
  return mutate(operations, key, (value) => value - amount);
}

/**
 * Append to an array value
 */
export function append<K, T>(
  operations: MutateOperations<K, T[]>,
  key: K,
  ...items: T[]
): T[] | undefined {
  return mutate(operations, key, (value) => [...value, ...items]);
}

export interface MergeOptions {
  allowDuplicates?: boolean; // Allow duplicates when merging arrays (default: false)
}

/**
 * Merge values based on type:
 * - Objects: Shallow merge properties
 * - Arrays: Concatenate (with optional duplicate filtering)
 * - Strings: Concatenate
 * - Numbers: Concatenate as strings then convert back to number (4 + 2 = 42)
 */
export function merge<K, V>(
  operations: MutateOperations<K, V>,
  key: K,
  updates: any,
  options?: MergeOptions
): V | undefined {
  const currentValue = get(operations, key);
  if (currentValue === undefined) {
    return undefined;
  }

  const allowDuplicates = options?.allowDuplicates ?? false;

  let mergedValue: any;

  // Handle arrays
  if (Array.isArray(currentValue) && Array.isArray(updates)) {
    if (allowDuplicates) {
      mergedValue = [...currentValue, ...updates];
    } else {
      // Remove duplicates using Set for primitives, or deep comparison for objects
      const seen = new Set<string>();
      const result: any[] = [];

      for (const item of [...currentValue, ...updates]) {
        const key =
          typeof item === 'object' && item !== null
            ? JSON.stringify(item)
            : String(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      mergedValue = result;
    }
  }
  // Handle strings
  else if (typeof currentValue === 'string' && typeof updates === 'string') {
    mergedValue = currentValue + updates;
  }
  // Handle numbers
  else if (typeof currentValue === 'number' && typeof updates === 'number') {
    // Concatenate as strings then convert back to number
    mergedValue = Number(String(currentValue) + String(updates));
  }
  // Handle objects
  else if (
    typeof currentValue === 'object' &&
    currentValue !== null &&
    !Array.isArray(currentValue) &&
    typeof updates === 'object' &&
    updates !== null &&
    !Array.isArray(updates)
  ) {
    mergedValue = { ...currentValue, ...updates };
  }
  // Fallback: return updates if types don't match
  else {
    mergedValue = updates;
  }

  set(operations, key, mergedValue);
  return mergedValue as V;
}
