/**
 * Centralized version management for Hexa Steel OTS
 * Version is injected at build time from package.json via next.config.ts.
 * To update the version, change it in package.json only.
 */

const resolvedVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

export const APP_VERSION = {
  version: resolvedVersion,
  date: 'March 26, 2026',
  type: 'minor' as const,
  name: 'Hexa Steel Operation Tracking System',
};

export const CURRENT_VERSION = APP_VERSION.version;

// Export for backward compatibility
export default APP_VERSION;
