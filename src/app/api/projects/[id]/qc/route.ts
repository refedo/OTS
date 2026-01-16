import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:projectId/qc
 * Returns QC progress including total inspections, completion status, and timeline
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

    // Fetch all inspection types for the project
    const [materialInspections, weldingInspections, dimensionalInspections, ndtInspections] = await Promise.all([
      prisma.materialInspection.findMany({
        where: { projectId },
        select: {
          id: true,
          result: true,
          inspectionDate: true,
        },
      }),
      prisma.weldingInspection.findMany({
        where: { projectId },
        select: {
          id: true,
          result: true,
          inspectionDate: true,
        },
      }),
      prisma.dimensionalInspection.findMany({
        where: { projectId },
        select: {
          id: true,
          result: true,
          inspectionDate: true,
        },
      }),
      prisma.nDTInspection.findMany({
        where: { projectId },
        select: {
          id: true,
          result: true,
          inspectionDate: true,
        },
      }),
    ]);

    // Combine all inspections
    const allInspections = [
      ...materialInspections.map(i => ({ ...i, type: 'Material' })),
      ...weldingInspections.map(i => ({ ...i, type: 'Welding' })),
      ...dimensionalInspections.map(i => ({ ...i, type: 'Dimensional' })),
      ...ndtInspections.map(i => ({ ...i, type: 'NDT' })),
    ];

    // Calculate statistics
    const totalInspections = allInspections.length;
    const completedInspections = allInspections.filter(
      i => i.result === 'Accepted' || i.result === 'Pass'
    ).length;
    const rejectedInspections = allInspections.filter(
      i => i.result === 'Rejected' || i.result === 'Fail'
    ).length;
    const pendingInspections = allInspections.filter(
      i => i.result === 'Pending' || i.result === 'Hold'
    ).length;

    const progressPercentage = totalInspections > 0 
      ? (completedInspections / totalInspections) * 100 
      : 0;

    // Build timeline (group by date)
    const timelineMap = new Map<string, number>();
    allInspections.forEach(inspection => {
      const dateKey = new Date(inspection.inspectionDate).toISOString().split('T')[0];
      timelineMap.set(dateKey, (timelineMap.get(dateKey) || 0) + 1);
    });

    const timeline = Array.from(timelineMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30) // Last 30 days
      .map(([date, inspections]) => ({
        date,
        inspections,
      }));

    // Build by type statistics
    const byTypeMap = new Map<string, { total: number; completed: number; rejected: number }>();
    
    allInspections.forEach(inspection => {
      const current = byTypeMap.get(inspection.type) || { total: 0, completed: 0, rejected: 0 };
      current.total++;
      if (inspection.result === 'Accepted' || inspection.result === 'Pass') {
        current.completed++;
      } else if (inspection.result === 'Rejected' || inspection.result === 'Fail') {
        current.rejected++;
      }
      byTypeMap.set(inspection.type, current);
    });

    const byType = Array.from(byTypeMap.entries()).map(([type, stats]) => ({
      type,
      ...stats,
    }));

    return NextResponse.json({
      totalInspections,
      completedInspections,
      rejectedInspections,
      pendingInspections,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      timeline,
      byType,
    });
  } catch (error) {
    console.error('Error fetching QC data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QC data' },
      { status: 500 }
    );
  }
}
