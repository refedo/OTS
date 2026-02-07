/**
 * Rate Limiter Utility
 * Simple in-memory rate limiter for API endpoints
 */

// Global singleton guard to prevent duplicate intervals
declare global {
  var __rateLimiterCleanupInterval: NodeJS.Timeout | undefined;
}

// Maximum entries to prevent unbounded memory growth
const MAX_RATE_LIMIT_ENTRIES = 1000;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 3600000) {
    // Default: 10 requests per hour
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up expired entries every 5 minutes - with global guard
    if (!global.__rateLimiterCleanupInterval) {
      global.__rateLimiterCleanupInterval = setInterval(() => this.cleanup(), 300000);
    }
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    
    // Prevent unbounded growth - cleanup if at limit
    if (this.limits.size >= MAX_RATE_LIMIT_ENTRIES) {
      this.cleanup();
    }
    
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Create new entry
      const resetTime = now + this.windowMs;
      this.limits.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    // Increment count
    entry.count++;
    this.limits.set(identifier, entry);
    return { allowed: true, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string) {
    this.limits.delete(identifier);
  }
}

// Export singleton instance for file uploads (10 files per hour)
export const fileUploadLimiter = new RateLimiter(10, 3600000);
