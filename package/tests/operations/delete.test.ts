import { Cache } from '../../src/cache';

describe('Delete Operations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('delete', () => {
    it('should delete a value from the cache', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      const cache = new Cache<string, number>();
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple values at once', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      const deleted = cache.deleteMany(['key1', 'key2']);
      expect(deleted).toBe(2);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe(300);
    });

    it('should return count of deleted items', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      const deleted = cache.deleteMany(['key1', 'key2', 'nonexistent']);
      expect(deleted).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all entries from the cache', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });
  });
});

