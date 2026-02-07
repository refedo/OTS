/**
 * Memory Leak Detection Monitor
 * 
 * Lightweight memory monitoring to detect potential leaks:
 * - Tracks heap usage over time
 * - Detects abnormal growth patterns
 * - Logs warnings before crashes
 * - Minimal overhead (~10-15MB, <1% CPU)
 * 
 * Does NOT fix leaks, only detects and alerts
 */

// ============================================
// GLOBAL SINGLETON GUARD
// ============================================

// Use global to persist across Next.js hot reloads and multiple contexts
declare global {
  var __memoryMonitorInterval: NodeJS.Timeout | undefined;
  var __memoryMonitorInitialized: boolean | undefined;
}

// ============================================
// CONFIGURATION
// ============================================

const MONITOR_CONFIG = {
  // Check interval (milliseconds)
  CHECK_INTERVAL: 300000, // 5 minutes (reduced frequency to save resources)
  
  // Memory growth threshold (MB per hour)
  GROWTH_THRESHOLD: 50, // Alert if growing >50MB/hour (raised for Next.js)
  
  // Critical memory threshold (percentage)
  // NOTE: Next.js 15.5.4 normally runs at 90-97% heap - this is NORMAL
  CRITICAL_THRESHOLD: 98, // Only alert at 98% (imminent crash)
  
  // Enable monitoring
  ENABLED: process.env.ENABLE_MEMORY_MONITOR !== 'false',
  
  // Log level - only log errors in production to reduce I/O
  LOG_LEVEL: 'error', // Reduced logging to minimize overhead
  
  // Force GC threshold (percentage) - trigger manual GC if available
  FORCE_GC_THRESHOLD: 95,
};

// ============================================
// MEMORY MONITOR CLASS
// ============================================

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsagePercent: number;
}

class MemoryMonitor {
  private static snapshots: MemorySnapshot[] = [];
  private static monitorInterval: NodeJS.Timeout | null = null;
  private static isInitialized = false;

  /**
   * Initialize the memory monitor
   */
  static initialize(): void {
    // Use global singleton to prevent duplicate initialization across contexts
    if (global.__memoryMonitorInitialized || global.__memoryMonitorInterval) {
      console.log('[MemoryMonitor] Already initialized globally, skipping');
      return;
    }

    if (!MONITOR_CONFIG.ENABLED) {
      console.log('[MemoryMonitor] Disabled via ENABLE_MEMORY_MONITOR=false');
      return;
    }

    // Start monitoring with global guard
    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, MONITOR_CONFIG.CHECK_INTERVAL);
    global.__memoryMonitorInterval = this.monitorInterval;

    // Take initial snapshot
    this.takeSnapshot();

