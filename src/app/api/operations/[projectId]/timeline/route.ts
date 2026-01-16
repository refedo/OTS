import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

// GET /api/operations/:projectId/timeline - Get all events for a project
export async function GET(
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

    const { projectId } = params;
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');

    // Fetch events
    const events = await prisma.operationEvent.findMany({
      where: {
        projectId,
        ...(buildingId && { buildingId }),
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
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    // Fetch stage configurations
    const stageConfigs = await prisma.operationStageConfig.findMany({
      orderBy: {
        orderIndex: 'asc',
      },
    });

    // Build timeline with all stages
    const timeline = stageConfigs.map((stage) => {
      const event = events.find((e) => e.stage === stage.stageCode);
      return {
        stage: stage.stageCode,
        stageName: stage.stageName,
        orderIndex: stage.orderIndex,
        color: stage.color,
        icon: stage.icon,
        isMandatory: stage.isMandatory,
        description: stage.description,
        event: event || null,
      };
    });

    return NextResponse.json({
      timeline,
      events,
      stageConfigs,
    });
  } catch (error) {
    console.error('Error fetching operation timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operation timeline' },
      { status: 500 }
    );
  }
}
