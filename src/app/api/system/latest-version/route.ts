import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.4.4',
  date: 'February 1, 2026',
  type: 'patch' as const,
  mainTitle: '🎨 UI/UX Improvements',
  highlights: [
    'Sticky table headers across all tables',
    'Production Daily Report (PDR) Table',
    'Updated workflow phases (Detailing, Production, Dispatch)',
    'New Project Wizard enhancements',
  ],
  changes: {
    added: [
      {
        title: 'Table Header Styling',
        items: [
          'Sticky table headers across all tables in the system',
          'Distinct background color (slate-100/slate-800) for headers',
          'Headers remain visible when scrolling through long tables',
          'Improved visual hierarchy and data readability',
        ],
      },
      {
        title: 'Production Daily Report (PDR) Table',
        items: [
          'Added comprehensive daily production breakdown at bottom of production dashboard',
          'Shows when project is selected with data by process type',
          'Includes all processes: Cutting, Fit-up, Welding, Visualization, Sandblasting, Galvanization, Painting, Dispatch',
          'Color-coded headers for easy process identification',
        ],
      },
      {
        title: 'New Project Wizard Page',
        items: [
          'Added dedicated page for project-specific requirements',
          'Cranes Configuration: Option to include/exclude cranes for installation',
          'Surveyor Scope: Toggle to determine if surveying is within project scope',
          '3rd Party Testing: Configuration for third-party testing requirements',
          'Responsibility Assignment: Option to assign third-party responsibility',
        ],
      },
    ],
    fixed: [],
    changed: [
      'Applied consistent header styling system-wide',
      'Enhanced contrast between headers and data rows',
      'Updated workflow sequence: Design → Detailing (Shop Drawings) → Procurement → Production → Coating → Dispatch & Delivery → Erection → Handover',
      'Renamed "Shop Drawing" to "Detailing (Shop Drawings)" for clarity',
      'Renamed "Fabrication" to "Production" for consistency',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
