import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.4.1',
  date: 'January 17, 2026',
  type: 'patch' as const,
  mainTitle: '🔧 Planning Enhancements & Bug Fixes',
  highlights: [
    'Division Column in Planning',
    'Renamed Shop Drawing to Detailing',
    'Building Edit Error Fixed',
    'Building Filter Added',
  ],
  changes: {
    added: [
      {
        title: 'Division Column in Planning',
        items: [
          'Added Division column before Scope in planning page',
          'Auto-assigns division based on scope type (Engineering, Operations, Site)',
          'Color-coded badges: Engineering (purple), Operations (green), Site (orange)',
          'Division helper function for consistent assignment logic',
        ],
      },
      {
        title: 'Building Filter',
        items: [
          'Added building filter next to project filter in planning page',
          'Shows all buildings when no project selected',
          'Shows project-specific buildings when project is selected',
          'Fixed duplicate building keys issue',
        ],
      },
    ],
    fixed: [
      'Fixed building edit error: Cannot read properties of null (reading toUpperCase)',
      'Fixed duplicate building keys in filter dropdown',
      'What\'s New dialog now shows only once per version update',
    ],
    changed: [
      'Renamed "Shop Drawing" to "Detailing" throughout the system',
      'Updated all UI labels, API responses, and database records',
      'Updated document types, scope options, and timeline displays',
      'Updated operation timeline service to use "Detailing"',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
