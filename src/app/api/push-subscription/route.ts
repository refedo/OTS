import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { PushService } from '@/lib/services/push.service';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const POST = withApiContext<unknown>(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid subscription', details: parsed.error.flatten() }, { status: 400 });
    }

    const { endpoint, keys } = parsed.data;
    const userAgent = req.headers.get('user-agent') || undefined;

    await PushService.saveSubscription({
      userId: session!.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    });

    logger.info({ userId: session!.userId }, 'Push subscription saved');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to save push subscription');
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
});

export const DELETE = withApiContext<unknown>(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    await PushService.removeSubscription(session!.userId, parsed.data.endpoint);

    logger.info({ userId: session!.userId }, 'Push subscription removed');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to remove push subscription');
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
});

export const GET = withApiContext<unknown>(async (_req, session) => {
  try {
    const count = await PushService.getSubscriptionCount(session!.userId);
    return NextResponse.json({ subscriptionCount: count });
  } catch (error) {
    logger.error({ error }, 'Failed to get subscription count');
    return NextResponse.json({ error: 'Failed to get subscription info' }, { status: 500 });
  }
});
