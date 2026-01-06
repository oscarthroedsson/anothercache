import { Cache } from '../cache';
import { CacheAlarm } from '../types';

interface CacheInstanceInfo {
  instance: Cache<any, any>;
  createdAt: number;
  lastSizeCheck: number;
}

class CacheRegistry {
  private static instances = new WeakSet<Cache<any, any>>();
  private static instanceInfo = new Map<Cache<any, any>, CacheInstanceInfo>();
  private static monitoringInterval:
    | ReturnType<typeof setInterval>
    | number
    | undefined;

  // Standard thresholds
  private static readonly WARNING_THRESHOLD_BYTES = 1 * 1024 * 1024 * 1024; // 1GB
  private static readonly CRITICAL_THRESHOLD_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5GB
  private static readonly MAX_SAFE_BYTES = 1.6 * 1024 * 1024 * 1024; // 1.6GB

  static register(instance: Cache<any, any>): void {
    this.instances.add(instance);
    this.instanceInfo.set(instance, {
      instance,
      createdAt: Date.now(),
      lastSizeCheck: 0,
    });
  }

  static unregister(instance: Cache<any, any>): void {
    this.instanceInfo.delete(instance);
  }

  static checkAllInstances(): void {
    for (const [instance, info] of this.instanceInfo.entries()) {
      const currentSize = instance.sizeInBytes();

      // Update lastSizeCheck
      info.lastSizeCheck = currentSize;

      // Get alarm callbacks from the instance
      const alarm = instance.getAlarmConfig();

      // Check thresholds
      if (currentSize >= this.CRITICAL_THRESHOLD_BYTES) {
        if (alarm?.onCritical) {
          alarm.onCritical();
        } else {
          // Standard critical
          const remaining = this.MAX_SAFE_BYTES - currentSize;
          const remainingGB = (remaining / (1024 * 1024 * 1024)).toFixed(1);
          console.warn(
            `⚠️ CRITICAL: You have ${remainingGB}GB before you are at risk at node engine crash`
          );
        }
      } else if (currentSize >= this.WARNING_THRESHOLD_BYTES) {
        if (alarm?.onWarning) {
          alarm.onWarning();
        } else {
          // Standard warning
          const maxSizeGB = (
            this.MAX_SAFE_BYTES /
            (1024 * 1024 * 1024)
          ).toFixed(1);
          console.warn(
            `⚠️ WARNING: Cache is reaching dangerous level, max size is ${maxSizeGB}GB`
          );
        }
      }
    }
  }

  static startMonitoring(interval: number = 5000): void {
    // Stop any existing monitoring
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    // Start monitoring (works in both Node.js and browser)
    if (typeof setInterval !== 'undefined') {
      this.monitoringInterval = setInterval(() => {
        this.checkAllInstances();
      }, interval);
    }
  }

  static stopMonitoring(): void {
    if (this.monitoringInterval && typeof clearInterval !== 'undefined') {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  static getInstanceCount(): number {
    return this.instanceInfo.size;
  }

  static getAllInstances(): Cache<any, any>[] {
    return Array.from(this.instanceInfo.keys());
  }
}

export { CacheRegistry };
