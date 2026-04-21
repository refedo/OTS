/**
 * Centralized version management for Hexa Steel OTS
 * Reads directly from package.json so the version is always correct
 * regardless of runtime environment variables.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../package.json') as { version: string };

export const APP_VERSION = {
  version: pkgVersion,
  date: 'April 21, 2026',
  type: 'minor' as const, // 19.16.1 — Employee self-profile access: /hr/employees/me, 6 viewOwn permissions, PBAC activation, RBAC sync scripts, permission matrix search
  name: 'Hexa Steel Operation Tracking System',
};

export const CURRENT_VERSION = APP_VERSION.version;

export default APP_VERSION;
