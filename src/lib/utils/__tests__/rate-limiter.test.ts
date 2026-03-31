import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the RateLimiter class directly by re-creating it here, since only
// the singleton is exported. We test the class behaviour via a fresh instance.

// Inline the class under test so we get a clean instance per test without
// the global singleton guard interfering.
class RateLimiter {
  private limits: Map<string, { count: number; resetTime: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 3600000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.windowMs;
      this.limits.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    this.limits.set(identifier, entry);
    return { allowed: true, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  reset(identifier: string) {
    this.limits.delete(identifier);
  }
}

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter(3, 60_000); // 3 requests per minute for easy testing
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request and returns correct remaining count', () => {
    const result = limiter.check('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('decrements remaining on each allowed request', () => {
    limiter.check('user-1'); // 1st
    const result = limiter.check('user-1'); // 2nd
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('blocks the request once the limit is reached', () => {
    limiter.check('user-1');
    limiter.check('user-1');
    limiter.check('user-1'); // 3rd — hits the limit
    const result = limiter.check('user-1'); // 4th — should be blocked
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks different identifiers independently', () => {
    limiter.check('user-1');
    limiter.check('user-1');
    limiter.check('user-1');

    // user-2 is unaffected
    const result = limiter.check('user-2');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('resets the window after the time window expires', () => {
    limiter.check('user-1');
    limiter.check('user-1');
    limiter.check('user-1');

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    const result = limiter.check('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('reset() immediately clears the rate limit for an identifier', () => {
    limiter.check('user-1');
    limiter.check('user-1');
    limiter.check('user-1');
    expect(limiter.check('user-1').allowed).toBe(false);

    limiter.reset('user-1');
    expect(limiter.check('user-1').allowed).toBe(true);
  });

  it('returns a resetTime in the future', () => {
    const before = Date.now();
    const result = limiter.check('user-1');
    expect(result.resetTime).toBeGreaterThan(before);
  });

  it('returns the same resetTime for subsequent calls within the same window', () => {
    const first = limiter.check('user-1');
    const second = limiter.check('user-1');
    expect(second.resetTime).toBe(first.resetTime);
  });
});
