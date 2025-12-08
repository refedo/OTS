import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:projectId/itp
 * Returns all ITP (Inspection & Test Plans) for a project with completion status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all ITPs for the project
    const itpList = await prisma.iTP.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        activities: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        itpNumber: 'asc',
      },
    });

    // Calculate statistics
    const total = itpList.length;
    const approved = itpList.filter(itp => itp.status === 'Approved').length;
    const pending = itpList.filter(itp => itp.status === 'Draft' || itp.status === 'Under Review').length;
    const rejected = itpList.filter(itp => itp.status === 'Rejected').length;
    
    // Check for overdue ITPs (in Draft for more than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const overdue = itpList.filter(
      itp => itp.status === 'Draft' && itp.dateCreated < thirtyDaysAgo
    ).length;

    // Map to response format
    const itps = itpList.map(item => {
      const totalActivities = item.activities.length;
      const completedActivities = item.activities.filter(
        activity => activity.status === 'Completed'
      ).length;

      return {
        id: item.id,
        itpNumber: item.itpNumber,
        revision: item.revision,
        type: item.type,
        status: item.status as 'Draft' | 'Under Review' | 'Approved' | 'Rejected',
        dateCreated: item.dateCreated,
        dateApproved: item.dateApproved,
        createdBy: {
          id: item.createdBy.id,
          name: item.createdBy.name,
        },
        approvedBy: item.approvedBy ? {
          id: item.approvedBy.id,
          name: item.approvedBy.name,
        } : null,
        totalActivities,
        completedActivities,
      };
    });

    return NextResponse.json({
      total,
      approved,
      pending,
      rejected,
      overdue,
      itps,
    });
  } catch (error) {
    console.error('Error fetching ITP data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ITP data' },
      { status: 500 }
    );
  }
}
