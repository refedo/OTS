/**
 * WorkUnit Creation Preview API
 * 
 * Simulates creating a WorkUnit and returns:
 * - Which existing WorkUnits would block it
 * - How much capacity it would consume
 * - Whether it would cause resource overload
 * 
 * POST /api/operations-intelligence/preview
 * Body: { projectId, type, plannedStart, plannedEnd, quantity?, weight? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

// Map WorkUnitType to ResourceType
const WORK_UNIT_TO_RESOURCE: Record<string, string> = {
  DESIGN: 'DESIGNER',
  PROCUREMENT: 'PROCUREMENT',
  PRODUCTION: 'WELDER',
  QC: 'QC',
  DOCUMENTATION: 'DESIGNER',
};

// Map WorkUnitType to CapacityUnit
const WORK_UNIT_TO_UNIT: Record<string, string> = {
  DESIGN: 'DRAWINGS',
  PROCUREMENT: 'HOURS',
  PRODUCTION: 'TONS',
  QC: 'HOURS',
  DOCUMENTATION: 'DRAWINGS',
};

// Blueprint dependency rules (simplified)
const DEPENDENCY_RULES: Record<string, string[]> = {
  PRODUCTION: ['DESIGN', 'PROCUREMENT'],
  QC: ['PRODUCTION'],
  DOCUMENTATION: ['QC'],
};

interface PreviewRequest {
  projectId: string;
  type: string;
  plannedStart: string;
  plannedEnd: string;
  quantity?: number;
  weight?: number;
}

export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PreviewRequest = await request.json();
    const { projectId, type, plannedStart, plannedEnd, quantity, weight } = body;

    if (!projectId || !type || !plannedStart || !plannedEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, type, plannedStart, plannedEnd' },
        { status: 400 }
      );
    }

    // Find potential blocking WorkUnits based on dependency rules
    const upstreamTypes = DEPENDENCY_RULES[type] || [];
    const blockingWorkUnits = await prisma.workUnit.findMany({
      where: {
        projectId,
        type: { in: upstreamTypes as any },
        status: { not: 'COMPLETED' },
      },
      include: {
        owner: { select: { name: true } },
      },
      take: 20,
    });

    // Get reference names for blocking work units
    const blockingDetails = await Promise.all(
      blockingWorkUnits.map(async (wu) => {
        let referenceName = wu.referenceId.slice(0, 8);
        try {
          switch (wu.referenceModule) {
            case 'Task':
              const task = await prisma.task.findUnique({
                where: { id: wu.referenceId },
                select: { title: true },
              });
              referenceName = task?.title || referenceName;
              break;
            case 'WorkOrder':
              const wo = await prisma.workOrder.findUnique({
                where: { id: wu.referenceId },
                select: { workOrderNumber: true },
              });
              referenceName = wo?.workOrderNumber || referenceName;
              break;
            case 'RFIRequest':
              const rfi = await prisma.rFIRequest.findUnique({
                where: { id: wu.referenceId },
                select: { rfiNumber: true },
              });
              referenceName = rfi?.rfiNumber || referenceName;
              break;
          }
        } catch {}

        return {
          id: wu.id,
          type: wu.type,
          status: wu.status,
          referenceName,
          ownerName: wu.owner.name,
          plannedEnd: wu.plannedEnd.toISOString(),
          isBlocking: wu.status !== 'COMPLETED',
        };
      })
    );

    // Calculate capacity impact
    const resourceType = WORK_UNIT_TO_RESOURCE[type] || 'DESIGNER';
    const unit = WORK_UNIT_TO_UNIT[type] || 'HOURS';

    let estimatedLoad = 0;
    if (unit === 'TONS' && weight) {
      estimatedLoad = weight;
    } else if (unit === 'DRAWINGS' && quantity) {
      estimatedLoad = quantity;
    } else if (quantity) {
      estimatedLoad = quantity;
    } else {
      // Estimate based on duration
      const durationDays = Math.ceil(
        (new Date(plannedEnd).getTime() - new Date(plannedStart).getTime()) / (1000 * 60 * 60 * 24)
      );
      estimatedLoad = durationDays * 8;
    }

    // Get current capacity for this resource type
    const capacity = await prisma.resourceCapacity.findFirst({
      where: {
        resourceType: resourceType as any,
        isActive: true,
      },
    });

    // Calculate current load for the week of plannedStart
    const weekStart = new Date(plannedStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const existingWorkUnits = await prisma.workUnit.findMany({
      where: {
        status: { not: 'COMPLETED' },
        plannedStart: { lte: weekEnd },
        plannedEnd: { gte: weekStart },
      },
    });

    // Calculate existing load for this resource type
    let currentLoad = 0;
    for (const wu of existingWorkUnits) {
      const wuResourceType = WORK_UNIT_TO_RESOURCE[wu.type];
      if (wuResourceType === resourceType) {
        const wuUnit = WORK_UNIT_TO_UNIT[wu.type];
        if (wuUnit === 'TONS' && wu.weight) {
          currentLoad += wu.weight;
        } else if (wu.quantity) {
          currentLoad += wu.quantity;
        } else {
          const durationDays = Math.ceil(
            (wu.plannedEnd.getTime() - wu.plannedStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          currentLoad += durationDays * 8;
        }
      }
    }

    const weeklyCapacity = capacity ? capacity.capacityPerDay * capacity.workingDaysPerWeek : 0;
    const currentUtilization = weeklyCapacity > 0 ? (currentLoad / weeklyCapacity) * 100 : 0;
    const newUtilization = weeklyCapacity > 0 ? ((currentLoad + estimatedLoad) / weeklyCapacity) * 100 : 0;
    const wouldOverload = newUtilization > 100;

    // Get project info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectNumber: true, name: true },
    });

    return NextResponse.json({
      preview: {
        projectId,
        projectNumber: project?.projectNumber,
        projectName: project?.name,
        type,
        plannedStart,
        plannedEnd,
      },
      blocking: {
        count: blockingDetails.filter((b) => b.isBlocking).length,
        workUnits: blockingDetails,
        isBlocked: blockingDetails.some((b) => b.isBlocking),
        message: blockingDetails.some((b) => b.isBlocking)
          ? `This ${type} WorkUnit will be blocked by ${blockingDetails.filter((b) => b.isBlocking).length} incomplete upstream work items`
          : 'No blocking dependencies - ready to start',
      },
      capacity: {
        resourceType,
        unit,
        estimatedLoad,
        currentLoad: Math.round(currentLoad * 100) / 100,
        newLoad: Math.round((currentLoad + estimatedLoad) * 100) / 100,
        weeklyCapacity: weeklyCapacity || 'Not configured',
        currentUtilization: Math.round(currentUtilization),
        newUtilization: Math.round(newUtilization),
        wouldOverload,
        message: wouldOverload
          ? `⚠️ Adding this WorkUnit would overload ${resourceType} capacity (${Math.round(newUtilization)}%)`
          : capacity
          ? `✓ Capacity OK - ${resourceType} will be at ${Math.round(newUtilization)}% utilization`
          : `⚠️ No capacity configured for ${resourceType}`,
      },
      recommendation: {
        canProceed: !blockingDetails.some((b) => b.isBlocking) && !wouldOverload,
        warnings: [
          ...(blockingDetails.some((b) => b.isBlocking)
            ? [`Blocked by ${blockingDetails.filter((b) => b.isBlocking).length} upstream work items`]
            : []),
          ...(wouldOverload ? [`Would overload ${resourceType} capacity`] : []),
          ...(!capacity ? [`No capacity configured for ${resourceType}`] : []),
        ],
      },
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
