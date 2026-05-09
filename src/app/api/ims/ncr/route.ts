import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { systemEventService } from '@/services/system-events.service';

const CreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['System', 'Process', 'Service', 'Safety', 'Environmental']).default('System'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  deadline: z.string().datetime(),
  assignedToId: z.string().uuid().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  preventiveAction: z.string().optional().nullable(),
  auditFindingId: z.string().uuid().optional().nullable(),
  auditId: z.string().uuid().optional().nullable(),
  auditNumber: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function generateNcrNumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = await prisma.imsNcr.count();
  const seq = (count + 1).toString().padStart(3, '0');
  return `QA-NCR-${yy}${mm}-${seq}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const auditId = searchParams.get('auditId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (auditId) where.auditId = auditId;

    const ncrs = await prisma.imsNcr.findMany({
      where,
      include: {
        raisedBy:    { select: { id: true, name: true, email: true } },
        assignedTo:  { select: { id: true, name: true, email: true } },
        closedBy:    { select: { id: true, name: true, email: true } },
        caResponsible: { select: { id: true, name: true } },
        auditFinding: { select: { id: true, findingNumber: true, type: true, clause: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(ncrs);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS NCRs');
    return NextResponse.json({ error: 'Failed to fetch NCRs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const ncrNumber = await generateNcrNumber();

    const ncr = await prisma.imsNcr.create({
      data: {
        ncrNumber,
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity,
        deadline: new Date(data.deadline),
        raisedById: session.sub,
        assignedToId: data.assignedToId ?? null,
        rootCause: data.rootCause ?? null,
        correctiveAction: data.correctiveAction ?? null,
        preventiveAction: data.preventiveAction ?? null,
        auditFindingId: data.auditFindingId ?? null,
        auditId: data.auditId ?? null,
        auditNumber: data.auditNumber ?? null,
        department: data.department ?? null,
        status: 'OPEN',
      },
      include: {
        raisedBy:   { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_NCR_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsNcr',
      entityId: ncr.id,
      entityName: ncr.ncrNumber,
      summary: `QA NCR ${ncr.ncrNumber} created — ${ncr.title}`,
      details: { ncrNumber: ncr.ncrNumber, severity: ncr.severity, category: ncr.category },
    });

    return NextResponse.json(ncr, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS NCR');
    return NextResponse.json({ error: 'Failed to create NCR' }, { status: 500 });
  }
}
