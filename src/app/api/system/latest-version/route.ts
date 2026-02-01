import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.4.5',
  date: 'February 1, 2026',
  type: 'patch' as const,
  mainTitle: '🐛 Bug Fixes & 🎨 UI/UX Improvements',
  highlights: [
    'Fixed payment percentage import and calculation issues',
    'Enhanced RAL color display with names and preview',
    'Fixed task form data loss and project edit issues',
    'Improved navigation and removed duplicate fields',
  ],
  changes: {
    added: [
      {
        title: 'Enhanced RAL Color Display',
        items: [
          'Added RAL color names mapping for 200+ colors (e.g., 7015 → Slate Grey)',
          'Display color name below RAL number in italic text',
          'Color preview box shows actual RAL color (12x12 rounded square)',
          'Tooltip shows both RAL number and color name',
          'Improved visual hierarchy with flex-col layout',
        ],
      },
      {
        title: 'Painting System Total Microns',
        items: [
          'Automatic calculation of total microns from all coating layers',
          'Blue-highlighted row showing sum of all coat microns',
          'Format: "Total Microns: 218 μm"',
          'Only displays when coats are defined and total > 0',
        ],
      },
    ],
    fixed: [
      {
        title: 'Payment Percentage Import Issue',
        items: [
          'Fixed async state issue causing field mappings to be undefined during import',
          'Resolved Excel column name trimming problem (spaces in column headers)',
          'Added automatic payment amount calculation from percentages during import',
          'Formula: Payment Amount = Contract Value × Percentage ÷ 100',
          'Applied to all payment terms (down payment, payment 2-6)',
        ],
      },
      {
        title: 'Task Form Data Loss',
        items: [
          'Fixed optional fields (building, department) resetting to default when editing tasks',
          'Added buildingId and departmentId to Task type definition',
          'Initialize state with existing task values instead of empty strings',
        ],
      },
      {
        title: 'Project Edit Contract Value',
        items: [
          'Fixed contract value disappearing when editing projects',
          'Changed conversion logic to handle 0 values correctly',
          'Use explicit null/undefined check instead of truthy check',
        ],
      },
    ],
    changed: [
      'Technical Specifications section now expands by default',
      'Removed duplicate "Contractual Tonnage" field (already in dashboard)',
      'Removed duplicate "3rd Party Required" field below welding specs',
      'Made Tasks card clickable to navigate to tasks page with project filter',
      'Added hover effect and cursor pointer for better UX',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
