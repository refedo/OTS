import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const CreateSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  auditType: z.enum(['Internal', 'External', 'Surveillance']),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function generatePlanNumber(year: number): Promise<string> {
  const yearShort = year % 100;
  const count = await prisma.imsAuditPlan.count({ where: { year } });
  return `AP-${yearShort.toString().padStart(2, '0')}-${(count + 1).toString().padStart(3, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const where = year && !isNaN(year) ? { year } : {};

    const plans = await prisma.imsAuditPlan.findMany({
      where,
      select: {
        id: true,
        planNumber: true,
        year: true,
        auditType: true,
        status: true,
        createdAt: true,
        _count: { select: { audits: true } },
      },
      orderBy: [{ year: 'desc' }, { planNumber: 'asc' }],
    });

    return NextResponse.json(plans);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch audit plans');
    return NextResponse.json({ error: 'Failed to fetch audit plans' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const planNumber = await generatePlanNumber(data.year);

    const plan = await prisma.imsAuditPlan.create({
      data: {
        planNumber,
        year: data.year,
        auditType: data.auditType,
        status: data.status ?? 'PLANNED',
        createdById: session.sub,
      },
    });

    systemEventService.log({
      eventType: 'IMS_AUDIT_PLAN_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsAuditPlan',
      entityId: plan.id,
      entityName: plan.planNumber,
      summary: `Audit plan ${plan.planNumber} created for ${plan.year}`,
      details: { planNumber: plan.planNumber, year: plan.year, auditType: plan.auditType },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create audit plan');
    return NextResponse.json({ error: 'Failed to create audit plan' }, { status: 500 });
  }
}
