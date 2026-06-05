/**
 * GET /api/hr/absence-alerts — list persisted unauthorized-absence alerts (OTS-BL-080).
 *
 * Optional filters: ?status= ?windowType= ?severity= ?kind= ?q= (employee name/employmentId)
 * Pagination: ?page= ?pageSize=  (sorting is done client-side, paginated-list pattern).
 * Gated by hr.analytics.view.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

const querySchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'LETTER_LINKED', 'RESOLVED', 'DISMISSED']).optional(),
  windowType: z.enum(['CONSECUTIVE', 'INTERMITTENT']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  kind: z.enum(['PRE_THRESHOLD', 'THRESHOLD']).optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});

const ALERT_INCLUDE = {
  employee: { select: { id: true, fullNameEn: true, fullNameAr: true, employmentId: true, occupation: true, section: true } },
  linkedLetter: { select: { id: true, letterNumber: true, letterType: true, status: true } },
} satisfies Prisma.EmployeeAbsenceAlertInclude;

export const GET = withApiContext(async (req: NextRequest) => {
  if (!(await checkPermission('hr.analytics.view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }
  const { status, windowType, severity, kind, q, page, pageSize } = parsed.data;

  const where: Prisma.EmployeeAbsenceAlertWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(windowType ? { windowType } : {}),
    ...(severity ? { severity } : {}),
    ...(kind ? { kind } : {}),
    ...(q
      ? {
          employee: {
            OR: [
              { fullNameEn: { contains: q } },
              { fullNameAr: { contains: q } },
              { employmentId: { contains: q } },
            ],
          },
        }
      : {}),
  };

  try {
    const [total, alerts, openCount, highCount, letterLinkedCount, flaggedEmployees] = await Promise.all([
      prisma.employeeAbsenceAlert.count({ where }),
      prisma.employeeAbsenceAlert.findMany({
        where,
        include: ALERT_INCLUDE,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.employeeAbsenceAlert.count({ where: { deletedAt: null, status: 'OPEN' } }),
      prisma.employeeAbsenceAlert.count({ where: { deletedAt: null, severity: 'HIGH', status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
      prisma.employeeAbsenceAlert.count({ where: { deletedAt: null, status: 'LETTER_LINKED' } }),
      prisma.employeeAbsenceAlert
        .findMany({ where: { deletedAt: null, status: { in: ['OPEN', 'ACKNOWLEDGED'] } }, select: { employeeId: true }, distinct: ['employeeId'] })
        .then((rows) => rows.length),
    ]);

    return NextResponse.json({
      alerts,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      kpis: { open: openCount, high: highCount, letterLinked: letterLinkedCount, flaggedEmployees },
    });
  } catch (error) {
    logger.error({ error }, '[Absence Alerts] Failed to list alerts');
    return NextResponse.json({ error: 'Failed to list absence alerts' }, { status: 500 });
  }
});
