import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '✨ UI Enhancement & Smart Filtering',
  highlights: [
    'Recent Links & Bookmarks panel in the top bar — auto-tracks visited pages and lets you pin favourite pages for one-click access',
    'Production widget renamed to "Production Trend" with Day / Week / Month period selector',
    'LCR Reports simplified to Status Breakdown by Tonnage with Project and Building filter dropdowns',
    'Tasks: Main Activity and Sub-Activity columns are now sortable, plus new Activity & Sub-Activity filter dropdowns',
  ],
  changes: {
    added: [
      {
        title: 'Recent Links & Bookmarks Panel',
        items: [
          'History icon in the top bar (between Search and Notifications) opens a two-tab panel',
          'Recent tab: auto-tracks the last 15 visited pages in localStorage',
          'Bookmarks tab: pin favourite pages from the panel or hover on any recent entry to bookmark it',
          'Amber dot indicator on the icon when bookmarks exist; all data persisted locally per browser',
        ],
      },
      {
        title: 'Production Trend — Day / Week / Month Views',
        items: [
          'Widget renamed from "Weekly Production" to "Production Trend"',
          'Compact period selector (Day / Week / Month) in the card header',
          'API extended with ?period= param (day = 24 buckets, week = 7, month = 30)',
          'Summary labels update dynamically per period ("Total Today / This Week / This Month")',
        ],
      },
      {
        title: 'Tasks — Activity Sorting & Filtering',
        items: [
          'Main Activity and Sub-Activity column headers are now sortable (click to toggle ↑↓)',
          'Activity filter dropdown (8 main activities) in the Tasks filter bar',
          'Sub-Activity filter dropdown, dynamically populated based on selected Activity',
          'Both filters included in "Reset All" and active-filter visibility logic',
        ],
      },
    ],
    fixed: [],
    changed: [
      'LCR Reports page now shows only Status Breakdown by Tonnage — all other report cards removed',
      'LCR Status Breakdown card gets Project and Building filter dropdowns (building list dependent on project)',
      '/api/supply-chain/lcr/reports/status-breakdown now accepts buildingId in addition to projectId',
    ],
  },
};

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  let alreadySeen = false;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { customPermissions: true },
      });
      const perms = user?.customPermissions as Record<string, unknown> | null;
      if (perms?.lastSeenVersion === CURRENT_VERSION.version) {
        alreadySeen = true;
      }
    } catch {
      // Non-critical; fall back to client-side check
    }
  }

  return NextResponse.json({ ...CURRENT_VERSION, alreadySeen });
}
