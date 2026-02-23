import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.8.0',
  date: 'February 23, 2026',
  type: 'minor' as const,
  mainTitle: '� Bug Fixes & Statement of Account Export',
  highlights: [
    'Statement of Account PDF export with official form layout',
    'Statement of Account Excel export',
    'Fixed assembly parts page crash',
    'Fixed project analysis report empty data',
  ],
  changes: {
    added: [
      'Statement of Account — PDF export with Hexa Steel branded header, summary, transaction table, and footer',
      'Statement of Account — Excel export with structured worksheet and proper formatting',
    ],
    fixed: [
      'Assembly Parts page crash — totalArea.toFixed null safety when no records match',
      'Project Analysis report empty — requires full sync to populate dolibarr_projects table',
    ],
    changed: [],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
