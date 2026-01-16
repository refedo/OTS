/**
 * Resource Capacity API Route
 * 
 * GET /api/operations-control/capacity - Get all resource capacities with load analysis
 * POST /api/operations-control/capacity - Create a new resource capacity
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { z } from 'zod';

const createCapacitySchema = z.object({
  resourceType: z.enum(['DESIGNER', 'LASER', 'WELDER', 'QC', 'PROCUREMENT']),
  resourceId: z.string().uuid().optional().nullable(),
  resourceName: z.string().min(1),
  capacityPerDay: z.number().positive(),
  unit: z.enum(['HOURS', 'TONS', 'DRAWINGS']),
  workingDaysPerWeek: z.number().int().min(1).max(7).default(5),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all resource capacities
    const capacities = await prisma.resourceCapacity.findMany({
      where: { isActive: true },
      orderBy: [
        { resourceType: 'asc' },
        { resourceName: 'asc' },
      ],
    });

    // Calculate current load for each resource type
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Get work units in progress or planned for this week
    const activeWorkUnits = await prisma.workUnit.findMany({
      where: {
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
        OR: [
          { plannedStart: { lte: weekEnd }, plannedEnd: { gte: weekStart } },
          { actualStart: { not: null }, actualEnd: null },
        ],
      },
      select: {
        id: true,
        type: true,
        weight: true,
        quantity: true,
        ownerId: true,
        plannedStart: true,
        plannedEnd: true,
      },
    });

    // Map work unit types to resource types
    const typeToResourceMap: Record<string, string> = {
      DESIGN: 'DESIGNER',
      PROCUREMENT: 'PROCUREMENT',
      PRODUCTION: 'WELDER', // Simplified - could be LASER or WELDER
      QC: 'QC',
    };

    // Calculate load by resource type
    const loadByType: Record<string, { count: number; totalWeight: number; totalQuantity: number }> = {};
    
    activeWorkUnits.forEach(wu => {
      const resourceType = typeToResourceMap[wu.type] || wu.type;
      if (!loadByType[resourceType]) {
        loadByType[resourceType] = { count: 0, totalWeight: 0, totalQuantity: 0 };
      }
      loadByType[resourceType].count++;
      loadByType[resourceType].totalWeight += wu.weight || 0;
      loadByType[resourceType].totalQuantity += wu.quantity || 0;
    });

    // Calculate capacity vs load for each resource
    const capacityAnalysis = capacities.map(cap => {
      const load = loadByType[cap.resourceType] || { count: 0, totalWeight: 0, totalQuantity: 0 };
      const weeklyCapacity = cap.capacityPerDay * cap.workingDaysPerWeek;
      
      let currentLoad = 0;
      let loadPercentage = 0;
      
      switch (cap.unit) {
        case 'TONS':
          currentLoad = load.totalWeight;
          loadPercentage = weeklyCapacity > 0 ? (currentLoad / weeklyCapacity) * 100 : 0;
          break;
        case 'HOURS':
          // Estimate hours based on count (rough estimate: 8 hours per work unit)
          currentLoad = load.count * 8;
          loadPercentage = weeklyCapacity > 0 ? (currentLoad / weeklyCapacity) * 100 : 0;
          break;
        case 'DRAWINGS':
          currentLoad = load.totalQuantity || load.count;
          loadPercentage = weeklyCapacity > 0 ? (currentLoad / weeklyCapacity) * 100 : 0;
          break;
      }

      return {
        ...cap,
        weeklyCapacity,
        currentLoad,
        loadPercentage: Math.round(loadPercentage),
        status: loadPercentage > 100 ? 'OVERLOADED' : loadPercentage > 80 ? 'HIGH' : loadPercentage > 50 ? 'MODERATE' : 'LOW',
        activeWorkUnits: load.count,
      };
    });

    // Summary
    const summary = {
      totalResources: capacities.length,
      overloaded: capacityAnalysis.filter(c => c.status === 'OVERLOADED').length,
      highLoad: capacityAnalysis.filter(c => c.status === 'HIGH').length,
      moderate: capacityAnalysis.filter(c => c.status === 'MODERATE').length,
      low: capacityAnalysis.filter(c => c.status === 'LOW').length,
    };

    return NextResponse.json({
      capacities: capacityAnalysis,
      summary,
      period: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching capacity data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch capacity data' },
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

    // Only Admin and Manager can create capacities
    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createCapacitySchema.parse(body);

    const capacity = await prisma.resourceCapacity.create({
      data: {
        resourceType: validated.resourceType,
        resourceId: validated.resourceId,
        resourceName: validated.resourceName,
        capacityPerDay: validated.capacityPerDay,
        unit: validated.unit,
        workingDaysPerWeek: validated.workingDaysPerWeek,
        notes: validated.notes,
      },
    });

    return NextResponse.json(capacity, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating capacity:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create capacity' },
      { status: 500 }
    );
  }
}
