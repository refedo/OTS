import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

// POST /api/operations/:projectId/event - Manually add an event
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (Admin or Project Manager only)
    const userRole = session.role;
    if (userRole !== 'Admin' && userRole !== 'Project Manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Admin and Project Manager can add manual events.' },
        { status: 403 }
      );
    }

    const { projectId } = params;
    const body = await req.json();
    const { buildingId, stage, eventDate, description, status } = body;

    // Validate required fields
    if (!stage || !eventDate) {
      return NextResponse.json(
        { error: 'Stage and eventDate are required' },
        { status: 400 }
      );
    }

    // Check if stage exists in config
    const stageConfig = await prisma.operationStageConfig.findUnique({
      where: { stageCode: stage },
    });

    if (!stageConfig) {
      return NextResponse.json(
        { error: 'Invalid stage code' },
        { status: 400 }
      );
    }

    // Check if event already exists for this stage
    const existingEvent = await prisma.operationEvent.findFirst({
      where: {
        projectId,
        buildingId: buildingId || null,
        stage,
      },
    });

    if (existingEvent) {
      return NextResponse.json(
        { error: 'Event already exists for this stage. Use PATCH to update it.' },
        { status: 409 }
      );
    }

    // Create the event
    const event = await prisma.operationEvent.create({
      data: {
        projectId,
        buildingId: buildingId || null,
        stage,
        eventDate: new Date(eventDate),
        description,
        status: status || 'Completed',
        eventSource: 'manual',
        createdBy: session.userId,
      },
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
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('Error creating operation event:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    return NextResponse.json(
      { error: 'Failed to create operation event', details: error.message },
      { status: 500 }
    );
  }
}
