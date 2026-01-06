import { Cache } from '../../src/cache';

describe('Get Operations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get', () => {
    it('should get a value from the cache', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      expect(cache.get('key1')).toBe(100);
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new Cache<string, number>();
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should return undefined for expired entries', () => {
      const cache = new Cache<string, number>({ ttl: 1000 });
      cache.set('key1', 100);
      jest.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should update lastAccessed for LRU policy', () => {
      const cache = new Cache<string, number>({ evictionPolicy: 'LRU' });
      cache.set('key1', 100);

      const entry1 = cache.getEntry('key1');
      expect(entry1?.lastAccessed).toBeDefined();

      // Wait a bit
      jest.advanceTimersByTime(100);

      // Access again
      cache.get('key1');

      const entry2 = cache.getEntry('key1');
      expect(entry2?.lastAccessed).toBeGreaterThan(entry1!.lastAccessed!);
    });

    it('should not update lastAccessed for FIFO policy', () => {
      const cache = new Cache<string, number>({ evictionPolicy: 'FIFO' });
      cache.set('key1', 100);

      const entry1 = cache.getEntry('key1');
      expect(entry1?.lastAccessed).toBeUndefined();

      cache.get('key1');

      const entry2 = cache.getEntry('key1');
      expect(entry2?.lastAccessed).toBeUndefined();
    });

    it('should auto-delete entry after use when autoDeleteAfterUse is enabled', () => {
      const cache = new Cache<string, number>({ autoDeleteAfterUse: true });
      cache.set('key1', 100);

      const value = cache.get('key1');
      expect(value).toBe(100);

      // Entry should be deleted after get()
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });

    it('should not auto-delete when autoDeleteAfterUse is disabled', () => {
      const cache = new Cache<string, number>({ autoDeleteAfterUse: false });
      cache.set('key1', 100);

      const value1 = cache.get('key1');
      expect(value1).toBe(100);

      // Entry should still exist
      const value2 = cache.get('key1');
      expect(value2).toBe(100);
      expect(cache.has('key1')).toBe(true);
    });
  });

  describe('getMany', () => {
    it('should get multiple values at once', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      const values = cache.getMany(['key1', 'key2', 'key3']);
      expect(values).toEqual([100, 200, 300]);
    });

    it('should filter out non-existent keys in getMany', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const values = cache.getMany(['key1', 'nonexistent']);
      expect(values).toEqual([100]); // Non-existent key is filtered out
    });
  });

  describe('has', () => {
    it('should return true if key exists', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false if key does not exist', () => {
      const cache = new Cache<string, number>();
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries', () => {
      const cache = new Cache<string, number>({ ttl: 1000 });
      cache.set('key1', 100);
      jest.advanceTimersByTime(1001);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('getEntry', () => {
    it('should get entry with metadata including age and ttlLeft', () => {
      const cache = new Cache<string, number>({ ttl: 60000 });
      cache.set('key1', 100);
      const entry = cache.getEntry('key1');
      expect(entry).toBeDefined();
      expect(entry?.value).toBe(100);
      expect(entry?.createdAt).toBeDefined();
      expect(entry?.age).toBeDefined();
      expect(entry?.age).toBeGreaterThanOrEqual(0);
      expect(entry?.ttlLeft).toBeDefined();
      expect(entry?.ttlLeft).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new Cache<string, number>();
      expect(cache.getEntry('nonexistent')).toBeUndefined();
    });

    it('should have undefined ttlLeft when no TTL is set', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const entry = cache.getEntry('key1');
      expect(entry).toBeDefined();
      expect(entry?.ttlLeft).toBeUndefined();
      expect(entry?.age).toBeDefined();
    });
  });

  describe('peek', () => {
    it('should peek at a value without affecting eviction order', () => {
      const cache = new Cache<string, number>({ maxEntries: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Peek at 'a' - should not move it in eviction queue
      const value = cache.peek('a');
      expect(value).toBe(1);

      // 'a' should still be evicted first
      cache.set('d', 4);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
    });

    it('should not trigger autoDeleteAfterUse', () => {
      const cache = new Cache<string, number>({ autoDeleteAfterUse: true });
      cache.set('key1', 100);

      const value = cache.peek('key1');
      expect(value).toBe(100);
      expect(cache.has('key1')).toBe(true); // Should still exist
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new Cache<string, number>();
      expect(cache.peek('nonexistent')).toBeUndefined();
    });

    it('should return undefined for expired entries', () => {
      const cache = new Cache<string, number>({ ttl: 1000 });
      cache.set('key1', 100);
      jest.advanceTimersByTime(1001);
      expect(cache.peek('key1')).toBeUndefined();
    });

    it('should not update lastAccessed for LRU when peeking', () => {
      const cache = new Cache<string, number>({ evictionPolicy: 'LRU' });
      cache.set('key1', 100);
      cache.get('key1'); // Access to set lastAccessed

      const entry1 = cache.getEntry('key1');
      const lastAccessed1 = entry1?.lastAccessed;

      jest.advanceTimersByTime(100);

      // Peek should not update lastAccessed
      cache.peek('key1');

      const entry2 = cache.getEntry('key1');
      expect(entry2?.lastAccessed).toBe(lastAccessed1); // Should be unchanged
    });
  });
});
