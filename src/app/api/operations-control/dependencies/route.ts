/**
 * Dependencies API Route
 * 
 * GET /api/operations-control/dependencies - Get dependency graph data
 * POST /api/operations-control/dependencies - Create a new dependency
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { z } from 'zod';

const createDependencySchema = z.object({
  fromWorkUnitId: z.string().uuid(),
  toWorkUnitId: z.string().uuid(),
  dependencyType: z.enum(['FS', 'SS', 'FF']).default('FS'),
  lagDays: z.number().int().default(0),
});

// Helper to get reference name and check if it exists
async function getReferenceName(referenceModule: string, referenceId: string): Promise<{ name: string; exists: boolean }> {
  try {
    switch (referenceModule) {
      case 'Task':
        const task = await prisma.task.findUnique({
          where: { id: referenceId },
          select: { title: true },
        });
        return { name: task?.title || referenceId, exists: !!task };
      case 'WorkOrder':
        const workOrder = await prisma.workOrder.findUnique({
          where: { id: referenceId },
          select: { workOrderNumber: true },
        });
        return { name: workOrder?.workOrderNumber || referenceId, exists: !!workOrder };
      case 'RFIRequest':
        const rfi = await prisma.rFIRequest.findUnique({
          where: { id: referenceId },
          select: { rfiNumber: true },
        });
        return { name: rfi?.rfiNumber || referenceId, exists: !!rfi };
      case 'DocumentSubmission':
        const doc = await prisma.documentSubmission.findUnique({
          where: { id: referenceId },
          select: { submissionNumber: true, title: true },
        });
        return { name: doc?.submissionNumber || doc?.title || referenceId, exists: !!doc };
      case 'AssemblyPart':
        const part = await prisma.assemblyPart.findUnique({
          where: { id: referenceId },
          select: { partDesignation: true, name: true },
        });
        return { name: part?.partDesignation || part?.name || referenceId, exists: !!part };
      default:
        return { name: referenceId, exists: false };
    }
  } catch {
    return { name: referenceId, exists: false };
  }
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Get all work units with dependencies
    const workUnits = await prisma.workUnit.findMany({
      where: projectId ? { projectId } : {},
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        owner: {
          select: { id: true, name: true },
        },
        dependenciesFrom: {
          include: {
            toWorkUnit: {
              select: {
                id: true,
                referenceModule: true,
                referenceId: true,
                type: true,
                status: true,
                plannedStart: true,
                plannedEnd: true,
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
                type: true,
                status: true,
                plannedStart: true,
                plannedEnd: true,
              },
            },
          },
        },
      },
    });

    // Build nodes and edges for graph visualization
    const nodesWithExists = await Promise.all(
      workUnits.map(async (wu) => {
        const ref = await getReferenceName(wu.referenceModule, wu.referenceId);
        return {
          id: wu.id,
          label: ref.name,
          exists: ref.exists,
          type: wu.type,
          status: wu.status,
          referenceModule: wu.referenceModule,
          referenceId: wu.referenceId,
          projectNumber: wu.project.projectNumber,
          owner: wu.owner.name,
          plannedStart: wu.plannedStart,
          plannedEnd: wu.plannedEnd,
          actualStart: wu.actualStart,
          actualEnd: wu.actualEnd,
          upstreamCount: wu.dependenciesTo.length,
          downstreamCount: wu.dependenciesFrom.length,
          isCritical: false, // Will be calculated
        };
      })
    );

    // Filter out orphaned work units (seeded data with non-existent references)
    const nodes = nodesWithExists.filter(n => n.exists);

    // Build edges (only for valid nodes)
    const validNodeIds = new Set(nodes.map(n => n.id));
    const edges: Array<{
      id: string;
      from: string;
      to: string;
      type: string;
      lagDays: number;
      fromLabel: string;
      toLabel: string;
    }> = [];

    for (const wu of workUnits) {
      // Skip if this work unit is not in valid nodes
      if (!validNodeIds.has(wu.id)) continue;
      
      for (const dep of wu.dependenciesFrom) {
        // Skip if target work unit is not in valid nodes
        if (!validNodeIds.has(dep.toWorkUnitId)) continue;
        
        const fromRef = await getReferenceName(wu.referenceModule, wu.referenceId);
        const toRef = await getReferenceName(dep.toWorkUnit.referenceModule, dep.toWorkUnit.referenceId);
        
        edges.push({
          id: dep.id,
          from: wu.id,
          to: dep.toWorkUnitId,
          type: dep.dependencyType,
          lagDays: dep.lagDays,
          fromLabel: fromRef.name,
          toLabel: toRef.name,
        });
      }
    }

    // Calculate critical path (simplified - nodes with most downstream dependencies)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    // Mark nodes on critical path (simplified algorithm)
    // A node is critical if it has downstream dependencies and is not completed
    for (const node of nodes) {
      if (node.downstreamCount > 0 && node.status !== 'COMPLETED') {
        node.isCritical = true;
      }
    }

    // Summary
    const summary = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      criticalNodes: nodes.filter(n => n.isCritical).length,
      byDependencyType: {
        FS: edges.filter(e => e.type === 'FS').length,
        SS: edges.filter(e => e.type === 'SS').length,
        FF: edges.filter(e => e.type === 'FF').length,
      },
      blockedNodes: nodes.filter(n => n.status === 'BLOCKED').length,
    };

    return NextResponse.json({
      nodes,
      edges,
      summary,
    });
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dependencies' },
      { status: 500 }
    );
  }
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

    const body = await request.json();
    const validated = createDependencySchema.parse(body);

    // Check that both work units exist
    const [fromWU, toWU] = await Promise.all([
      prisma.workUnit.findUnique({ where: { id: validated.fromWorkUnitId } }),
      prisma.workUnit.findUnique({ where: { id: validated.toWorkUnitId } }),
    ]);

    if (!fromWU || !toWU) {
      return NextResponse.json({ error: 'One or both work units not found' }, { status: 404 });
    }

    // Prevent self-dependency
    if (validated.fromWorkUnitId === validated.toWorkUnitId) {
      return NextResponse.json({ error: 'Cannot create self-dependency' }, { status: 400 });
    }

    // Check for existing dependency
    const existing = await prisma.workUnitDependency.findUnique({
      where: {
        fromWorkUnitId_toWorkUnitId: {
          fromWorkUnitId: validated.fromWorkUnitId,
          toWorkUnitId: validated.toWorkUnitId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Dependency already exists' }, { status: 400 });
    }

    const dependency = await prisma.workUnitDependency.create({
      data: {
        fromWorkUnitId: validated.fromWorkUnitId,
        toWorkUnitId: validated.toWorkUnitId,
        dependencyType: validated.dependencyType,
        lagDays: validated.lagDays,
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating dependency:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create dependency' },
      { status: 500 }
    );
  }
}
