import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const buildingId = searchParams.get('buildingId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const whereClause: any = {};
    
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }
    
    if (buildingId && buildingId !== 'all') {
      whereClause.buildingId = buildingId;
    }

    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter.lte = new Date(dateTo);
    }
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    // RFI Statistics
    const totalRFIs = await prisma.rFIRequest.count({ where: whereClause });
    
    const pendingRFIs = await prisma.rFIRequest.count({
      where: { ...whereClause, status: 'Waiting for Inspection' },
    });
    
    const approvedRFIs = await prisma.rFIRequest.count({
      where: { ...whereClause, status: 'QC Checked' },
    });
    
    const rejectedRFIs = await prisma.rFIRequest.count({
      where: { ...whereClause, status: 'Rejected' },
    });

    // RFI by Inspection Type
    const rfisByType = await prisma.rFIRequest.groupBy({
      by: ['inspectionType'],
      where: whereClause,
      _count: true,
    });

    // NCR Statistics
    const totalNCRs = await prisma.nCRReport.count({ where: whereClause });
    
    const openNCRs = await prisma.nCRReport.count({
      where: { ...whereClause, status: 'Open' },
    });
    
    const inProgressNCRs = await prisma.nCRReport.count({
      where: { ...whereClause, status: 'In Progress' },
    });
    
    const closedNCRs = await prisma.nCRReport.count({
      where: { ...whereClause, status: 'Closed' },
    });
    
    const overdueNCRs = await prisma.nCRReport.count({
      where: { ...whereClause, status: 'Overdue' },
    });

    // NCR by Severity
    const ncrsBySeverity = await prisma.nCRReport.groupBy({
      by: ['severity'],
      where: whereClause,
      _count: true,
    });

    // Recent RFIs
    const recentRFIs = await prisma.rFIRequest.findMany({
      where: whereClause,
      take: 10,
      orderBy: { requestDate: 'desc' },
      include: {
        project: {
          select: { projectNumber: true, name: true },
        },
        productionLog: {
          include: {
            assemblyPart: {
              select: { partDesignation: true, name: true },
            },
          },
        },
        requestedBy: {
          select: { name: true },
        },
      },
    });

    // Recent NCRs
    const recentNCRs = await prisma.nCRReport.findMany({
      where: whereClause,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: { projectNumber: true, name: true },
        },
        productionLog: {
          include: {
            assemblyPart: {
              select: { partDesignation: true, name: true },
            },
          },
        },
        raisedBy: {
          select: { name: true },
        },
      },
    });

    // QC Performance Metrics
    const approvalRate = totalRFIs > 0 ? ((approvedRFIs / totalRFIs) * 100).toFixed(1) : '0';
    const rejectionRate = totalRFIs > 0 ? ((rejectedRFIs / totalRFIs) * 100).toFixed(1) : '0';
    const ncrClosureRate = totalNCRs > 0 ? ((closedNCRs / totalNCRs) * 100).toFixed(1) : '0';

    return NextResponse.json({
      rfi: {
        total: totalRFIs,
        pending: pendingRFIs,
        approved: approvedRFIs,
        rejected: rejectedRFIs,
        byType: rfisByType,
        recent: recentRFIs,
      },
      ncr: {
        total: totalNCRs,
        open: openNCRs,
        inProgress: inProgressNCRs,
        closed: closedNCRs,
        overdue: overdueNCRs,
        bySeverity: ncrsBySeverity,
        recent: recentNCRs,
      },
      metrics: {
        approvalRate: parseFloat(approvalRate),
        rejectionRate: parseFloat(rejectionRate),
        ncrClosureRate: parseFloat(ncrClosureRate),
      },
    });
  } catch (error) {
    console.error('Error fetching QC dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
