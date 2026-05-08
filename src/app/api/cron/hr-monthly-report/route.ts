/**
 * POST /api/cron/hr-monthly-report
 *
 * Generates the HR Monthly Report for the previous calendar month.
 * Triggered by HrMonthlyReportScheduler on the 2nd of each month at 06:00 Riyadh time
 * (giving payroll a day to be finalised after month-end).
 *
 * Auth: Bearer <CRON_SECRET>
 * Optional body: { year?: number; month?: number }  — override for manual runs
 *
 * v23.2.0
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { buildMonthlyReportData } from '@/lib/services/hr/hr-monthly-report-service';
import { generateMonthlyReportPdf } from '@/lib/services/hr/hr-monthly-report-pdf';

const log = logger.child({ module: 'cron.hr-monthly-report' });

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Default: previous calendar month
  const now   = new Date();
  let year    = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  let month   = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();

  // Allow manual override via request body
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof body.year  === 'number' && body.year  > 2020) year  = body.year;
    if (typeof body.month === 'number' && body.month >= 1 && body.month <= 12) month = body.month;
  } catch { /* no body */ }

  log.info({ year, month }, '[HrMonthlyReport] Cron triggered');

  // Find the system user (first admin) to record as createdById
  const systemUser = await prisma.user.findFirst({
    where: { status: 'active' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!systemUser) {
    log.error({}, '[HrMonthlyReport] No active user found for createdById');
    return NextResponse.json({ error: 'No active user found' }, { status: 500 });
  }

  // Upsert a GENERATING record (idempotent — rerunning regenerates)
  let reportId: string;
  const existing = await prisma.hrMonthlyReport.findUnique({ where: { year_month: { year, month } } });

  if (existing) {
    reportId = existing.id;
    await prisma.hrMonthlyReport.update({
      where: { id: reportId },
      data: { status: 'GENERATING', errorMessage: null, filePath: null, generatedAt: null },
    });
  } else {
    const created = await prisma.hrMonthlyReport.create({
      data: { year, month, status: 'GENERATING', createdById: systemUser.id },
    });
    reportId = created.id;
  }

  try {
    // Build data
    const data = await buildMonthlyReportData(year, month);

    // Generate PDF
    const filePath = await generateMonthlyReportPdf(data);

    // Persist results
    await prisma.hrMonthlyReport.update({
      where: { id: reportId },
      data: {
        status:                'READY',
        filePath,
        generatedAt:           new Date(),
        reportData:            data as object,
        newHires:              data.headcount.newHires.length,
        resignations:          data.headcount.resignations.length,
        terminations:          data.headcount.terminations.length,
        headcountAtEnd:        data.headcount.atEnd,
        turnoverRate:          data.turnover.rate,
        burnoutScore:          data.burnout.score,
        totalPayroll:          data.payroll.totalGross,
        leaveRequestsTotal:    data.leave.totalRequests,
        leaveRequestsApproved: data.leave.approved,
        iqamaExpiredCount:     data.documents.iqamaExpired.length,
        iqamaDueSoonCount:     data.documents.iqamaDueSoon.length,
        docRenewalsDueSoon:    data.documents.workPermitsDueSoon.length
                             + data.documents.insuranceDueSoon.length
                             + data.documents.otherDueSoon.length,
      },
    });

    log.info({ reportId, year, month }, '[HrMonthlyReport] Generated successfully');
    return NextResponse.json({ ok: true, reportId, filePath });
  } catch (error) {
    log.error({ error, reportId }, '[HrMonthlyReport] Generation failed');

    await prisma.hrMonthlyReport.update({
      where: { id: reportId },
      data: {
        status:       'FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }
}
