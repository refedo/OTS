import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:projectId/wps
 * Returns all WPS (Welding Procedure Specifications) for a project with approval status
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

    // Fetch all WPS for the project
    const wpsList = await prisma.wPS.findMany({
      where: { projectId },
      include: {
        preparedBy: {
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
      },
      orderBy: {
        wpsNumber: 'asc',
      },
    });

    // Calculate statistics
    const total = wpsList.length;
    const approved = wpsList.filter(wps => wps.status === 'Approved').length;
    const pending = wpsList.filter(wps => wps.status === 'Draft').length;
    const rejected = wpsList.filter(wps => wps.status === 'Superseded').length;

    // Map to response format
    const wps = wpsList.map(item => ({
      id: item.id,
      wpsNumber: item.wpsNumber,
      revision: item.revision,
      weldingProcess: item.weldingProcess,
      status: item.status as 'Draft' | 'Approved' | 'Superseded',
      dateIssued: item.dateIssued,
      preparedBy: {
        id: item.preparedBy.id,
        name: item.preparedBy.name,
      },
      approvedBy: item.approvedBy ? {
        id: item.approvedBy.id,
        name: item.approvedBy.name,
      } : null,
    }));

    return NextResponse.json({
      total,
      approved,
      pending,
      rejected,
      wps,
    });
  } catch (error) {
    console.error('Error fetching WPS data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WPS data' },
      { status: 500 }
    );
  }
}
