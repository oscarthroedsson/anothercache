import {
  getSizeInBytes,
  getCacheSizeInBytes,
  getEntrySize,
} from '../../src/utils/size';
import { CacheEntry } from '../../src/types';

describe('Size Utils', () => {
  describe('getSizeInBytes', () => {
    it('should calculate size of number', () => {
      expect(getSizeInBytes(100)).toBe(8);
    });

    it('should calculate size of string', () => {
      expect(getSizeInBytes('hello')).toBe(10); // 5 chars * 2 bytes
    });

    it('should calculate size of boolean', () => {
      expect(getSizeInBytes(true)).toBe(4);
    });

    it('should calculate size of array', () => {
      const arr = [1, 2, 3];
      const size = getSizeInBytes(arr);
      expect(size).toBeGreaterThan(0);
    });

    it('should calculate size of object', () => {
      const obj = { a: 1, b: 'hello', c: true };
      const size = getSizeInBytes(obj);
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for null', () => {
      expect(getSizeInBytes(null)).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(getSizeInBytes(undefined)).toBe(0);
    });

    it('should calculate size of Map', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const size = getSizeInBytes(map);
      expect(size).toBeGreaterThan(0);
    });

    it('should calculate size of Set', () => {
      const set = new Set([1, 2, 3]);
      const size = getSizeInBytes(set);
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('getCacheSizeInBytes', () => {
    it('should calculate total size of cache storage', () => {
      const storage = new Map<string, CacheEntry<number>>();
      storage.set('key1', {
        value: 100,
        createdAt: Date.now(),
        expiresAt: undefined,
      });
      storage.set('key2', {
        value: 200,
        createdAt: Date.now(),
        expiresAt: undefined,
      });
      const size = getCacheSizeInBytes(storage);
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for empty storage', () => {
      const storage = new Map<string, CacheEntry<number>>();
      const size = getCacheSizeInBytes(storage);
      expect(size).toBe(0);
    });
  });

  describe('getEntrySize', () => {
    it('should calculate entry size consistently with getCacheSizeInBytes', () => {
      const storage = new Map<string, CacheEntry<string>>();
      storage.set('key1', {
        value: 'value1',
        createdAt: Date.now(),
      });
      storage.set('key2', {
        value: 'value2',
        createdAt: Date.now(),
      });

      const totalSize = getCacheSizeInBytes(storage);
      const entry1Size = getEntrySize('key1', 'value1');
      const entry2Size = getEntrySize('key2', 'value2');

      // Total should be approximately sum of individual entries
      // (allowing for small rounding differences)
      expect(totalSize).toBeGreaterThanOrEqual(entry1Size + entry2Size - 10);
      expect(totalSize).toBeLessThanOrEqual(entry1Size + entry2Size + 10);
    });
  });
});
