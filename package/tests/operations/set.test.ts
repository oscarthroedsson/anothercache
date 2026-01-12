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

    it('should allow entry larger than maxBytes (clears cache)', () => {
      const cache = new Cache<string, string>({ maxBytes: 500 });
      cache.set('key1', 'a'.repeat(50));
      cache.set('key2', 'b'.repeat(50));
      expect(cache.size()).toBe(2);

      // Set entry larger than maxBytes - should clear cache and set it anyway
      cache.set('huge', 'x'.repeat(300)); // Larger than maxBytes (500)
      expect(cache.size()).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('huge')).toBe(true);
    });

    it('should handle empty cache with entry larger than maxBytes', () => {
      const cache = new Cache<string, string>({ maxBytes: 100 });
      // Set entry larger than maxBytes in empty cache
      cache.set('huge', 'x'.repeat(200));
      expect(cache.size()).toBe(1);
      expect(cache.has('huge')).toBe(true);
    });

    it('should remove oldest entry when maxEntries is reached (FIFO)', () => {
      const cache = new Cache<string, number>({
        maxEntries: 3,
        evictionPolicy: 'FIFO',
      });
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      expect(cache.size()).toBe(3);

      cache.set('key4', 400);
      expect(cache.size()).toBe(3);
      expect(cache.get('key1')).toBeUndefined(); // Oldest removed
      expect(cache.get('key4')).toBe(400);
    });

    it('should remove least recently used entry when maxEntries is reached (LRU)', () => {
      const cache = new Cache<string, number>({
        maxEntries: 3,
        evictionPolicy: 'LRU',
      });
      cache.set('key1', 100);
      // Small delay to ensure different timestamps
      jest.advanceTimersByTime(10);
      cache.set('key2', 200);
      jest.advanceTimersByTime(10);
      cache.set('key3', 300);
      expect(cache.size()).toBe(3);

      // Access key1 to update its access time
      jest.advanceTimersByTime(10);
      cache.get('key1');

      // Add new entry - should remove key2 (least recently used, not key1)
      jest.advanceTimersByTime(10);
      cache.set('key4', 400);
      expect(cache.size()).toBe(3);
      expect(cache.get('key1')).toBe(100); // Still exists (was accessed)
      expect(cache.get('key2')).toBeUndefined(); // Removed (least recently used)
      expect(cache.get('key3')).toBe(300);
      expect(cache.get('key4')).toBe(400);
    });

    it('should use LRU for bytes-based limit', () => {
      const cache = new Cache<string, string>({
        maxBytes: 1000, // Large enough so only key3 needs to be removed
        evictionPolicy: 'LRU',
      });

      // Set entries with delays to ensure different timestamps
      cache.set('key1', 'x'.repeat(120));
      jest.advanceTimersByTime(50);
      cache.set('key2', 'y'.repeat(120));
      jest.advanceTimersByTime(50);
      cache.set('key3', 'z'.repeat(120));

      // Access key1 and key2 to update their access times (making them more recent)
      jest.advanceTimersByTime(50);
      cache.get('key1');
      jest.advanceTimersByTime(50);
      cache.get('key2');

      // Add entry - should remove least recently used (key3, not key1 or key2)
      jest.advanceTimersByTime(50);
      cache.set('key4', 'w'.repeat(150)); // Smaller than 200 to fit after removing key3

      // key1 and key2 should still exist (were accessed more recently)
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
      // key3 should be removed (least recently used - never accessed with get())
      expect(cache.has('key3')).toBe(false);
      // key4 should exist
      expect(cache.has('key4')).toBe(true);
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