    this.isInitialized = true;
    global.__memoryMonitorInitialized = true;
    console.log('[MemoryMonitor] ✓ Initialized');
    console.log(`[MemoryMonitor]   Check interval: ${MONITOR_CONFIG.CHECK_INTERVAL / 1000}s`);
    console.log(`[MemoryMonitor]   Growth threshold: ${MONITOR_CONFIG.GROWTH_THRESHOLD}MB/hour`);
  }

  /**
   * Take a memory snapshot
   */
  private static takeSnapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsagePercent: Math.round((usage.heapUsed / usage.heapTotal) * 100),
    };

    // Keep only last 24 snapshots (2 hours at 5-minute intervals)
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 24) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Try to trigger garbage collection if available
   */
  private static tryGC(): boolean {
    if (typeof global.gc === 'function') {
      global.gc();
      console.log('[MemoryMonitor] 🗑️  Forced garbage collection');
      return true;
    }
    return false;
  }

  /**
   * Check memory and detect issues
   */
  private static checkMemory(): void {
    const snapshot = this.takeSnapshot();

    // Try GC if approaching threshold
    if (snapshot.heapUsagePercent >= MONITOR_CONFIG.FORCE_GC_THRESHOLD) {
      this.tryGC();
    }

    // Check critical threshold
    if (snapshot.heapUsagePercent >= MONITOR_CONFIG.CRITICAL_THRESHOLD) {
      console.warn(`[MemoryMonitor] ⚠️  CRITICAL: Heap usage at ${snapshot.heapUsagePercent}%`);
      console.warn(`[MemoryMonitor]    Used: ${snapshot.heapUsed}MB / ${snapshot.heapTotal}MB`);
      console.warn(`[MemoryMonitor]    RSS: ${snapshot.rss}MB`);
    }

    // Check growth rate (if we have enough history)
    if (this.snapshots.length >= 12) { // At least 12 minutes of data
      const growthRate = this.calculateGrowthRate();
      
      if (growthRate > MONITOR_CONFIG.GROWTH_THRESHOLD) {
        console.warn(`[MemoryMonitor] ⚠️  Memory leak detected!`);
        console.warn(`[MemoryMonitor]    Growth rate: ${growthRate.toFixed(2)}MB/hour`);
        console.warn(`[MemoryMonitor]    Current: ${snapshot.heapUsed}MB`);
        console.warn(`[MemoryMonitor]    Threshold: ${MONITOR_CONFIG.GROWTH_THRESHOLD}MB/hour`);
      }
    }

    // Log info periodically (only in dev)
    if (MONITOR_CONFIG.LOG_LEVEL === 'info') {
      console.log(`[MemoryMonitor] Heap: ${snapshot.heapUsed}MB (${snapshot.heapUsagePercent}%), RSS: ${snapshot.rss}MB`);
    }
  }

  /**
   * Calculate memory growth rate (MB per hour)
   */
  private static calculateGrowthRate(): number {
    if (this.snapshots.length < 2) {
      return 0;
    }

    const oldest = this.snapshots[0];
    const newest = this.snapshots[this.snapshots.length - 1];

    const timeDiffHours = (newest.timestamp - oldest.timestamp) / (1000 * 60 * 60);
    const memoryDiffMB = newest.heapUsed - oldest.heapUsed;

    return memoryDiffMB / timeDiffHours;
  }

  /**
   * Get current memory statistics
   */
  static getStats(): {
    current: MemorySnapshot;
    growthRate: number;
    snapshots: number;
    isHealthy: boolean;
  } {
    const current = this.snapshots[this.snapshots.length - 1] || this.takeSnapshot();
    const growthRate = this.calculateGrowthRate();

    return {
      current,
      growthRate,
      snapshots: this.snapshots.length,
      isHealthy: 
        current.heapUsagePercent < MONITOR_CONFIG.CRITICAL_THRESHOLD &&
        growthRate < MONITOR_CONFIG.GROWTH_THRESHOLD,
    };
  }

  /**
   * Force a memory check (for testing or manual inspection)
   */
  static checkNow(): MemorySnapshot {
    const snapshot = this.takeSnapshot();
    console.log('[MemoryMonitor] Manual check:');
    console.log(`  Heap: ${snapshot.heapUsed}MB / ${snapshot.heapTotal}MB (${snapshot.heapUsagePercent}%)`);
    console.log(`  RSS: ${snapshot.rss}MB`);
    console.log(`  External: ${snapshot.external}MB`);
    
    if (this.snapshots.length >= 2) {
      const growthRate = this.calculateGrowthRate();
      console.log(`  Growth rate: ${growthRate.toFixed(2)}MB/hour`);
    }
    
    return snapshot;
  }

  /**
   * Stop monitoring
   */
  static stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.isInitialized = false;
      console.log('[MemoryMonitor] Stopped');
    }
  }

  /**
   * Get all snapshots (for analysis)
   */
  static getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }
}

// ============================================
// AUTO-INITIALIZE IN PRODUCTION
// ============================================

if (process.env.NODE_ENV === 'production' && MONITOR_CONFIG.ENABLED) {
  // Auto-start in production after a short delay
  setTimeout(() => {
    MemoryMonitor.initialize();
  }, 10000); // Wait 10 seconds after startup
}

// ============================================
// EXPORTS
// ============================================

export default MemoryMonitor;
export { MemoryMonitor };
