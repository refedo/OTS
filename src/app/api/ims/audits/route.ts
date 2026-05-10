import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const CreateSchema = z.object({
  planId: z.string().uuid(),
  scope: z.string().min(1),
  scheduledDate: z.string().datetime(),
  clausesCovered: z.array(z.string()).optional(),
  auditorId: z.string().uuid().optional().nullable(),
  auditeeId: z.string().uuid().optional().nullable(),
  processArea: z.string().optional().nullable(),
  riskLevel: z.enum(['High', 'Medium', 'Low']).optional().nullable(),
  isoClausesInScope: z.array(z.string()).optional().nullable(),
  auditorIndependenceConfirmed: z.boolean().optional().default(false),
  approvedByImsManagerName: z.string().optional().nullable(),
  approvedByImsManagerDate: z.string().datetime().optional().nullable(),
  approvedByImsManagerSigned: z.boolean().optional().default(false),
  approvedByTopMgmtName: z.string().optional().nullable(),
  approvedByTopMgmtDate: z.string().datetime().optional().nullable(),
  approvedByTopMgmtSigned: z.boolean().optional().default(false),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function generateAuditNumber(year: number): Promise<string> {
  const yearShort = year % 100;
  const count = await prisma.imsAudit.count({
    where: {
      scheduledDate: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  return `AUD-${yearShort.toString().padStart(2, '0')}-${(count + 1).toString().padStart(3, '0')}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (planId) where.planId = planId;
    if (status) where.status = status;

    const audits = await prisma.imsAudit.findMany({
      where,
      include: {
        plan: { select: { planNumber: true, auditType: true } },
        auditor: { select: { id: true, name: true } },
        auditee: { select: { id: true, name: true } },
        _count: { select: { findings: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json(audits);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch audits');
    return NextResponse.json({ error: 'Failed to fetch audits' }, { status: 500 });
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
    const scheduledDate = new Date(data.scheduledDate);
    const auditNumber = await generateAuditNumber(scheduledDate.getFullYear());

    const audit = await prisma.imsAudit.create({
      data: {
        planId: data.planId,
        auditNumber,
        scope: data.scope,
        scheduledDate,
        clausesCovered: data.clausesCovered ?? [],
        auditorId: data.auditorId ?? null,
        auditeeId: data.auditeeId ?? null,
        status: 'SCHEDULED',
        createdById: session.sub,
        processArea: data.processArea ?? null,
        riskLevel: data.riskLevel ?? null,
        isoClausesInScope: data.isoClausesInScope ?? [],
        auditorIndependenceConfirmed: data.auditorIndependenceConfirmed ?? false,
        approvedByImsManagerName: data.approvedByImsManagerName ?? null,
        approvedByImsManagerDate: data.approvedByImsManagerDate ? new Date(data.approvedByImsManagerDate) : null,
        approvedByImsManagerSigned: data.approvedByImsManagerSigned ?? false,
        approvedByTopMgmtName: data.approvedByTopMgmtName ?? null,
        approvedByTopMgmtDate: data.approvedByTopMgmtDate ? new Date(data.approvedByTopMgmtDate) : null,
        approvedByTopMgmtSigned: data.approvedByTopMgmtSigned ?? false,
      },
      include: {
        auditor: { select: { id: true, name: true } },
        auditee: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_AUDIT_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsAudit',
      entityId: audit.id,
      entityName: audit.auditNumber,
      summary: `Audit ${audit.auditNumber} scheduled — scope: ${audit.scope}`,
      details: { auditNumber: audit.auditNumber, planId: data.planId },
    });

    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create audit');
    return NextResponse.json({ error: 'Failed to create audit' }, { status: 500 });
  }
}
