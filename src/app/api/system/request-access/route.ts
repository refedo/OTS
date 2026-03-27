import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import NotificationService from '@/lib/services/notification.service';
import { logger } from '@/lib/logger';

const schema = z.object({
  fromPath: z.string().max(200).optional(),
  message: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { fromPath, message } = parsed.data;
  const pageLabel = fromPath ? ` (${fromPath})` : '';
  const extraNote = message ? ` — "${message}"` : '';

  try {
    // Find all Admin users
    const admins = await prisma.user.findMany({
      where: { isAdmin: true, deletedAt: null },
      select: { id: true },
    });

    if (admins.length === 0) {
      return NextResponse.json({ error: 'No admin users found' }, { status: 500 });
    }

    await Promise.all(
      admins.map((admin) =>
        NotificationService.createNotification({
          userId: admin.id,
          type: 'TASK_ASSIGNED',
          title: 'Access Request',
          message: `${session.name} is requesting access to${pageLabel}${extraNote}`,
          relatedEntityType: 'user',
          relatedEntityId: session.sub,
          metadata: { requestedBy: session.name, fromPath, message },
        }),
      ),
    );

    logger.info({ userId: session.sub, fromPath }, 'Access request sent to admins');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, userId: session.sub }, 'Failed to send access request');
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
}
