import { Cache } from '../../src/cache';

describe('Mutate Operations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('mutate', () => {
    it('should update an existing value using a function', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const result = cache.mutate('key1', (value) => value * 2);
      expect(result).toBe(200);
      expect(cache.get('key1')).toBe(200);
    });

    it('should return undefined if key does not exist', () => {
      const cache = new Cache<string, number>();
      const result = cache.mutate('nonexistent', (value) => value * 2);
      expect(result).toBeUndefined();
    });
  });

  describe('upsert', () => {
    it('should update existing value', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const result = cache.upsert('key1', 200);
      expect(result).toBe(200);
      expect(cache.get('key1')).toBe(200);
    });

    it('should insert value if it does not exist', () => {
      const cache = new Cache<string, number>();
      const result = cache.upsert('key1', 100);
      expect(result).toBe(100);
      expect(cache.get('key1')).toBe(100);
    });

    it('should use updater function if provided', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const result = cache.upsert('key1', (value) => (value || 0) + 50);
      expect(result).toBe(150);
      expect(cache.get('key1')).toBe(150);
    });
  });

  describe('increment', () => {
    it('should increment a numeric value', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const result = cache.increment('key1', 10);
      expect(result).toBe(110);
      expect(cache.get('key1')).toBe(110);
    });

    it('should increment by 1 by default', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const result = cache.increment('key1');
      expect(result).toBe(101);
    });
  });

  describe('decrement', () => {
    it('should decrement a numeric value', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const result = cache.decrement('key1', 10);
      expect(result).toBe(90);
      expect(cache.get('key1')).toBe(90);
    });

    it('should decrement by 1 by default', () => {
      const cache = new Cache<string, number>();
      cache.set('key1', 100);
      const result = cache.decrement('key1');
      expect(result).toBe(99);
    });
  });

  describe('append', () => {
    it('should append items to an array', () => {
      const cache = new Cache<string, number[]>();
      cache.set('key1', [1, 2, 3]);
      const result = cache.append('key1', 4, 5);
      expect(result).toEqual([1, 2, 3, 4, 5]);
      expect(cache.get('key1')).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('merge', () => {
    it('should merge objects', () => {
      const cache = new Cache<string, { a: number; b: number; c: number }>();
      cache.set('key1', { a: 1, b: 2, c: 3 });
      const result = cache.merge('key1', { b: 20, c: 30 });
      expect(result).toEqual({ a: 1, b: 20, c: 30 });
      expect(cache.get('key1')).toEqual({ a: 1, b: 20, c: 30 });
    });
  });
});

