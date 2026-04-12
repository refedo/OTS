/**
 * GET /api/hr/dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD
 *                      &occupation=...&section=...&departmentId=...
 *                      &groupBy=occupation|section|department|none
 *
 * Returns KPI aggregates for the HR dashboard. Delegates to
 * getHrDashboardStats() in src/lib/services/hr/hr-dashboard-stats.ts.
 *
 * Phase 2.5 of OTS-MSS-HR-PAYROLL-v1. Gated by `hr.employee.view`
 * (same permission that gates the employees list — anyone who can see
 * employees can see the aggregate metrics).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import {
  getHrDashboardStats,
  type HrDashboardGroupBy,
} from '@/lib/services/hr/hr-dashboard-stats';

const VALID_GROUP_BY: HrDashboardGroupBy[] = ['none', 'occupation', 'section', 'department'];

function parseDate(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return fallback;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const parsed = new Date(Date.UTC(y, mo - 1, d));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.employee.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);

  // Default window: current calendar month.
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const startDate = parseDate(url.searchParams.get('start'), defaultStart);
  const endDate = parseDate(url.searchParams.get('end'), defaultEnd);

  if (endDate.getTime() < startDate.getTime()) {
    return NextResponse.json(
      { error: 'end must be greater than or equal to start' },
      { status: 400 },
    );
  }

  const occupation = url.searchParams.get('occupation');
  const section = url.searchParams.get('section');
  const departmentId = url.searchParams.get('departmentId');
  const groupByRaw = url.searchParams.get('groupBy');
  const groupBy: HrDashboardGroupBy = VALID_GROUP_BY.includes(
    groupByRaw as HrDashboardGroupBy,
  )
    ? (groupByRaw as HrDashboardGroupBy)
    : 'occupation';

  try {
    const stats = await getHrDashboardStats({
      startDate,
      endDate,
      occupation: occupation || null,
      section: section || null,
      departmentId: departmentId || null,
      groupBy,
    });
    return NextResponse.json(stats);
  } catch (error) {
    logger.error({ error }, '[HR Dashboard] Failed to compute stats');
    return NextResponse.json(
      { error: 'Failed to compute HR dashboard stats' },
      { status: 500 },
    );
  }
}
