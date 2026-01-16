/**
 * Operations Intelligence API
 * 
 * Unified endpoint for WorkUnits, Dependencies, and Capacity data
 * Supports filtering by project and building
 * 
 * GET /api/operations-intelligence
 * Query params:
 *   - projectId: Filter by project
 *   - buildingId: Filter by building (requires projectId)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { ResourceCapacityService } from '@/lib/services/resource-capacity.service';

interface WorkUnitWithDetails {
  id: string;
  type: string;
  status: string;
  referenceModule: string;
  referenceId: string;
  referenceName: string;
  ownerId: string;
  ownerName: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  buildingId?: string;
  buildingDesignation?: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  quantity?: number;
  weight?: number;
  // Dependency info
  blockedBy: Array<{
    id: string;
    type: string;
    status: string;
    referenceName: string;
    dependencyType: string;
    lagDays: number;
  }>;
  blocks: Array<{
    id: string;
    type: string;
    status: string;
    referenceName: string;
    dependencyType: string;
    lagDays: number;
  }>;
  isBlocked: boolean;
  // Capacity info
  capacityImpact: {
    resourceType: string;
    load: number;
    unit: string;
  } | null;
}

interface CapacitySummary {
  resourceType: string;
  resourceName: string;
  capacityPerDay: number;
  unit: string;
  currentLoad: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  workUnitCount: number;
}

interface DependencyEdge {
  id: string;
  fromId: string;
  toId: string;
  fromType: string;
  toType: string;
  fromName: string;
  toName: string;
  dependencyType: string;
  lagDays: number;
}

// Helper to get reference name
async function getReferenceName(referenceModule: string, referenceId: string): Promise<string> {
  try {
    switch (referenceModule) {
      case 'Task':
        const task = await prisma.task.findUnique({
          where: { id: referenceId },
          select: { title: true },
        });
        return task?.title || referenceId.slice(0, 8);
      case 'WorkOrder':
        const workOrder = await prisma.workOrder.findUnique({
          where: { id: referenceId },
          select: { workOrderNumber: true, name: true },
        });
        return workOrder?.workOrderNumber || workOrder?.name || referenceId.slice(0, 8);
      case 'RFIRequest':
        const rfi = await prisma.rFIRequest.findUnique({
          where: { id: referenceId },
          select: { rfiNumber: true },
        });
        return rfi?.rfiNumber || referenceId.slice(0, 8);
      case 'DocumentSubmission':
        const doc = await prisma.documentSubmission.findUnique({
          where: { id: referenceId },
          select: { submissionNumber: true, title: true },
        });
        return doc?.submissionNumber || doc?.title || referenceId.slice(0, 8);
      default:
        return referenceId.slice(0, 8);
    }
  } catch {
    return referenceId.slice(0, 8);
  }
}

// Helper to get building info from reference
async function getBuildingInfo(referenceModule: string, referenceId: string): Promise<{ id: string; designation: string } | null> {
  try {
    switch (referenceModule) {
      case 'WorkOrder':
        const workOrder = await prisma.workOrder.findUnique({
          where: { id: referenceId },
          select: { buildingId: true, building: { select: { designation: true } } },
        });
        if (workOrder?.buildingId) {
          return { id: workOrder.buildingId, designation: workOrder.building?.designation || 'Unknown' };
        }
        break;
      case 'RFIRequest':
        const rfi = await prisma.rFIRequest.findUnique({
          where: { id: referenceId },
          select: { buildingId: true, building: { select: { designation: true } } },
        });
        if (rfi?.buildingId) {
          return { id: rfi.buildingId, designation: rfi.building?.designation || 'Unknown' };
        }
        break;
      case 'DocumentSubmission':
        const doc = await prisma.documentSubmission.findUnique({
          where: { id: referenceId },
          select: { buildingId: true, building: { select: { designation: true } } },
        });
        if (doc?.buildingId) {
          return { id: doc.buildingId, designation: doc.building?.designation || 'Unknown' };
        }
        break;
    }
    return null;
  } catch {
    return null;
  }
}

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
    const buildingId = searchParams.get('buildingId');

    // Build where clause for WorkUnits
    const whereClause: Record<string, unknown> = {};
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Fetch all WorkUnits with dependencies
    const workUnits = await prisma.workUnit.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        owner: { select: { id: true, name: true } },
        dependenciesTo: {
          include: {
            fromWorkUnit: {
              select: { id: true, type: true, status: true, referenceModule: true, referenceId: true },
            },
          },
        },
        dependenciesFrom: {
          include: {
            toWorkUnit: {
              select: { id: true, type: true, status: true, referenceModule: true, referenceId: true },
            },
          },
        },
      },
      orderBy: [{ plannedStart: 'asc' }, { type: 'asc' }],
    });

    // Process WorkUnits with additional details
    const processedWorkUnits: WorkUnitWithDetails[] = [];
    const allDependencyEdges: DependencyEdge[] = [];
    const buildingCache: Map<string, { id: string; designation: string } | null> = new Map();

    for (const wu of workUnits) {
      // Get reference name
      const referenceName = await getReferenceName(wu.referenceModule, wu.referenceId);

      // Get building info (with caching)
      let buildingInfo = buildingCache.get(wu.referenceId);
      if (buildingInfo === undefined) {
        buildingInfo = await getBuildingInfo(wu.referenceModule, wu.referenceId);
        buildingCache.set(wu.referenceId, buildingInfo);
      }

      // Filter by building if specified
      if (buildingId && buildingInfo?.id !== buildingId) {
        continue;
      }

      // Process blockedBy (upstream dependencies)
      const blockedBy = await Promise.all(
        wu.dependenciesTo.map(async (dep) => {
          const fromName = await getReferenceName(dep.fromWorkUnit.referenceModule, dep.fromWorkUnit.referenceId);
          return {
            id: dep.fromWorkUnit.id,
            type: dep.fromWorkUnit.type,
            status: dep.fromWorkUnit.status,
            referenceName: fromName,
            dependencyType: dep.dependencyType,
            lagDays: dep.lagDays,
          };
        })
      );

      // Process blocks (downstream dependencies)
      const blocks = await Promise.all(
        wu.dependenciesFrom.map(async (dep) => {
          const toName = await getReferenceName(dep.toWorkUnit.referenceModule, dep.toWorkUnit.referenceId);
          return {
            id: dep.toWorkUnit.id,
            type: dep.toWorkUnit.type,
            status: dep.toWorkUnit.status,
            referenceName: toName,
            dependencyType: dep.dependencyType,
            lagDays: dep.lagDays,
          };
        })
      );

      // Check if blocked (any upstream dependency not completed)
      const isBlocked = blockedBy.some(
        (dep) => dep.status !== 'COMPLETED' && dep.dependencyType === 'FS'
      );

      // Calculate capacity impact
      const resourceType = WORK_UNIT_TO_RESOURCE[wu.type] || 'DESIGNER';
      const unit = WORK_UNIT_TO_UNIT[wu.type] || 'HOURS';
      let load = 0;
      if (unit === 'TONS' && wu.weight) {
        load = wu.weight;
      } else if (unit === 'DRAWINGS' && wu.quantity) {
        load = wu.quantity;
      } else if (wu.quantity) {
        load = wu.quantity;
      } else {
        // Estimate hours based on duration
        const durationDays = Math.ceil(
          (new Date(wu.plannedEnd).getTime() - new Date(wu.plannedStart).getTime()) / (1000 * 60 * 60 * 24)
        );
        load = durationDays * 8; // 8 hours per day
      }

      processedWorkUnits.push({
        id: wu.id,
        type: wu.type,
        status: wu.status,
        referenceModule: wu.referenceModule,
        referenceId: wu.referenceId,
        referenceName,
        ownerId: wu.ownerId,
        ownerName: wu.owner.name,
        projectId: wu.projectId,
        projectNumber: wu.project.projectNumber,
        projectName: wu.project.name,
        buildingId: buildingInfo?.id,
        buildingDesignation: buildingInfo?.designation,
        plannedStart: wu.plannedStart.toISOString(),
        plannedEnd: wu.plannedEnd.toISOString(),
        actualStart: wu.actualStart?.toISOString(),
        actualEnd: wu.actualEnd?.toISOString(),
        quantity: wu.quantity || undefined,
        weight: wu.weight || undefined,
        blockedBy,
        blocks,
        isBlocked,
        capacityImpact: {
          resourceType,
          load,
          unit,
        },
      });

      // Collect dependency edges for graph
      for (const dep of wu.dependenciesFrom) {
        const toName = await getReferenceName(dep.toWorkUnit.referenceModule, dep.toWorkUnit.referenceId);
        allDependencyEdges.push({
          id: dep.id,
          fromId: wu.id,
          toId: dep.toWorkUnit.id,
          fromType: wu.type,
          toType: dep.toWorkUnit.type,
          fromName: referenceName,
          toName,
          dependencyType: dep.dependencyType,
          lagDays: dep.lagDays,
        });
      }
    }

    // Get capacity summary
    const capacities = await prisma.resourceCapacity.findMany({
      where: { isActive: true },
    });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const capacitySummaries: CapacitySummary[] = [];

    for (const cap of capacities) {
      // Calculate current load for this resource type
      const relevantWorkUnits = processedWorkUnits.filter(
        (wu) =>
          wu.capacityImpact?.resourceType === cap.resourceType &&
          wu.status !== 'COMPLETED' &&
          new Date(wu.plannedStart) <= weekEnd &&
          new Date(wu.plannedEnd) >= weekStart
      );

      const currentLoad = relevantWorkUnits.reduce(
        (sum, wu) => sum + (wu.capacityImpact?.load || 0),
        0
      );

      const weeklyCapacity = cap.capacityPerDay * cap.workingDaysPerWeek;
      const utilizationPercent = weeklyCapacity > 0 ? (currentLoad / weeklyCapacity) * 100 : 0;

      capacitySummaries.push({
        resourceType: cap.resourceType,
        resourceName: cap.resourceName,
        capacityPerDay: cap.capacityPerDay,
        unit: cap.unit,
        currentLoad,
        utilizationPercent: Math.round(utilizationPercent),
        isOverloaded: utilizationPercent > 100,
        workUnitCount: relevantWorkUnits.length,
      });
    }

    // Get projects for filter dropdown
    const projects = await prisma.project.findMany({
      where: { status: { not: 'Completed' } },
      select: { id: true, projectNumber: true, name: true },
      orderBy: { projectNumber: 'asc' },
    });

    // Get buildings for filter dropdown (if project selected)
    let buildings: Array<{ id: string; designation: string; projectId: string }> = [];
    if (projectId) {
      buildings = await prisma.building.findMany({
        where: { projectId },
        select: { id: true, designation: true, projectId: true },
        orderBy: { designation: 'asc' },
      });
    }

    // Summary stats
    const summary = {
      totalWorkUnits: processedWorkUnits.length,
      byStatus: {
        notStarted: processedWorkUnits.filter((wu) => wu.status === 'NOT_STARTED').length,
        inProgress: processedWorkUnits.filter((wu) => wu.status === 'IN_PROGRESS').length,
        blocked: processedWorkUnits.filter((wu) => wu.status === 'BLOCKED').length,
        completed: processedWorkUnits.filter((wu) => wu.status === 'COMPLETED').length,
      },
      byType: {
        design: processedWorkUnits.filter((wu) => wu.type === 'DESIGN').length,
        procurement: processedWorkUnits.filter((wu) => wu.type === 'PROCUREMENT').length,
        production: processedWorkUnits.filter((wu) => wu.type === 'PRODUCTION').length,
        qc: processedWorkUnits.filter((wu) => wu.type === 'QC').length,
        documentation: processedWorkUnits.filter((wu) => wu.type === 'DOCUMENTATION').length,
      },
      blockedCount: processedWorkUnits.filter((wu) => wu.isBlocked).length,
      totalDependencies: allDependencyEdges.length,
      overloadedResources: capacitySummaries.filter((c) => c.isOverloaded).length,
    };

    return NextResponse.json({
      workUnits: processedWorkUnits,
      dependencies: allDependencyEdges,
      capacities: capacitySummaries,
      summary,
      filters: {
        projects,
        buildings,
        selectedProjectId: projectId,
        selectedBuildingId: buildingId,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching operations intelligence data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
