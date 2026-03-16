import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationType } from '@prisma/client';

const ALL_TYPES = Object.values(NotificationType) as string[];

const updateSchema = z.object({
  preferences: z.array(
    z.object({
      notificationType: z.enum(ALL_TYPES as [string, ...string[]]),
      pushEnabled: z.boolean(),
      inAppEnabled: z.boolean(),
    })
  ),
});

export const GET = withApiContext<unknown>(async (_req, session) => {
  try {
    const preferences = await prisma.userNotificationPreference.findMany({
      where: { userId: session!.userId },
    });

    const prefsMap = new Map(preferences.map((p) => [p.notificationType, p]));
    const allPreferences = ALL_TYPES.map((type) => {
      const existing = prefsMap.get(type as NotificationType);
      return {
        notificationType: type,
        pushEnabled: existing?.pushEnabled ?? true,
        inAppEnabled: existing?.inAppEnabled ?? true,
      };
    });

    return NextResponse.json({ preferences: allPreferences });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch notification preferences');
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
});

export const PUT = withApiContext<unknown>(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { preferences } = parsed.data;

    await prisma.$transaction(
      preferences.map((pref) =>
        prisma.userNotificationPreference.upsert({
          where: {
            userId_notificationType: {
              userId: session!.userId,
              notificationType: pref.notificationType as NotificationType,
            },
          },
          update: {
            pushEnabled: pref.pushEnabled,
            inAppEnabled: pref.inAppEnabled,
          },
          create: {
            userId: session!.userId,
            notificationType: pref.notificationType as NotificationType,
            pushEnabled: pref.pushEnabled,
            inAppEnabled: pref.inAppEnabled,
          },
        })
      )
    );

    logger.info({ userId: session!.userId }, 'Notification preferences updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to update notification preferences');
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
});
