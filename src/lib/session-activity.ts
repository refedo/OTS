/**
 * Session Activity Tracker
 * Implements idle timeout detection similar to Dolibarr ERP
 * - Tracks user activity (mouse, keyboard, clicks)
 * - Automatically logs out after 2 hours of inactivity
 * - Warns user before logout
 */

const IDLE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before logout
const ACTIVITY_THROTTLE = 60 * 1000; // Update activity every 1 minute max

export class SessionActivityTracker {
  private lastActivityTime: number;
  private warningShown: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private activityThrottle: NodeJS.Timeout | null = null;
  private onWarning?: () => void;
  private onLogout?: () => void;

  constructor(onWarning?: () => void, onLogout?: () => void) {
    this.lastActivityTime = Date.now();
    this.onWarning = onWarning;
    this.onLogout = onLogout;
  }

  /**
   * Start tracking user activity
   */
  start() {
    // Track user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, this.handleActivity);
    });

    // Check for idle timeout every minute
    this.checkInterval = setInterval(() => {
      this.checkIdleTimeout();
    }, 60 * 1000);

    // Initial check
    this.checkIdleTimeout();
  }

  /**
   * Stop tracking
   */
  stop() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.removeEventListener(event, this.handleActivity);
    });

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.activityThrottle) {
      clearTimeout(this.activityThrottle);
      this.activityThrottle = null;
    }
  }

  /**
   * Handle user activity - throttled to avoid excessive updates
   */
  private handleActivity = () => {
    if (this.activityThrottle) return;

    this.lastActivityTime = Date.now();
    this.warningShown = false;

    // Update server-side activity timestamp
    this.updateServerActivity();

    // Throttle activity updates
    this.activityThrottle = setTimeout(() => {
      this.activityThrottle = null;
    }, ACTIVITY_THROTTLE);
  };

  /**
   * Update server-side last activity timestamp
   */
  private async updateServerActivity() {
    try {
      await fetch('/api/auth/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }

  /**
   * Check if user has been idle too long
   */
  private checkIdleTimeout() {
    const now = Date.now();
    const idleTime = now - this.lastActivityTime;

    // Show warning 5 minutes before logout
    if (idleTime >= IDLE_TIMEOUT - WARNING_TIME && !this.warningShown) {
      this.warningShown = true;
      if (this.onWarning) {
        this.onWarning();
      }
    }

    // Logout after idle timeout
    if (idleTime >= IDLE_TIMEOUT) {
      this.performLogout();
    }
  }

  /**
   * Perform logout
   */
  private performLogout() {
    this.stop();
    if (this.onLogout) {
      this.onLogout();
    } else {
      // Default logout behavior
      window.location.href = '/login?reason=idle';
    }
  }

  /**
   * Reset activity timer (e.g., when user dismisses warning)
   */
  resetActivity() {
    this.lastActivityTime = Date.now();
    this.warningShown = false;
    this.updateServerActivity();
  }

  /**
   * Get remaining time before logout (in milliseconds)
   */
  getRemainingTime(): number {
    const idleTime = Date.now() - this.lastActivityTime;
    return Math.max(0, IDLE_TIMEOUT - idleTime);
  }
}
