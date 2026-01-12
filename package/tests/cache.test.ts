import { Cache } from '../src/cache';

describe('Cache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic operations', () => {
    it('should set and get values', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      expect(cache.get('key1')).toBe(100);
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new Cache<string, number>();
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete values', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all values', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('Size management', () => {
    it('should respect maxEntries', () => {
      const cache = new Cache<string, number>({ maxEntries: 2 });
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      expect(cache.size()).toBe(2);
      expect(cache.get('key1')).toBeUndefined(); // First key should be removed
      expect(cache.get('key2')).toBe(200);
      expect(cache.get('key3')).toBe(300);
    });

    it('should update existing key without removing it', () => {
      const cache = new Cache<string, number>({ maxEntries: 2 });
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key1', 150); // Update existing
      expect(cache.size()).toBe(2);
      expect(cache.get('key1')).toBe(150);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      const cache = new Cache<string, number>({ ttl: 1000 });
      cache.set('key1', 100);
      expect(cache.get('key1')).toBe(100);

      jest.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });

    it('should not expire entries before TTL', () => {
      const cache = new Cache<string, number>({ ttl: 1000 });
      cache.set('key1', 100);
      jest.advanceTimersByTime(999);
      expect(cache.get('key1')).toBe(100);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries automatically', () => {
      const cache = new Cache<string, number>({
        ttl: 1000,
        cleanupInterval: 500,
      });
      cache.set('key1', 100);
      cache.set('key2', 200);

      jest.advanceTimersByTime(1001);
      jest.advanceTimersByTime(500); // Trigger cleanup

      expect(cache.size()).toBe(0);
    });

    it('should stop cleanup on destroy', () => {
      const cache = new Cache<string, number>({
        ttl: 1000,
        cleanupInterval: 500,
      });
      cache.set('key1', 100);
      cache.destroy();
      expect(cache.size()).toBe(0);
    });
  });
});

