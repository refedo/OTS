/**
 * GET  /api/hr/reports/monthly          — list all generated reports
 * POST /api/hr/reports/monthly          — trigger generation for a specific month
 *
 * Permission: hr.reports.view (GET) / hr.reports.manage (POST)
 * v23.2.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';
import { env } from '@/lib/env';
import { z } from 'zod';

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

const log = logger.child({ module: 'api.hr.reports.monthly' });

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.reports.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const reports = await prisma.hrMonthlyReport.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: {
      id: true,
      year: true,
      month: true,
      status: true,
      newHires: true,
      resignations: true,
      terminations: true,
      headcountAtEnd: true,
      turnoverRate: true,
      burnoutScore: true,
      totalPayroll: true,
      leaveRequestsTotal: true,
      leaveRequestsApproved: true,
      iqamaExpiredCount: true,
      iqamaDueSoonCount: true,
      docRenewalsDueSoon: true,
      filePath: true,
      generatedAt: true,
      errorMessage: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json(reports);
}

const GenerateSchema = z.object({
  year:  z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function POST(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.reports.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { year, month } = parsed.data;

  log.info({ year, month, userId: session.sub }, '[HR Reports] Manual generation triggered');

  // Delegate to the cron endpoint (reuses the same logic)
  const cronSecret = env.CRON_SECRET;
  const baseUrl    = getBaseUrl();
  const basePath   = env.NEXT_PUBLIC_BASE_PATH || '';

  try {
    const res = await fetch(`${baseUrl}${basePath}/api/cron/hr-monthly-report`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ year, month }),
    });

    const result = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      return NextResponse.json({ error: result.error ?? 'Generation failed' }, { status: res.status });
    }
    return NextResponse.json(result);
  } catch (error) {
    log.error({ error }, '[HR Reports] Failed to call cron endpoint');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
