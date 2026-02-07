/**
 * Simple in-memory cache for API responses
 * Reduces database load by caching frequently accessed data
 */

// Global singleton guard to prevent duplicate intervals
declare global {
  var __cacheCleanupInterval: NodeJS.Timeout | undefined;
}

// Maximum cache entries to prevent unbounded memory growth
const MAX_CACHE_ENTRIES = 100;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 60000; // 60 seconds default

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string, ttl?: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const maxAge = ttl || this.defaultTTL;
    const age = Date.now() - entry.timestamp;

    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data
   */
  set<T>(key: string, data: T): void {
    // Prevent unbounded growth - evict oldest entries if at limit
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(ttl?: number): void {
    const maxAge = ttl || this.defaultTTL;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const cache = new SimpleCache();

// Run cleanup every 5 minutes - with global guard to prevent duplicates
if (typeof window === 'undefined' && !global.__cacheCleanupInterval) {
  global.__cacheCleanupInterval = setInterval(() => cache.cleanup(), 5 * 60 * 1000);
}
