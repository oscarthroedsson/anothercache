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
    describe('objects', () => {
      it('should merge objects', () => {
        const cache = new Cache<string, { a: number; b: number; c: number }>();
        cache.set('key1', { a: 1, b: 2, c: 3 });
        const result = cache.merge('key1', { b: 20, c: 30 });
        expect(result).toEqual({ a: 1, b: 20, c: 30 });
        expect(cache.get('key1')).toEqual({ a: 1, b: 20, c: 30 });
      });

      it('should add new properties that dont exist in original object', () => {
        const cache = new Cache<string, { name: string; age: number }>();
        cache.set('person', { name: 'Alice', age: 25 });
        const result = cache.merge('person', {
          city: 'Stockholm',
          country: 'Sweden',
        });
        expect(result).toEqual({
          name: 'Alice',
          age: 25,
          city: 'Stockholm',
          country: 'Sweden',
        });
        expect(cache.get('person')).toEqual({
          name: 'Alice',
          age: 25,
          city: 'Stockholm',
          country: 'Sweden',
        });
      });

      it('should update existing and add new properties', () => {
        const cache = new Cache<string, { name: string; age: number }>();
        cache.set('person', { name: 'Bob', age: 30 });
        const result = cache.merge('person', { age: 31, city: 'London' });
        expect(result).toEqual({ name: 'Bob', age: 31, city: 'London' });
      });
    });

    describe('strings', () => {
      it('should concatenate strings', () => {
        const cache = new Cache<string, string>();
        cache.set('greeting', 'hej');
        const result = cache.merge('greeting', 'då');
        expect(result).toBe('hejdå');
        expect(cache.get('greeting')).toBe('hejdå');
      });

      it('should concatenate multiple string merges', () => {
        const cache = new Cache<string, string>();
        cache.set('text', 'Hello');
        cache.merge('text', ' ');
        cache.merge('text', 'World');
        expect(cache.get('text')).toBe('Hello World');
      });
    });

    describe('numbers', () => {
      it('should concatenate numbers as strings then convert back', () => {
        const cache = new Cache<string, number>();
        cache.set('value', 4);
        const result = cache.merge('value', 2);
        expect(result).toBe(42);
        expect(cache.get('value')).toBe(42);
      });

      it('should concatenate multiple number merges', () => {
        const cache = new Cache<string, number>();
        cache.set('code', 1);
        cache.merge('code', 2);
        cache.merge('code', 3);
        expect(cache.get('code')).toBe(123);
      });
    });

    describe('arrays', () => {
      it('should concatenate arrays without duplicates by default', () => {
        const cache = new Cache<string, number[]>();
        cache.set('items', [1, 2, 3]);
        const result = cache.merge('items', [3, 4, 5]);
        expect(result).toEqual([1, 2, 3, 4, 5]); // 3 should not be duplicated
      });

      it('should allow duplicates when allowDuplicates option is true', () => {
        const cache = new Cache<string, number[]>();
        cache.set('items', [1, 2, 3]);
        const result = cache.merge('items', [3, 4, 5], {
          allowDuplicates: true,
        });
        expect(result).toEqual([1, 2, 3, 3, 4, 5]); // 3 should be duplicated
      });

      it('should use cache-level allowDuplicates setting', () => {
        const cache = new Cache<string, number[]>({
          mergeAllowDuplicates: true,
        });
        cache.set('items', [1, 2]);
        const result = cache.merge('items', [2, 3]);
        expect(result).toEqual([1, 2, 2, 3]); // Duplicates allowed
      });

      it('should override cache-level setting with option parameter', () => {
        const cache = new Cache<string, number[]>({
          mergeAllowDuplicates: true,
        });
        cache.set('items', [1, 2]);
        const result = cache.merge('items', [2, 3], { allowDuplicates: false });
        expect(result).toEqual([1, 2, 3]); // Duplicates removed despite cache setting
      });
    });
  });
});
