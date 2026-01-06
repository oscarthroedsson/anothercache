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

    it('should return undefined for non-existent keys in getMany', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const values = cache.getMany(['key1', 'nonexistent']);
      expect(values).toEqual([100, undefined]);
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
    it('should get entry with metadata', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const entry = cache.getEntry('key1');
      expect(entry).toBeDefined();
      expect(entry?.value).toBe(100);
      expect(entry?.createdAt).toBeDefined();
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new Cache<string, number>();
      expect(cache.getEntry('nonexistent')).toBeUndefined();
    });
  });
});

