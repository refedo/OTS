/**
 * Operations Control API Route
 * 
 * GET /api/operations-control - Get read-only operations control data
 * Returns: Active risks, affected projects, recommended actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

// Helper to get reference name from WorkUnit
async function getReferenceName(referenceModule: string, referenceId: string): Promise<string> {
  try {
    switch (referenceModule) {
      case 'Task':
        const task = await prisma.task.findUnique({
          where: { id: referenceId },
          select: { title: true },
        });
        return task?.title || referenceId;
      case 'WorkOrder':
        const workOrder = await prisma.workOrder.findUnique({
          where: { id: referenceId },
          select: { workOrderNumber: true },
        });
        return workOrder?.workOrderNumber || referenceId;
      case 'RFIRequest':
        const rfi = await prisma.rFIRequest.findUnique({
          where: { id: referenceId },
          select: { rfiNumber: true },
        });
        return rfi?.rfiNumber || referenceId;
      case 'DocumentSubmission':
        const doc = await prisma.documentSubmission.findUnique({
          where: { id: referenceId },
          select: { submissionNumber: true, title: true },
        });
        return doc?.submissionNumber || doc?.title || referenceId;
      case 'AssemblyPart':
        const part = await prisma.assemblyPart.findUnique({
          where: { id: referenceId },
          select: { partDesignation: true, name: true },
        });
        return part?.partDesignation || part?.name || referenceId;
      default:
        return referenceId;
    }
  } catch {
    return referenceId;
  }
}

// Helper to replace IDs with names in reason text
async function enrichReasonText(reason: string, workUnitIds: string[]): Promise<string> {
  let enrichedReason = reason;
  
  // Get all work units
  const workUnits = await prisma.workUnit.findMany({
    where: { id: { in: workUnitIds } },
    select: { id: true, referenceModule: true, referenceId: true },
  });

  // Also extract module:id patterns directly from the reason text
  const moduleIdPattern = /(Task|WorkOrder|RFIRequest|DocumentSubmission|AssemblyPart):([a-f0-9-]{36})/gi;
  const matches = [...reason.matchAll(moduleIdPattern)];
  
  // Build a map of referenceId -> name for direct lookups
  const referenceIdToName = new Map<string, { module: string; name: string }>();
  
  for (const match of matches) {
    const module = match[1];
    const refId = match[2];
    if (!referenceIdToName.has(refId)) {
      const name = await getReferenceName(module, refId);
      referenceIdToName.set(refId, { module, name });
    }
  }

  // Replace module:id patterns with human-readable names
  for (const [refId, { module, name }] of referenceIdToName) {
    // Replace "Module:uuid" pattern
    enrichedReason = enrichedReason.replace(
      new RegExp(`${module}:${refId}`, 'gi'),
      `${module} "${name}"`
    );
  }

  // Replace each WorkUnit ID with its name
  for (const wu of workUnits) {
    const name = await getReferenceName(wu.referenceModule, wu.referenceId);
    
    // Replace WorkUnit "id" pattern
    enrichedReason = enrichedReason.replace(
      new RegExp(`WorkUnit\\s*["']${wu.id}["']`, 'gi'),
      `${wu.referenceModule} "${name}"`
    );
    
    // Replace bare UUIDs that match work unit IDs
    enrichedReason = enrichedReason.replace(
      new RegExp(`"${wu.id}"`, 'g'),
      `"${name}"`
    );
    
    // Replace bare UUID (only if it's a standalone UUID, not part of a larger string)
    enrichedReason = enrichedReason.replace(
      new RegExp(`\\b${wu.id}\\b`, 'g'),
      `"${name}"`
    );
  }

  // Clean up any remaining bare UUIDs in the text by looking them up
  const remainingUuids = enrichedReason.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi) || [];
  for (const uuid of remainingUuids) {
    // Try to find this UUID in our work units
    const wu = workUnits.find(w => w.referenceId === uuid);
    if (wu) {
      const name = await getReferenceName(wu.referenceModule, wu.referenceId);
      enrichedReason = enrichedReason.replace(new RegExp(uuid, 'g'), `"${name}"`);
    }
  }

  return enrichedReason;
}

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active (unresolved) risk events sorted by severity
    const allRiskEvents = await prisma.riskEvent.findMany({
      where: { resolvedAt: null },
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' },
      ],
    });

    // Get all work unit IDs from risks to check which are valid
    const allWorkUnitIds = new Set<string>();
    allRiskEvents.forEach((r) => {
      const workUnitIds = r.affectedWorkUnitIds as string[];
      workUnitIds.forEach((id) => allWorkUnitIds.add(id));
    });

    // Check which work units actually exist and have valid references
    const existingWorkUnits = await prisma.workUnit.findMany({
      where: { id: { in: Array.from(allWorkUnitIds) } },
      select: { id: true, referenceModule: true, referenceId: true },
    });

    // Verify each work unit has a valid reference
    const validWorkUnitIds = new Set<string>();
    for (const wu of existingWorkUnits) {
      let exists = false;
      try {
        switch (wu.referenceModule) {
          case 'Task':
            exists = !!(await prisma.task.findUnique({ where: { id: wu.referenceId }, select: { id: true } }));
            break;
          case 'WorkOrder':
            exists = !!(await prisma.workOrder.findUnique({ where: { id: wu.referenceId }, select: { id: true } }));
            break;
          case 'RFIRequest':
            exists = !!(await prisma.rFIRequest.findUnique({ where: { id: wu.referenceId }, select: { id: true } }));
            break;
          case 'DocumentSubmission':
            exists = !!(await prisma.documentSubmission.findUnique({ where: { id: wu.referenceId }, select: { id: true } }));
            break;
          case 'AssemblyPart':
            exists = !!(await prisma.assemblyPart.findUnique({ where: { id: wu.referenceId }, select: { id: true } }));
            break;
        }
      } catch { /* ignore */ }
      if (exists) validWorkUnitIds.add(wu.id);
    }

    // Filter out risks that only reference orphaned work units
    const riskEvents = allRiskEvents.filter((r) => {
      const workUnitIds = r.affectedWorkUnitIds as string[];
      // Keep risk if it has no work units OR at least one valid work unit
      return workUnitIds.length === 0 || workUnitIds.some(id => validWorkUnitIds.has(id));
    });

    // Get unique project IDs from filtered risks
    const allProjectIds = new Set<string>();
    riskEvents.forEach((r) => {
      const projectIds = r.affectedProjectIds as string[];
      projectIds.forEach((id) => allProjectIds.add(id));
    });

    // Fetch project details
    const projects = await prisma.project.findMany({
      where: { id: { in: Array.from(allProjectIds) } },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        client: { select: { name: true } },
      },
    });

    const projectMap = new Map(projects.map((p) => [p.id, p]));

    // Calculate risk counts per project
    const projectRiskCounts: Record<string, { total: number; critical: number; high: number; medium: number; low: number }> = {};
    
    riskEvents.forEach((r) => {
      const projectIds = r.affectedProjectIds as string[];
      projectIds.forEach((id) => {
        if (!projectRiskCounts[id]) {
          projectRiskCounts[id] = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
        }
        projectRiskCounts[id].total++;
        if (r.severity === 'CRITICAL') projectRiskCounts[id].critical++;
        if (r.severity === 'HIGH') projectRiskCounts[id].high++;
        if (r.severity === 'MEDIUM') projectRiskCounts[id].medium++;
        if (r.severity === 'LOW') projectRiskCounts[id].low++;
      });
    });

    // Build affected projects list
    const affectedProjects = Object.entries(projectRiskCounts)
      .map(([id, counts]) => {
        const project = projectMap.get(id);
        return {
          id,
          projectNumber: project?.projectNumber || 'Unknown',
          name: project?.name || 'Unknown',
          status: project?.status || 'Unknown',
          clientName: project?.client?.name || 'Unknown',
          ...counts,
        };
      })
      .sort((a, b) => b.critical - a.critical || b.high - a.high || b.total - a.total);

    // Collect unique recommended actions from critical and high risks with enriched text
    const priorityActions = await Promise.all(
      riskEvents
        .filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH')
        .map(async (r) => {
          const workUnitIds = r.affectedWorkUnitIds as string[];
          const enrichedAction = await enrichReasonText(r.recommendedAction, workUnitIds);
          return {
            riskId: r.id,
            severity: r.severity,
            type: r.type,
            action: enrichedAction,
          };
        })
    );

    // Summary counts
    const summary = {
      totalRisks: riskEvents.length,
      bySeverity: {
        critical: riskEvents.filter((r) => r.severity === 'CRITICAL').length,
        high: riskEvents.filter((r) => r.severity === 'HIGH').length,
        medium: riskEvents.filter((r) => r.severity === 'MEDIUM').length,
        low: riskEvents.filter((r) => r.severity === 'LOW').length,
      },
      byType: {
        delay: riskEvents.filter((r) => r.type === 'DELAY').length,
        bottleneck: riskEvents.filter((r) => r.type === 'BOTTLENECK').length,
        dependency: riskEvents.filter((r) => r.type === 'DEPENDENCY').length,
        overload: riskEvents.filter((r) => r.type === 'OVERLOAD').length,
      },
      affectedProjectCount: affectedProjects.length,
    };

    // Format risk events for display with enriched reason text
    const formattedRisks = await Promise.all(
      riskEvents.map(async (r) => {
        const projectIds = r.affectedProjectIds as string[];
        const workUnitIds = r.affectedWorkUnitIds as string[];
        const projectNumbers = projectIds
          .map((id) => projectMap.get(id)?.projectNumber)
          .filter(Boolean);

        // Enrich reason text to replace IDs with human-readable names
        const enrichedReason = await enrichReasonText(r.reason, workUnitIds);

        return {
          id: r.id,
          severity: r.severity,
          type: r.type,
          reason: enrichedReason,
          recommendedAction: r.recommendedAction,
          affectedProjects: projectNumbers,
          detectedAt: r.detectedAt,
          metadata: r.metadata,
        };
      })
    );

    return NextResponse.json({
      summary,
      risks: formattedRisks,
      affectedProjects,
      priorityActions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching operations control data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch operations control data' },
      { status: 500 }
    );
  }
}
