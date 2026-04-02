import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { otsEmitter, type OTSEventMap } from '@/lib/events/ots-emitter';

const EVENTS: (keyof OTSEventMap)[] = [
  'audit:created',
  'work-order:created',
  'work-order:updated',
  'document:uploaded',
];

export const GET = withApiContext(async (): Promise<NextResponse<unknown>> => {
  const listeners = Object.fromEntries(
    EVENTS.map((event) => [event, otsEmitter.listenerCount(event)])
  );

  const totalListeners = Object.values(listeners).reduce((sum, n) => sum + n, 0);

  return NextResponse.json({
    active: true,
    totalListeners,
    maxListeners: otsEmitter.getMaxListeners(),
    listeners,
  });
});
