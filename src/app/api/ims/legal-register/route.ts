import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const CreateSchema = z.object({
  referenceNumber: z.string().min(1),
  title: z.string().min(1),
  standard: z.string().min(1),
  isoStandard: z.string().min(1),
  category: z.string().min(1),
  applicableTo: z.string().min(1),
  complianceStatus: z.string().min(1),
  reviewFrequency: z.string().min(1),
  lastReviewedAt: z.string().datetime().optional().nullable(),
  nextReviewDue: z.string().datetime().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  evidenceInOts: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const isoStandard = searchParams.get('isoStandard');
    const complianceStatus = searchParams.get('complianceStatus');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { deletedAt: null };
    if (isoStandard && isoStandard !== 'All') where.isoStandard = isoStandard;
    if (complianceStatus) where.complianceStatus = complianceStatus;
    if (category) where.category = category;
    if (search) where.title = { contains: search };

    const records = await prisma.imsLegalRegister.findMany({
      where,
      select: {
        id: true,
        referenceNumber: true,
        title: true,
        standard: true,
        isoStandard: true,
        category: true,
        applicableTo: true,
        complianceStatus: true,
        lastReviewedAt: true,
        nextReviewDue: true,
        reviewFrequency: true,
        evidenceInOts: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        responsible: { select: { id: true, name: true } },
      },
      orderBy: [{ complianceStatus: 'asc' }, { nextReviewDue: 'asc' }],
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch legal register');
    return NextResponse.json({ error: 'Failed to fetch legal register' }, { status: 500 });
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
    const record = await prisma.imsLegalRegister.create({
      data: {
        referenceNumber: data.referenceNumber,
        title: data.title,
        standard: data.standard,
        isoStandard: data.isoStandard,
        category: data.category,
        applicableTo: data.applicableTo,
        complianceStatus: data.complianceStatus,
        reviewFrequency: data.reviewFrequency,
        lastReviewedAt: data.lastReviewedAt ? new Date(data.lastReviewedAt) : null,
        nextReviewDue: data.nextReviewDue ? new Date(data.nextReviewDue) : null,
        responsibleId: data.responsibleId ?? null,
        notes: data.notes ?? null,
        evidenceInOts: data.evidenceInOts ?? null,
        createdById: session.sub,
        updatedById: session.sub,
      },
    });

    systemEventService.log({
      eventType: 'IMS_LEGAL_REGISTER_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsLegalRegister',
      entityId: record.id,
      entityName: record.referenceNumber,
      summary: `Legal register entry ${record.referenceNumber} created: ${record.title}`,
      details: { referenceNumber: record.referenceNumber, isoStandard: record.isoStandard },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create legal register entry');
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
