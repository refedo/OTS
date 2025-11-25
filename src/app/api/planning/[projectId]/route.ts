import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// GET /api/planning/[projectId] - Get all phases for a project
export async function GET(
  request: Request,
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

    const plans = await prisma.projectPlan.findMany({
      where: { projectId },
      include: {
        project: {
          select: {
            projectNumber: true,
            name: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching project plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project plans' },
      { status: 500 }
    );
  }
}
