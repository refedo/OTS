import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const CreateSchema = z.object({
  auditId: z.string().uuid(),
  type: z.enum(['NC', 'OFI', 'Observation']),
  clause: z.string().optional().nullable(),
  description: z.string().min(1),
  evidence: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function generateFindingNumber(auditId: string): Promise<string> {
  const audit = await prisma.imsAudit.findUnique({ where: { id: auditId }, select: { auditNumber: true } });
  if (!audit) throw new Error('Audit not found');
  const count = await prisma.imsAuditFinding.count({ where: { auditId } });
  return `${audit.auditNumber}-F${(count + 1).toString().padStart(2, '0')}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const auditId = searchParams.get('auditId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {};
    if (auditId) where.auditId = auditId;
    if (status) where.status = status;
    if (type) where.type = type;

    const findings = await prisma.imsAuditFinding.findMany({
      where,
      include: {
        audit: { select: { auditNumber: true, scope: true } },
        responsible: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { targetDate: 'asc' }],
    });

    return NextResponse.json(findings);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch audit findings');
    return NextResponse.json({ error: 'Failed to fetch findings' }, { status: 500 });
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
    const findingNumber = await generateFindingNumber(data.auditId);

    const finding = await prisma.imsAuditFinding.create({
      data: {
        auditId: data.auditId,
        findingNumber,
        type: data.type,
        clause: data.clause ?? 'N/A',
        description: data.description,
        evidence: data.evidence ?? null,
        correctiveAction: data.correctiveAction ?? null,
        responsibleId: data.responsibleId ?? null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        status: 'OPEN',
      },
      include: {
        responsible: { select: { id: true, name: true } },
        audit: { select: { id: true, auditNumber: true, scope: true } },
      },
    });

    // Auto-create IMS NCR (QA NCR) when the finding type is NC
    if (data.type === 'NC') {
      try {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const ncrCount = await prisma.imsNcr.count();
        const ncrNumber = `QA-NCR-${yy}${mm}-${(ncrCount + 1).toString().padStart(3, '0')}`;
        const deadline = data.targetDate ? new Date(data.targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.imsNcr.create({
          data: {
            ncrNumber,
            auditFindingId: finding.id,
            auditId: data.auditId,
            auditNumber: finding.audit?.auditNumber ?? null,
            department: finding.audit?.scope ?? null,
            title: `NC Finding: ${data.description.slice(0, 100)}`,
            description: data.description,
            category: 'System',
            severity: 'Medium',
            status: 'OPEN',
            correctiveAction: data.correctiveAction ?? null,
            deadline,
            raisedById: session.sub,
            assignedToId: data.responsibleId ?? null,
          },
        });
      } catch (ncrError) {
        logger.error({ error: ncrError }, 'Failed to auto-create ImsNcr for NC finding');
      }
    }

    systemEventService.log({
      eventType: 'IMS_AUDIT_FINDING_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsAuditFinding',
      entityId: finding.id,
      entityName: finding.findingNumber,
      summary: `Audit finding ${finding.findingNumber} created — type: ${finding.type}`,
      details: { findingNumber: finding.findingNumber, type: finding.type, clause: finding.clause },
    });

    return NextResponse.json(finding, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create audit finding');
    return NextResponse.json({ error: 'Failed to create finding' }, { status: 500 });
  }
}
