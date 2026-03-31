/**
 * Centralized version management for Hexa Steel OTS
 * Version is injected at build time from package.json via next.config.ts.
 * To update the version, change it in package.json only.
 */

const resolvedVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

export const APP_VERSION = {
  version: resolvedVersion,
  date: 'March 31, 2026',
  type: 'minor' as const,
