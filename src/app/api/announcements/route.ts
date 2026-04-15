import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkAnyPermission, checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  subject: z.string().min(1).max(255),
  content: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  bannerEnabled: z.boolean().default(false),
  targetType: z.enum(['ALL', 'SPECIFIC']).default('ALL'),
  targetUserIds: z.array(z.string().uuid()).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

/** Generate serial number ANN-YY-NNN */
async function generateSerialNumber(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `ANN-${year}-`;

  const last = await prisma.announcement.findFirst({
    where: { serialNumber: { startsWith: prefix } },
    orderBy: { serialNumber: 'desc' },
    select: { serialNumber: true },
  });

  let nextNum = 1;
  if (last) {
    const parts = last.serialNumber.split('-');
    nextNum = parseInt(parts[2] ?? '0', 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkAnyPermission(['announcements.manage', 'announcements.create']);
  const canView = await checkAnyPermission(['announcements.view', 'announcements.create', 'announcements.manage']);

  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const skip = (page - 1) * limit;

    const now = new Date();
    const where = canManage
      ? { deletedAt: null as Date | null }
      : {
          deletedAt: null as Date | null,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            { targetType: 'ALL' as const },
            { targets: { some: { userId: session.sub } } },
          ],
        };

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          targets: { include: { user: { select: { id: true, name: true, email: true } } } },
          _count: { select: { dismissals: true } },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch announcements');
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canCreate = await checkAnyPermission(['announcements.create', 'announcements.manage']);
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subject, content, startDate, endDate, bannerEnabled, targetType, targetUserIds } =
      parsed.data;

    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json({ error: 'endDate must be after startDate' }, { status: 400 });
    }

    if (targetType === 'SPECIFIC' && (!targetUserIds || targetUserIds.length === 0)) {
      return NextResponse.json(
        { error: 'targetUserIds required when targetType is SPECIFIC' },
        { status: 400 }
      );
    }

    const serialNumber = await generateSerialNumber();

    const announcement = await prisma.announcement.create({
      data: {
        serialNumber,
        subject,
        content,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        bannerEnabled,
        targetType,
        isActive: true,
        createdById: session.sub,
        targets:
          targetType === 'SPECIFIC' && targetUserIds
            ? {
                create: targetUserIds.map((userId: string) => ({
                  id: crypto.randomUUID(),
                  userId,
                })),
              }
            : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        targets: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    logger.info({ announcementId: announcement.id, serialNumber }, 'Announcement created');
    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create announcement');
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
