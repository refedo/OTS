import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const CreateSchema = z.object({
  reviewDate: z.string().datetime(),
  chairperson: z.string().min(1),
  period: z.string().min(1),
  attendees: z.array(z.object({
    name: z.string(), role: z.string(), present: z.boolean(),
  })).optional(),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function generateReviewNumber(): Promise<string> {
  const year = new Date().getFullYear() % 100;
  const count = await prisma.imsManagementReview.count({
    where: { createdAt: { gte: new Date(`20${year}-01-01`), lt: new Date(`20${year + 1}-01-01`) } },
  });
  return `MR-${year.toString().padStart(2, '0')}-${(count + 1).toString().padStart(3, '0')}`;
}

export async function GET(_req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reviews = await prisma.imsManagementReview.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        reviewNumber: true,
        reviewDate: true,
        chairperson: true,
        status: true,
        period: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { reviewDate: 'desc' },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch management reviews');
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
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
    const reviewNumber = await generateReviewNumber();

    const review = await prisma.imsManagementReview.create({
      data: {
        reviewNumber,
        reviewDate: new Date(data.reviewDate),
        chairperson: data.chairperson,
        period: data.period,
        status: 'DRAFT',
        attendees: data.attendees ?? [],
        notes: data.notes ?? null,
        createdById: session.sub,
      },
    });

    systemEventService.log({
      eventType: 'IMS_MANAGEMENT_REVIEW_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsManagementReview',
      entityId: review.id,
      entityName: review.reviewNumber,
      summary: `Management review ${review.reviewNumber} created for period ${review.period}`,
      details: { reviewNumber: review.reviewNumber, period: review.period },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create management review');
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
