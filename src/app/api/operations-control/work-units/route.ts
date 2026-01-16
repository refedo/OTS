/**
 * Work Units API Route
 * 
 * GET /api/operations-control/work-units - Get all work units with details
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Build where clause
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (type) where.type = type;

    // Get all work units with related data
    const workUnits = await prisma.workUnit.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        dependenciesFrom: {
          include: {
            toWorkUnit: {
              select: {
                id: true,
                referenceModule: true,
                referenceId: true,
                status: true,
              },
            },
          },
        },
        dependenciesTo: {
          include: {
            fromWorkUnit: {
              select: {
                id: true,
                referenceModule: true,
                referenceId: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { plannedEnd: 'asc' },
      ],
    });

    // Fetch reference names for each work unit
    const enrichedWorkUnits = await Promise.all(
      workUnits.map(async (wu) => {
        let referenceName: string | null = null;
        let referenceExists = false;
        
        try {
          // Get the actual name based on reference module
          switch (wu.referenceModule) {
            case 'Task':
              const task = await prisma.task.findUnique({
                where: { id: wu.referenceId },
                select: { title: true },
              });
              if (task) {
                referenceName = task.title;
                referenceExists = true;
              }
              break;
            case 'WorkOrder':
              const workOrder = await prisma.workOrder.findUnique({
                where: { id: wu.referenceId },
                select: { workOrderNumber: true },
              });
              if (workOrder) {
                referenceName = workOrder.workOrderNumber;
                referenceExists = true;
              }
              break;
            case 'RFIRequest':
              const rfi = await prisma.rFIRequest.findUnique({
                where: { id: wu.referenceId },
                select: { rfiNumber: true },
              });
              if (rfi) {
                referenceName = rfi.rfiNumber;
                referenceExists = true;
              }
              break;
            case 'DocumentSubmission':
              const doc = await prisma.documentSubmission.findUnique({
                where: { id: wu.referenceId },
                select: { submissionNumber: true, title: true },
              });
              if (doc) {
                referenceName = doc.submissionNumber || doc.title;
                referenceExists = true;
              }
              break;
            case 'AssemblyPart':
              const part = await prisma.assemblyPart.findUnique({
                where: { id: wu.referenceId },
                select: { partDesignation: true, name: true },
              });
              if (part) {
                referenceName = part.partDesignation || part.name;
                referenceExists = true;
              }
              break;
            case 'WeldingInspection':
              const welding = await prisma.weldingInspection.findUnique({
                where: { id: wu.referenceId },
                select: { id: true },
              });
              if (welding) {
                referenceName = `Welding Inspection`;
                referenceExists = true;
              }
              break;
          }
        } catch (e) {
          // Reference lookup failed
        }

        return {
          ...wu,
          referenceName: referenceName || `${wu.referenceModule} (orphaned)`,
          referenceExists,
          upstreamCount: wu.dependenciesTo.length,
          downstreamCount: wu.dependenciesFrom.length,
        };
      })
    );

    // Filter out orphaned work units (seeded data with non-existent references)
    const validWorkUnits = enrichedWorkUnits.filter(wu => wu.referenceExists);

    // Summary stats (based on valid work units only)
    const summary = {
      total: validWorkUnits.length,
      byStatus: {
        notStarted: validWorkUnits.filter(w => w.status === 'NOT_STARTED').length,
        inProgress: validWorkUnits.filter(w => w.status === 'IN_PROGRESS').length,
        blocked: validWorkUnits.filter(w => w.status === 'BLOCKED').length,
        completed: validWorkUnits.filter(w => w.status === 'COMPLETED').length,
      },
      byType: {
        design: validWorkUnits.filter(w => w.type === 'DESIGN').length,
        procurement: validWorkUnits.filter(w => w.type === 'PROCUREMENT').length,
        production: validWorkUnits.filter(w => w.type === 'PRODUCTION').length,
        qc: validWorkUnits.filter(w => w.type === 'QC').length,
        documentation: validWorkUnits.filter(w => w.type === 'DOCUMENTATION').length,
      },
    };

    return NextResponse.json({
      workUnits: validWorkUnits,
      summary,
    });
  } catch (error) {
    console.error('Error fetching work units:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch work units' },
      { status: 500 }
    );
  }
}
