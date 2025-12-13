import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const projectId = searchParams.get('projectId');
    const scopeType = searchParams.get('scopeType');

    // Build where clause
    const whereClause: any = {};
    if (buildingId) {
      whereClause.buildingId = buildingId;
    }
    if (projectId) {
      whereClause.projectId = projectId;
    }
    if (scopeType) {
      whereClause.scopeType = scopeType;
    }

    const scopeSchedules = await prisma.scopeSchedule.findMany({
      where: whereClause,
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
            name: true,
            designation: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return NextResponse.json(scopeSchedules);
  } catch (error) {
    console.error('Error fetching scope schedules:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch scope schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
