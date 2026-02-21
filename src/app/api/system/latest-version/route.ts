import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.5.4',
  date: 'February 20, 2026',
  type: 'patch' as const,
  mainTitle: '🎨 PTS Sync & Appearance Enhancements',
  highlights: [
    'Building Weight Field in Wizard',
    'PTS Building Mapping Dialog',
    'Color Palette Settings',
    'Project Management View Colorization',
    'Full Theme System with Custom Themes',
  ],
  changes: {
    added: [
      {
        title: '🏗️ Building Management',
        items: [
          'Building weight field in project wizard and buildings table',
          'Building weight displayed on project details page',
        ],
      },
      {
        title: '🔄 PTS Sync Enhancements',
        items: [
          'Building mapping dialog to match PTS buildings with OTS buildings',
          'Auto-extract building designation from part designation if column is empty',
          'Expanded sync history dialog showing all columns',
          'Fixed building designation column mapping (column S)',
        ],
      },
      {
        title: '🎨 Appearance Settings',
        items: [
          'Full theme system with 7 preset themes including Hexa Steel Slate (#2c3e50)',
          'Custom theme creation with color picker',
          'Theme persists across page refreshes',
          'Project management view colorization by level (project/building/department)',
        ],
      },
    ],
    fixed: [
      'Fixed scope schedule creation - dates now optional',
      'Fixed PTS sync building designation column (S instead of R)',
      'Fixed PTS sync history dialog width',
      'Theme now persists on page refresh',
    ],
    changed: [
      'Project management view rows now color-coded by hierarchy level',
      'Buildings card in PTS sync now clickable to open mapping dialog',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
