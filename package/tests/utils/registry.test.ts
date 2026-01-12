import { Cache } from '../../src/cache';
import { CacheRegistry } from '../../src/utils/registry';

// Mock console.warn to test standard warnings
const originalConsoleWarn = console.warn;
let consoleWarnCalls: string[] = [];

beforeEach(() => {
  jest.useFakeTimers();
  consoleWarnCalls = [];
  console.warn = jest.fn((message: string) => {
    consoleWarnCalls.push(message);
  });
  // Stop monitoring to have control in tests
  CacheRegistry.stopMonitoring();
});

afterEach(() => {
  jest.useRealTimers();
  console.warn = originalConsoleWarn;
  // Clear all instances
  const instances = CacheRegistry.getAllInstances();
  instances.forEach((instance) => {
    try {
      instance.destroy();
    } catch (e) {
      // Ignore errors
    }
  });
});

describe('CacheRegistry', () => {
  describe('Instance Registration', () => {
    it('should register cache instances automatically', () => {
      const cache1 = new Cache<string, number>();
      const cache2 = new Cache<string, string>();

      expect(CacheRegistry.getInstanceCount()).toBe(2);
    });

    it('should unregister instances when destroyed', () => {
      const cache1 = new Cache<string, number>();
      const cache2 = new Cache<string, string>();

      expect(CacheRegistry.getInstanceCount()).toBe(2);

      cache1.destroy();

      expect(CacheRegistry.getInstanceCount()).toBe(1);
    });

    it('should track all instances', () => {
      const cache1 = new Cache<string, number>();
      const cache2 = new Cache<string, string>();
      const cache3 = new Cache<string, boolean>();

      const instances = CacheRegistry.getAllInstances();
      expect(instances.length).toBe(3);
      expect(instances).toContain(cache1);
      expect(instances).toContain(cache2);
      expect(instances).toContain(cache3);
    });
  });

  describe('Monitoring', () => {
    it('should start and stop monitoring', () => {
      CacheRegistry.startMonitoring(1000);
      expect(CacheRegistry['monitoringInterval']).toBeDefined();

      CacheRegistry.stopMonitoring();
      expect(CacheRegistry['monitoringInterval']).toBeUndefined();
    });

    it('should check instances periodically', () => {
      const cache = new Cache<string, string>();
      const checkSpy = jest.spyOn(CacheRegistry as any, 'checkAllInstances');

      CacheRegistry.startMonitoring(1000);
      jest.advanceTimersByTime(2500);

      // Should have been called at least twice (at 1s and 2s)
      expect(checkSpy).toHaveBeenCalledTimes(2);

      CacheRegistry.stopMonitoring();
      checkSpy.mockRestore();
    });
  });

  describe('Alarm Thresholds', () => {
    it('should trigger warning at 1GB with default message', () => {
      const cache = new Cache<string, string>();

      // Simulate large cache by setting many large values
      // 1GB = 1024 * 1024 * 1024 bytes
      // Each entry is approximately: key (4 bytes) + value + overhead (~64 bytes)
      // To reach 1GB we need approximately 1GB / 1000 bytes per entry = ~1,000,000 entries
      // But for testing, let's use a smaller threshold by mocking sizeInBytes

      // Mock sizeInBytes to return 1GB
      jest.spyOn(cache, 'sizeInBytes').mockReturnValue(1 * 1024 * 1024 * 1024);

      CacheRegistry.checkAllInstances();

      expect(console.warn).toHaveBeenCalled();
      expect(consoleWarnCalls[0]).toContain('WARNING');
      expect(consoleWarnCalls[0]).toContain('dangerous level');
    });

    it('should trigger critical at 1.5GB with default message', () => {
      const cache = new Cache<string, string>();

      // Mock sizeInBytes to return 1.5GB
      jest
        .spyOn(cache, 'sizeInBytes')
        .mockReturnValue(1.5 * 1024 * 1024 * 1024);

      CacheRegistry.checkAllInstances();

      expect(console.warn).toHaveBeenCalled();
      expect(consoleWarnCalls[0]).toContain('CRITICAL');
      expect(consoleWarnCalls[0]).toContain('at risk at node engine crash');
    });

    it('should not trigger alarm below 1GB', () => {
      const cache = new Cache<string, string>();

      // Mock sizeInBytes to return 500MB
      jest.spyOn(cache, 'sizeInBytes').mockReturnValue(500 * 1024 * 1024);

      CacheRegistry.checkAllInstances();

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should use custom onWarning callback when provided', () => {
      const onWarning = jest.fn();
      const cache = new Cache<string, string>({
        alarm: {
          onWarning,
        },
      });

      // Mock sizeInBytes to return 1GB
      jest.spyOn(cache, 'sizeInBytes').mockReturnValue(1 * 1024 * 1024 * 1024);

      CacheRegistry.checkAllInstances();

      expect(onWarning).toHaveBeenCalledTimes(1);
      // console.warn should not be called when custom callback exists
      const warnCalls = (console.warn as jest.Mock).mock.calls;
      const hasWarningMessage = warnCalls.some((call) =>
        call[0]?.includes('WARNING')
      );
      expect(hasWarningMessage).toBe(false);
    });

    it('should use custom onCritical callback when provided', () => {
      const onCritical = jest.fn();
      const cache = new Cache<string, string>({
        alarm: {
          onCritical,
        },
      });

      // Mock sizeInBytes to return 1.5GB
      jest
        .spyOn(cache, 'sizeInBytes')
        .mockReturnValue(1.5 * 1024 * 1024 * 1024);

      CacheRegistry.checkAllInstances();

      expect(onCritical).toHaveBeenCalledTimes(1);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should trigger warning before critical', () => {
      const onWarning = jest.fn();
      const onCritical = jest.fn();
      const cache = new Cache<string, string>({
        alarm: {
          onWarning,
          onCritical,
        },
      });

      // Mock sizeInBytes to return 1.2GB (between warning and critical)
      jest
        .spyOn(cache, 'sizeInBytes')
        .mockReturnValue(1.2 * 1024 * 1024 * 1024);

      CacheRegistry.checkAllInstances();

      expect(onWarning).toHaveBeenCalledTimes(1);
      expect(onCritical).not.toHaveBeenCalled();
    });

    it('should trigger critical when above 1.5GB', () => {
      const onWarning = jest.fn();
      const onCritical = jest.fn();
      const cache = new Cache<string, string>({
        alarm: {
          onWarning,
          onCritical,
        },
      });

      // Mock sizeInBytes to return 1.5GB
      jest
        .spyOn(cache, 'sizeInBytes')
        .mockReturnValue(1.5 * 1024 * 1024 * 1024);

      CacheRegistry.checkAllInstances();

      expect(onCritical).toHaveBeenCalledTimes(1);
      expect(onWarning).not.toHaveBeenCalled(); // Critical overrides warning
    });
  });

  describe('Multiple Instances', () => {
    it('should check all instances', () => {
      const onWarning1 = jest.fn();
      const onWarning2 = jest.fn();

      const cache1 = new Cache<string, string>({
        alarm: {
          onWarning: onWarning1,
        },
      });
      const cache2 = new Cache<string, string>({
        alarm: {
          onWarning: onWarning2,
        },
      });

      // Mock sizeInBytes for both
      jest.spyOn(cache1, 'sizeInBytes').mockReturnValue(1 * 1024 * 1024 * 1024);
      jest.spyOn(cache2, 'sizeInBytes').mockReturnValue(1 * 1024 * 1024 * 1024);

      CacheRegistry.checkAllInstances();

      expect(onWarning1).toHaveBeenCalledTimes(1);
      expect(onWarning2).toHaveBeenCalledTimes(1);
    });
  });
});
