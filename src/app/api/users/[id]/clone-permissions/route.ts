import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

const cloneSchema = z.object({
  sourceUserId: z.string().uuid(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canEdit = await checkPermission('users.edit');
  if (!canEdit) {
    return NextResponse.json(
      { error: 'Forbidden - users.edit permission required' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = cloneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { sourceUserId } = parsed.data;
  const targetUserId = params.id;

  if (sourceUserId === targetUserId) {
    return NextResponse.json(
      { error: 'Source and target user cannot be the same' },
      { status: 400 }
    );
  }

  const sourceUser = await prisma.user.findUnique({
    where: { id: sourceUserId },
    select: { id: true, name: true, customPermissions: true },
  });

  if (!sourceUser) {
    return NextResponse.json({ error: 'Source user not found' }, { status: 404 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { customPermissions: sourceUser.customPermissions },
    include: { role: true, department: true },
  });

  logger.info(
    {
      sourceUserId,
      sourceUserName: sourceUser.name,
      targetUserId,
      targetUserName: targetUser.name,
      performedBy: session.sub,
    },
    '[PBAC] Cloned custom permissions from one user to another'
  );

  systemEventService.log({
    eventType: 'PERMISSION_CLONED',
    eventCategory: 'USER',
    severity: 'INFO',
    userId: session.sub,
    entityType: 'User',
    entityId: targetUserId,
    entityName: targetUser.name,
    summary: `Custom permissions cloned from ${sourceUser.name} to ${targetUser.name}`,
    details: { sourceUserId, sourceUserName: sourceUser.name, targetUserId, targetUserName: targetUser.name },
  }).catch((err: unknown) => logger.error({ err }, '[clone-permissions] Failed to log PERMISSION_CLONED'));

  return NextResponse.json({
    success: true,
    message: `Custom permissions cloned from ${sourceUser.name} to ${targetUser.name}`,
    user: updated,
  });
}
