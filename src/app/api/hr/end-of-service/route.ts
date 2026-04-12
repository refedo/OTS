/**
 * GET  /api/hr/end-of-service — list all EOS awards
 * POST /api/hr/end-of-service — calculate EOS for an employee
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { calculateEndOfService } from '@/lib/services/hr/end-of-service-calculator';

const calcSchema = z.object({
  employeeId: z.string().uuid(),
  serviceEndDate: z.string().min(1),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.eos.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await prisma.endOfServiceAward.findMany({
    include: {
      employee: { select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true } },
    },
    orderBy: { calculatedAt: 'desc' },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canCalc = await checkPermission('hr.eos.calculate');
  if (!canCalc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = calcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await calculateEndOfService({
      employeeId: parsed.data.employeeId,
      serviceEndDate: new Date(parsed.data.serviceEndDate),
      calculatedById: session.sub,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to calculate EOS';
    logger.error({ error }, '[EOS] Calc failed');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
