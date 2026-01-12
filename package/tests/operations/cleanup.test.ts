import { Cache } from '../../src/cache';

describe('Cleanup Operations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('cleanupExpired', () => {
    it('should manually cleanup expired entries', () => {
      const cache = new Cache<string, number>({ ttl: 1000 });
      cache.set('key1', 100);
      cache.set('key2', 200);
      jest.advanceTimersByTime(1001);
      const cleaned = cache.cleanupExpired();
      expect(cleaned).toBe(2);
      expect(cache.size()).toBe(0);
    });

    it('should return 0 if no entries are expired', () => {
      const cache = new Cache<string, number>({ ttl: 1000 });
      cache.set('key1', 100);
      const cleaned = cache.cleanupExpired();
      expect(cleaned).toBe(0);
    });

    it('should return 0 if TTL is not set', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const cleaned = cache.cleanupExpired();
      expect(cleaned).toBe(0);
    });
  });

  describe('stopCleanup', () => {
    it('should stop automatic cleanup', () => {
      const cache = new Cache<string, number>({
        ttl: 1000,
        cleanupInterval: 500,
      });
      cache.set('key1', 100);
      cache.stopCleanup();
      // Should not throw
      expect(cache.size()).toBe(1);
    });
  });

  describe('destroy', () => {
    it('should destroy cache and cleanup resources', () => {
      const cache = new Cache<string, number>({
        ttl: 1000,
        cleanupInterval: 500,
      });
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.destroy();
      expect(cache.size()).toBe(0);
    });
  });
});

