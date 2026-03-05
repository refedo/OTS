import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🛠️ Infrastructure Updates & Version Management',
  highlights: [
    'Centralized version management system',
    'Automated version synchronization across all files',
    'Fixed build version display showing correct v15.18.4',
    'Added Strategic Objectives link to sidebar menu',
  ],
  changes: {
    added: [
      'Centralized Version Management — Single source of truth in src/lib/version.ts',
      'Automated Version Updates — scripts/update-version.js syncs version across all files',
      'Strategic Objectives Menu Link — Added to Business Planning section in sidebar',
    ],
    fixed: [
      'Build Version Display — Now correctly shows v15.18.4 instead of outdated v15.18.1',
      'All components now import version from centralized location',
      'Package.json version automatically synchronized',
    ],
    changed: [
      'Easier version updates going forward — just edit one file and run the script',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
