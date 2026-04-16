import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'agent/events/recent' });

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-ots-agent-secret') === process.env.OTS_INTERNAL_API_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

    const events = await prisma.systemEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventType: true,
        eventCategory: true,
        severity: true,
        entityType: true,
        entityId: true,
        summary: true,
        createdAt: true,
        userId: true,
      },
    });

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
      count: events.length,
    });
  } catch (error) {
    log.error({ error }, 'Failed to fetch recent events');
    return NextResponse.json({ error: 'Failed to fetch recent events' }, { status: 500 });
  }
}
