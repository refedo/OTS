import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '📡 System Events Framework',
  highlights: [
    'Enterprise-grade audit trail: every financial, backup, RBAC, PBAC, project, task, QC, and production action is now logged to a unified system events table',
    'System Events dashboard (/events) with auto-refresh, date presets, user filter, CSV export, and live event log',
    'System Health tab with 7-day event volume bar chart, top event types, and cron job registry',
    'Auto-repair: system_events table is now self-healing on first use — fixes the CamelCase/snake_case table name mismatch on Linux deployments',
  ],
  changes: {
    added: [
      {
        title: 'System Events Dashboard',
        items: [
          '/events page with live event log, auto-refresh (30s), date presets (Today / 7d / 30d), user filter, severity and category filters',
          'CSV export endpoint (GET /api/system-events/export) — Admin/Manager only, max 10,000 rows',
          'System Health tab: 7-day event volume BarChart, top 8 event types, cron job registry with event-cleanup entry',
          'EntityTimeline component integrated into Project and Task detail pages',
        ],
      },
      {
        title: 'Event Coverage — Financial',
        items: [
          'FIN_CONFIG_CHANGED, FIN_ACCOUNT_MAPPING_CHANGED, FIN_CHART_ACCOUNT_CREATED/UPDATED/DELETED',
          'FIN_CHART_ACCOUNTS_CLEARED (WARNING severity), FIN_CHART_SYNCED, FIN_PRODUCT_CATEGORY_CREATED',
          'FIN_PRODUCT_MAPPING_CHANGED, FIN_SUPPLIER_CLASSIFIED — all 12 financial write endpoints covered',
        ],
      },
      {
        title: 'Event Coverage — Backup, RBAC, PBAC',
        items: [
          'SYS_BACKUP_CREATED, SYS_BACKUP_FAILED, SYS_BACKUP_DELETED on all backup routes',
          'SYS_RESTORE_COMPLETED, SYS_RESTORE_FAILED as CRITICAL severity on restore route',
          'ROLE_DUPLICATED, PBAC_RESTRICTION_CHANGED, PERMISSION_CLONED',
        ],
      },
      {
        title: 'Retention & Performance',
        items: [
          'GET /api/cron/event-cleanup — archives events >90 days to system_event_summaries, deletes events >365 days',
          'GET /api/system-events/export — CSV export with 17 columns',
          'Composite indexes on (event_category, created_at) and (severity, created_at)',
          'system_event_summaries table for daily aggregate data',
        ],
      },
    ],
    fixed: [
      'system_events table auto-repair on first use: RENAME TABLE SystemEvent → system_events + ADD COLUMN IF NOT EXISTS for all missing columns (severity, eventCategory, summary, details, etc.) — fixes silent event write failures on Linux deployments',
      'Backup routes: session!.userId → session!.sub (userId was undefined, causing all backup events to be anonymous)',
      'RBAC/PBAC routes: replaced console.error with structured logger calls',
    ],
    changed: [],
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
