import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'agent/hr/flags' });

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-ots-agent-secret') === process.env.OTS_INTERNAL_API_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const otHours = parseInt(searchParams.get('otApprovalHours') ?? '24', 10);
    const otCutoff = new Date(Date.now() - otHours * 60 * 60 * 1000);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pendingLeaves, unreconciled] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: {
          deletedAt: null,
          status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_CEO'] },
          createdAt: { lt: otCutoff },
        },
        select: {
          id: true,
          leaveType: { select: { nameEn: true } },
          startDate: true,
          endDate: true,
          createdAt: true,
          employee: { select: { id: true, fullNameEn: true, fullNameAr: true } },
        },
        take: 50,
      }),

      prisma.manpowerInvoiceDraft.findMany({
        where: {
          status: 'DRAFT',
          periodStart: { gte: monthStart },
        },
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
          totalHours: true,
          agency: { select: { id: true, nameEn: true } },
        },
        take: 20,
      }),
    ]);

    const otPending = pendingLeaves.map((l) => ({
      id: l.id,
      leaveType: l.leaveType.nameEn,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      createdAt: l.createdAt.toISOString(),
      hoursWaiting: Math.floor((now.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60)),
      employee: { id: l.employee.id, name: l.employee.fullNameEn ?? l.employee.fullNameAr },
    }));

    const agencyUnreconciled = unreconciled.map((d) => ({
      id: d.id,
      agencyId: d.agency.id,
      agencyName: d.agency.nameEn,
      periodStart: d.periodStart.toISOString(),
      totalHours: d.totalHours,
    }));

    return NextResponse.json({
      otPending,
      agencyUnreconciled,
      headcountGaps: [],
      counts: {
        otPending: otPending.length,
        agencyUnreconciled: agencyUnreconciled.length,
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to fetch HR flags');
    return NextResponse.json({ error: 'Failed to fetch HR flags' }, { status: 500 });
  }
}
