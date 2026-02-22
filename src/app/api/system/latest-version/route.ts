import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '14.0.0',
  date: 'February 22, 2026',
  type: 'major' as const,
  mainTitle: '🔗 Dolibarr ERP Integration Module',
  highlights: [
    'Dolibarr v22.0.1 REST API Integration',
    'Product & Third Party Sync with Change Detection',
    'Steel Product Specifications System',
    'Bulk Specs Assignment Tool',
    'Integration Dashboard with Sync History',
  ],
  changes: {
    added: [
      {
        title: '🔗 Dolibarr ERP Integration',
        items: [
          'Full REST API client for Dolibarr v22.0.1 with retry logic and exponential backoff',
          'Mirror tables for products, third parties, and contacts synced from Dolibarr',
          'MD5 hash-based change detection — only updates records that actually changed',
          'Soft-delete for records removed from Dolibarr (preserves history)',
          'Automatic Unix timestamp conversion and string-to-number parsing for Dolibarr API',
          'PMP (Weighted Average Cost) field mapped for production costing',
        ],
      },
      {
        title: '🏗️ Steel Product Specifications',
        items: [
          'OTS-native steel specs table with grade, profile, dimensions, weight, and material properties',
          'Pre-populated steel grade reference data (S235JR through HARDOX500)',
          'Pre-populated profile reference data (IPE, HEA, HEB, UPN with standard dimensions)',
          'Auto-fill dimensions when selecting a standard profile size',
          'Surface finish, coating, and operational attributes (lead time, min order qty)',
          'Fabrication and welding notes per product',
        ],
      },
      {
        title: '📊 Bulk Specs Assignment',
        items: [
          'Pattern matching interface to assign specs to multiple products at once',
          'Preview matched products before applying changes',
          'Match by product ref or label with contains pattern',
          'COALESCE-based updates preserve existing specs when bulk-assigning',
        ],
      },
      {
        title: '�️ Integration Dashboard',
        items: [
          'Connection status card with Dolibarr version and API permissions check',
          'Sync status with last sync times and record counts',
          'Quick sync buttons for individual entity types or full sync',
          'Sync history table showing last 10 runs with duration and counts',
          'Products tab with search, profile type, and steel grade filters',
          'Third parties tab with customer/supplier type filter',
          'Steel specs editor modal with auto-populate from reference data',
        ],
      },
      {
        title: '🔧 API & Infrastructure',
        items: [
          'Protected cron endpoint for automated 30-minute sync cycles',
          'Reference data API for steel grades and profiles (dropdown population)',
          'Comprehensive sync logging with duration, counts, and error tracking',
          'Integration config table for sync settings management',
        ],
      },
      {
        title: '🔐 Login Form Enhancement',
        items: [
          'Added password visibility toggle (eye icon) to login form',
          'Users can now preview their password while typing',
        ],
      },
    ],
    fixed: [
      'Removed broken Appearance/Theme system that was overriding CSS variables with incompatible HSL values',
      'Root cause: ThemeProvider used HSL format while globals.css uses oklch',
      'Cleaned up 400+ lines of glass morphism CSS that caused visual glitches',
      'System restored to clean default muted theme defined in globals.css',
    ],
    changed: [
      'Added Dolibarr ERP section to sidebar navigation',
      'Updated navigation permissions for Dolibarr integration routes',
      'Added environment variables for Dolibarr API configuration',
      'Removed Appearance tab from Settings page and sidebar (was causing UI corruption)',
      'Replaced appearance page with redirect to main settings',
      'Simplified ThemeProvider to passthrough that clears saved theme data',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
