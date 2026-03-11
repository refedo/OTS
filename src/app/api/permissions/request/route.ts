import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const requestSchema = z.object({
  modulePath: z.string().min(1),
  moduleName: z.string().min(1),
  message: z.string().max(500).optional(),
});

export const POST = withApiContext(async (req, session) => {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { modulePath, moduleName, message } = parsed.data;

  // Find all admin users to notify
  const admins = await prisma.user.findMany({
    where: {
      OR: [
        { isAdmin: true },
        { role: { name: 'Admin' } },
      ],
      status: 'active',
      deletedAt: null,
    },
    select: { id: true },
  });

  if (admins.length === 0) {
    logger.warn({ userId: session!.userId }, 'No admin users found for permission request notification');
    return NextResponse.json(
      { error: 'No administrators available to process your request' },
      { status: 500 }
    );
  }

  const userMessage = message
    ? `\n\nMessage: "${message}"`
    : '';

  // Create a notification for each admin
  await prisma.notification.createMany({
    data: admins.map((admin: { id: string }) => ({
      userId: admin.id,
      type: 'APPROVAL_REQUIRED' as const,
      title: `Module Access Request: ${moduleName}`,
      message: `${session!.name} (${session!.role}) is requesting access to the "${moduleName}" module (${modulePath}).${userMessage}`,
      relatedEntityType: 'permission_request',
      metadata: {
        requestingUserId: session!.userId,
        requestingUserName: session!.name,
        requestingUserRole: session!.role,
        modulePath,
        moduleName,
        userMessage: message || null,
      },
    })),
  });

  logger.info(
    {
      userId: session!.userId,
      modulePath,
      moduleName,
      adminCount: admins.length,
    },
    'Permission access request sent to admins'
  );

  return NextResponse.json({ success: true });
});
