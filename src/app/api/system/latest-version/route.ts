import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '👑 Executive Command Center',
  highlights: [
    'Executive Command Center (/executive) — single-screen real-time operational intelligence dashboard for CEO/CFO use with 60-second auto-refresh',
    'Five Command Metrics: Active Projects, Production Velocity, Collection Rate, Procurement Exposure, Open Risk Flags — each with color-coded RAG and 30-day trend',
    'Project Health Matrix — one row per active project across 5 dimensions (Engineering%, Production%, LCR overdue, Collections%, Risk count) with server-side RAG',
    'Decisions Required — prioritised action list covering approvals, payment triggers, urgent procurement, critical NCRs, and project overruns',
  ],
  changes: {
    added: [
      {
        title: 'Executive Command Center (/executive)',
        items: [
          'Full-width dark-theme dashboard with 60-second auto-refresh and visible countdown ring',
          'Five Command Metrics cards: Active Projects (buildings + contracted tonnes), Production Velocity (monthly tonnes vs target), Collection Rate (% + SAR pending), Procurement Exposure (overdue LCR count + value), Open Risk Flags (critical + warnings)',
          'Project Health Matrix: compact table with Engineering%, Production%, LCR overdue badge, Collections%, Risk count, and server-side computed RAG (Red/Amber/Green)',
          'Click any project row to open a slide-over panel with full breakdown and quick-links',
          'Cash Flow Snapshot: bar chart of this-month actuals + next-30-day projected collections and payables with net position indicator',
          'Production Pulse: 30-day production trend line chart by ISO week + top-3 projects this week',
          'Decisions Required: up to 20 prioritised action items — waiting approvals, payment triggers, LCR without PO, critical NCRs >7 days, project overruns <80% production',
          'Each section handles its own error state independently — data unavailable message without crashing the dashboard',
          'Every dashboard load logs a SystemEvent with category: EXECUTIVE_ACCESS, severity: INFO',
          'Mobile responsive: 2-col metric grid on mobile, project matrix horizontally scrollable',
        ],
      },
      'GET /api/executive/summary — five command metrics in one call',
      'GET /api/executive/project-health — project health matrix with server-side RAG computation',
      'GET /api/executive/decisions-required — prioritised action list, max 20 items',
      'GET /api/executive/cashflow-snapshot — monthly actuals + 30-day projections + weekly production trend',
      'executive.view permission added to NAVIGATION_PERMISSIONS; sidebar entry added (Crown icon)',
    ],
    fixed: [],
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
