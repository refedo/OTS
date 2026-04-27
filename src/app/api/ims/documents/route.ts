import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

// Generate document number: "{category.code}-{YYYY}-{NNN:4}"
async function generateDocumentNumber(categoryId: string): Promise<string> {
  const category = await prisma.imsCategory.findUnique({
    where: { id: categoryId },
    select: { code: true },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const count = await prisma.imsDocument.count({
    where: {
      categoryId,
      createdAt: { gte: yearStart, lt: yearEnd },
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `${category.code}-${year}-${sequence}`;
}

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const site = searchParams.get('site');
    const search = searchParams.get('search');
    const overdue = searchParams.get('overdue');

    const where: Record<string, unknown> = { deletedAt: null };

    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (site) where.site = site;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { documentNumber: { contains: search } },
      ];
    }

    if (overdue === 'true') {
      where.nextReviewDate = { lt: new Date() };
      where.status = 'APPROVED';
    }

    const documents = await prisma.imsDocument.findMany({
      where,
      select: {
        id: true,
        documentNumber: true,
        title: true,
        titleAr: true,
        status: true,
        currentVersion: true,
        site: true,
        confidentiality: true,
        reviewFrequencyDays: true,
        lastReviewDate: true,
        nextReviewDate: true,
        fileUrl: true,
        issuedAt: true,
        applicableStandards: true,
        scope: true,
        purpose: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, code: true, name: true, nameAr: true },
        },
        department: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, name: true },
        },
        reviewer: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            revisions: true,
            distributions: true,
            changeRequests: true,
            clauseMappings: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    type DocRow = (typeof documents)[number];
    const now = new Date();
    const result = documents.map((doc: DocRow) => {
      let overdueDays: number | null = null;
      if (doc.nextReviewDate && doc.nextReviewDate < now && doc.status === 'APPROVED') {
        overdueDays = Math.floor(
          (now.getTime() - doc.nextReviewDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
      return { ...doc, overdueDays };
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS documents');
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      titleAr,
      categoryId,
      departmentId,
      ownerId,
      reviewerId,
      applicableStandards,
      scope,
      purpose,
      site,
      confidentiality,
      reviewFrequencyDays,
      fileUrl,
    } = body;

    if (!title || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields: title, categoryId' }, { status: 400 });
    }

    const documentNumber = await generateDocumentNumber(categoryId);

    const days = typeof reviewFrequencyDays === 'number' ? reviewFrequencyDays : 365;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + days);

    const document = await prisma.imsDocument.create({
      data: {
        documentNumber,
        title,
        titleAr: titleAr ?? null,
        categoryId,
        departmentId: departmentId ?? null,
        ownerId: ownerId ?? null,
        reviewerId: reviewerId ?? null,
        applicableStandards: applicableStandards ?? null,
        scope: scope ?? null,
        purpose: purpose ?? null,
        site: site ?? null,
        confidentiality: confidentiality ?? 'INTERNAL',
        reviewFrequencyDays: days,
        nextReviewDate,
        fileUrl: fileUrl ?? null,
        status: 'DRAFT',
        createdById: session.sub,
        updatedById: session.sub,
      },
      include: {
        category: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_CREATED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsDocument',
      entityId: document.id,
      entityName: document.documentNumber,
      summary: `IMS document ${document.documentNumber} created: ${document.title}`,
      details: { documentNumber: document.documentNumber, categoryId, status: 'DRAFT' },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS document');
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
