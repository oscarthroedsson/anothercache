import { CacheRegistry } from './utils/registry';

// Start monitoring automatically (works in both Node.js and browser)
CacheRegistry.startMonitoring(5000);

export { Cache } from './cache';
export type {
  CacheOptions,
  CacheEntry,
  CacheAlarm,
  EvictionPolicy,
  CacheEvent,
  CacheEventHandler,
} from './types';
export * from './operations';
