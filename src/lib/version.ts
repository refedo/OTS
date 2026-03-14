/**
 * Centralized version management for Hexa Steel OTS
 * Update this file to change version across the entire platform
 */

export const APP_VERSION = {
  version: '15.20.1',
  date: 'March 14, 2026',
  type: 'patch' as const,
  name: 'Hexa Steel Operation Tracking System',
};

export const CURRENT_VERSION = APP_VERSION.version;

// Export for backward compatibility
export default APP_VERSION;
