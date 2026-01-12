import { Cache } from '../../src/cache';

describe('Utility Operations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('size', () => {
    it('should return the number of entries', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      expect(cache.size()).toBe(2);
    });

    it('should return 0 for empty cache', () => {
      const cache = new Cache<string, number>();
      expect(cache.size()).toBe(0);
    });
  });

  describe('sizeInBytes', () => {
    it('should return the size in bytes', () => {
      const cache = new Cache<string, string>();
      cache.set('key1', 'hello');
      const bytes = cache.sizeInBytes();
      expect(bytes).toBeGreaterThan(0);
    });

    it('should return 0 for empty cache', () => {
      const cache = new Cache<string, number>();
      expect(cache.sizeInBytes()).toBe(0);
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });

  describe('values', () => {
    it('should return all values', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      const values = cache.values();
      expect(values).toContain(100);
      expect(values).toContain(200);
      expect(values.length).toBe(2);
    });
  });

  describe('entries', () => {
    it('should return all entries', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      const entries = cache.entries();
      expect(entries.length).toBe(2);
      expect(entries).toContainEqual(['key1', 100]);
      expect(entries).toContainEqual(['key2', 200]);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty cache', () => {
      const cache = new Cache<string, number>();
      expect(cache.isEmpty()).toBe(true);
    });

    it('should return false for non-empty cache', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      expect(cache.isEmpty()).toBe(false);
    });
  });

  describe('randomKey', () => {
    it('should return a random key', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      const randomKey = cache.randomKey();
      expect(['key1', 'key2', 'key3']).toContain(randomKey);
    });

    it('should return undefined for empty cache', () => {
      const cache = new Cache<string, number>();
      expect(cache.randomKey()).toBeUndefined();
    });
  });
});

