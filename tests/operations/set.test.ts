import { Cache } from '../../src/cache';

describe('Set Operations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('set', () => {
    it('should set a value in the cache', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      expect(cache.get('key1')).toBe(100);
    });

    it('should overwrite existing value', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      cache.set('key1', 200);
      expect(cache.get('key1')).toBe(200);
    });

    it('should respect maxEntries limit', () => {
      const cache = new Cache<string, number>({ maxEntries: 2 });
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      expect(cache.size()).toBe(2);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should respect maxBytes limit', () => {
      const cache = new Cache<string, string>({ maxBytes: 100 });
      cache.set('key1', 'a'.repeat(50));
      cache.set('key2', 'b'.repeat(50));
      // Adding a third entry should remove older ones
      cache.set('key3', 'c');
      expect(cache.size()).toBeLessThanOrEqual(2);
    });
  });

  describe('setMany', () => {
    it('should set multiple values at once', () => {
      const cache = new Cache<string, number>();
      cache.setMany([
        ['key1', 100],
        ['key2', 200],
        ['key3', 300],
      ]);
      expect(cache.get('key1')).toBe(100);
      expect(cache.get('key2')).toBe(200);
      expect(cache.get('key3')).toBe(300);
      expect(cache.size()).toBe(3);
    });

    it('should respect limits when setting many', () => {
      const cache = new Cache<string, number>({ maxEntries: 2 });
      cache.setMany([
        ['key1', 100],
        ['key2', 200],
        ['key3', 300],
      ]);
      expect(cache.size()).toBe(2);
    });
  });
});

