import { CacheEntry } from '../types';
import { GetOperations, get } from './get';
import { SetOperations, set } from './set';

export interface MutateOperations<K, V>
  extends GetOperations<K, V>,
    SetOperations<K, V> {}

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

/**
 * Merge an object value
 */
export function merge<K, T extends Record<string, any>>(
  operations: MutateOperations<K, T>,
  key: K,
  updates: Partial<T>
): T | undefined {
  return mutate(operations, key, (value) => ({ ...value, ...updates }));
}

