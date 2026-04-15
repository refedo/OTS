import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkAnyPermission, checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  subject: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  bannerEnabled: z.boolean().optional(),
  targetType: z.enum(['ALL', 'SPECIFIC']).optional(),
  targetUserIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkAnyPermission([
    'announcements.view',
    'announcements.create',
    'announcements.manage',
  ]);
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;

  try {
    const announcement = await prisma.announcement.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        targets: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { dismissals: true } },
      },
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json(announcement);
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch announcement');
    return NextResponse.json({ error: 'Failed to fetch announcement' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('announcements.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const { targetUserIds, targetType, ...rest } = parsed.data;
    const effectiveTargetType = targetType ?? existing.targetType;

    if (
      effectiveTargetType === 'SPECIFIC' &&
      targetUserIds !== undefined &&
      targetUserIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'targetUserIds required when targetType is SPECIFIC' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx: typeof prisma) => {
      if (targetType === 'SPECIFIC' && targetUserIds !== undefined) {
        await tx.announcementTarget.deleteMany({ where: { announcementId: id } });
        await tx.announcementTarget.createMany({
          data: targetUserIds.map((userId: string) => ({
            id: crypto.randomUUID(),
            announcementId: id,
            userId,
          })),
        });
      } else if (targetType === 'ALL') {
        await tx.announcementTarget.deleteMany({ where: { announcementId: id } });
      }

      return tx.announcement.update({
        where: { id },
        data: {
          ...rest,
          targetType: effectiveTargetType,
          startDate: rest.startDate ? new Date(rest.startDate) : undefined,
          endDate: rest.endDate ? new Date(rest.endDate) : undefined,
          updatedById: session.sub,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          targets: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });
    });

    logger.info({ announcementId: id }, 'Announcement updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update announcement');
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('announcements.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;

  try {
    const existing = await prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const deleteReason = typeof body.deleteReason === 'string' ? body.deleteReason : undefined;

    await prisma.announcement.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session.sub,
        deleteReason,
        isActive: false,
      },
    });

    logger.info({ announcementId: id }, 'Announcement soft-deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete announcement');
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
