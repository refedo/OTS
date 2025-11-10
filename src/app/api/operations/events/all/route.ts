import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/operations/events/all - Get all events across all projects
export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await prisma.operationEvent.findMany({
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        building: {
          select: {
            id: true,
            designation: true,
            name: true,
          },
        },
        stageConfig: {
          select: {
            stageCode: true,
            stageName: true,
            orderIndex: true,
          },
        },
      },
      orderBy: {
        eventDate: 'desc',
      },
      take: 100, // Limit to last 100 events
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching all events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
