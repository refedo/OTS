/**
 * Centralized version management for Hexa Steel OTS
 * Reads directly from package.json so the version is always correct
 * regardless of runtime environment variables.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../package.json') as { version: string };

export const APP_VERSION = {
  version: pkgVersion,
  date: 'April 28, 2026',
  type: 'patch' as const, // 22.0.1 — IMS fixes
  name: 'Hexa Steel Operation Tracking System',
};

export const CURRENT_VERSION = APP_VERSION.version;

export default APP_VERSION;
