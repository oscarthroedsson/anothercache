import { Cache } from '../src/cache';

describe('Cache Events', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('on() - Event Registration', () => {
    it('should register listener for specific key and event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('key1', 'set', handler);
      cache.set('key1', 100);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('key1', 100, 'set');
    });

    it('should register listener for all events on a key', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('key1', handler);
      cache.set('key1', 100);
      cache.get('key1');
      cache.delete('key1');

      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenCalledWith('key1', 100, 'set');
      expect(handler).toHaveBeenCalledWith('key1', 100, 'get');
      expect(handler).toHaveBeenCalledWith('key1', undefined, 'delete');
    });

    it('should register listener for all keys with wildcard', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('*', 'set', handler);
      cache.set('key1', 100);
      cache.set('key2', 200);

      expect(handler).toHaveBeenCalledTimes(2);
      // When listening to '*', the actual key is passed as first argument
      expect(handler).toHaveBeenCalledWith('key1', 100, 'set');
      expect(handler).toHaveBeenCalledWith('key2', 200, 'set');
    });

    it('should register listener for all keys and all events', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('*', handler);
      cache.set('key1', 100);
      cache.get('key1');
      cache.set('key2', 200);

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('set events', () => {
    it('should emit set event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('key1', 'set', handler);
      cache.set('key1', 100);

      expect(handler).toHaveBeenCalledWith('key1', 100, 'set');
    });

    it('should emit setMany event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('*', 'setMany', handler);
      cache.setMany([
        ['key1', 100],
        ['key2', 200],
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        ['key1', 'key2'],
        [100, 200],
        'setMany'
      );
    });
  });

  describe('get events', () => {
    it('should emit get event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.on('key1', 'get', handler);
      const value = cache.get('key1');

      expect(handler).toHaveBeenCalledWith('key1', 100, 'get');
      expect(value).toBe(100);
    });

    it('should emit get event even when value is undefined', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('key1', 'get', handler);
      const value = cache.get('key1');

      expect(handler).toHaveBeenCalledWith('key1', undefined, 'get');
      expect(value).toBeUndefined();
    });

    it('should emit getMany event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.on('*', 'getMany', handler);
      const values = cache.getMany(['key1', 'key2', 'key3']);

      expect(handler).toHaveBeenCalledWith(
        ['key1', 'key2', 'key3'],
        [100, 200],
        'getMany'
      );
      expect(values).toEqual([100, 200]);
    });
  });

  describe('delete events', () => {
    it('should emit delete event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.on('key1', 'delete', handler);
      const deleted = cache.delete('key1');

      expect(handler).toHaveBeenCalledWith('key1', undefined, 'delete');
      expect(deleted).toBe(true);
    });

    it('should not emit delete event if key does not exist', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('key1', 'delete', handler);
      const deleted = cache.delete('key1');

      expect(handler).not.toHaveBeenCalled();
      expect(deleted).toBe(false);
    });

    it('should emit deleteMany event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      cache.on('*', 'deleteMany', handler);
      const deleted = cache.deleteMany(['key1', 'key2', 'key4']);

      expect(handler).toHaveBeenCalledWith(
        ['key1', 'key2'],
        undefined,
        'deleteMany'
      );
      expect(deleted).toBe(2);
    });
  });

  describe('mutate events', () => {
    it('should emit mutate event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.on('key1', 'mutate', handler);
      const result = cache.mutate('key1', (v) => v * 2);

      expect(handler).toHaveBeenCalledWith('key1', 200, 'mutate');
      expect(result).toBe(200);
    });

    it('should emit upsert event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('key1', 'upsert', handler);
      const result = cache.upsert('key1', 100);

      expect(handler).toHaveBeenCalledWith('key1', 100, 'upsert');
      expect(result).toBe(100);
    });

    it('should emit increment event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.on('key1', 'increment', handler);
      const result = cache.increment('key1', 5);

      expect(handler).toHaveBeenCalledWith('key1', 105, 'increment');
      expect(result).toBe(105);
    });

    it('should emit decrement event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.on('key1', 'decrement', handler);
      const result = cache.decrement('key1', 5);

      expect(handler).toHaveBeenCalledWith('key1', 95, 'decrement');
      expect(result).toBe(95);
    });

    it('should emit append event', () => {
      const cache = new Cache<string, number[]>();
      const handler = jest.fn();

      cache.set('key1', [1, 2]);
      cache.on('key1', 'append', handler);
      const result = cache.append('key1', 3, 4);

      expect(handler).toHaveBeenCalledWith('key1', [1, 2, 3, 4], 'append');
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should emit merge event', () => {
      const cache = new Cache<string, { a: number; b: number }>();
      const handler = jest.fn();

      cache.set('key1', { a: 1, b: 2 });
      cache.on('key1', 'merge', handler);
      const result = cache.merge('key1', { b: 3, c: 4 });

      expect(handler).toHaveBeenCalledWith(
        'key1',
        { a: 1, b: 3, c: 4 },
        'merge'
      );
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });
  });

  describe('utility events', () => {
    it('should emit size event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.on('*', 'size', handler);
      const size = cache.size();

      expect(handler).toHaveBeenCalledWith(undefined, undefined, 'size');
      expect(size).toBe(1);
    });

    it('should emit sizeInBytes event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.on('*', 'sizeInBytes', handler);
      const bytes = cache.sizeInBytes();

      expect(handler).toHaveBeenCalledWith(undefined, undefined, 'sizeInBytes');
      expect(bytes).toBeGreaterThan(0);
    });

    it('should emit keys event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.on('*', 'keys', handler);
      const keys = cache.keys();

      expect(handler).toHaveBeenCalledWith(undefined, keys, 'keys');
      expect(keys).toEqual(['key1', 'key2']);
    });

    it('should emit values event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.on('*', 'values', handler);
      const values = cache.values();

      expect(handler).toHaveBeenCalledWith(undefined, values, 'values');
      expect(values).toEqual([100, 200]);
    });

    it('should emit entries event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.on('*', 'entries', handler);
      const entries = cache.entries();

      expect(handler).toHaveBeenCalledWith(undefined, entries, 'entries');
      expect(entries).toEqual([['key1', 100]]);
    });

    it('should emit isEmpty event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('*', 'isEmpty', handler);
      const isEmpty = cache.isEmpty();

      expect(handler).toHaveBeenCalledWith(undefined, true, 'isEmpty');
      expect(isEmpty).toBe(true);
    });

    it('should emit randomKey event', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.on('*', 'randomKey', handler);
      const random = cache.randomKey();

      // randomKey emits with undefined key since it's a utility function
      expect(handler).toHaveBeenCalledWith(undefined, undefined, 'randomKey');
      expect(['key1', 'key2']).toContain(random);
    });
  });

  describe('off() - Event Removal', () => {
    it('should remove specific event listener', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('key1', 'set', handler);
      cache.off('key1', 'set', handler);
      cache.set('key1', 100);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all listeners for a specific event on a key', () => {
      const cache = new Cache<string, number>();
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      cache.on('key1', 'set', handler1);
      cache.on('key1', 'set', handler2);
      cache.off('key1', 'set');
      cache.set('key1', 100);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove handler from all events on a key', () => {
      const cache = new Cache<string, number>();
      const handler = jest.fn();

      cache.on('key1', handler);
      cache.off('key1', handler);
      cache.set('key1', 100);
      cache.get('key1');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all listeners for a key', () => {
      const cache = new Cache<string, number>();
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      cache.on('key1', 'set', handler1);
      cache.on('key1', 'get', handler2);
      cache.off('key1');
      cache.set('key1', 100);
      cache.get('key1');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Multiple listeners', () => {
    it('should call multiple listeners for the same event', () => {
      const cache = new Cache<string, number>();
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      cache.on('key1', 'set', handler1);
      cache.on('key1', 'set', handler2);
      cache.set('key1', 100);

      expect(handler1).toHaveBeenCalledWith('key1', 100, 'set');
      expect(handler2).toHaveBeenCalledWith('key1', 100, 'set');
    });

    it('should handle errors in event handlers gracefully', () => {
      const cache = new Cache<string, number>();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const handler = jest.fn(() => {
        throw new Error('Handler error');
      });

      cache.on('key1', 'set', handler);
      cache.set('key1', 100);

      expect(handler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in cache event handler:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
