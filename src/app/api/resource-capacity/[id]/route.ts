/**
 * ResourceCapacity API Routes - Single Item Operations
 * 
 * GET /api/resource-capacity/[id] - Get a resource capacity by ID
 * PATCH /api/resource-capacity/[id] - Update a resource capacity
 * DELETE /api/resource-capacity/[id] - Delete a resource capacity
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { ResourceCapacityService } from '@/lib/services/resource-capacity.service';
import { CapacityUnit } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capacity = await ResourceCapacityService.getById(params.id);

    return NextResponse.json(capacity);
  } catch (error) {
    console.error('Error getting resource capacity:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get resource capacity' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate unit if provided
    if (body.unit && !Object.values(CapacityUnit).includes(body.unit)) {
      return NextResponse.json(
        { error: `Invalid unit. Must be one of: ${Object.values(CapacityUnit).join(', ')}` },
        { status: 400 }
      );
    }

    if (body.capacityPerDay !== undefined && body.capacityPerDay <= 0) {
      return NextResponse.json(
        { error: 'capacityPerDay must be a positive number' },
        { status: 400 }
      );
    }

    const capacity = await ResourceCapacityService.update(params.id, {
      resourceName: body.resourceName,
      capacityPerDay: body.capacityPerDay,
      unit: body.unit,
      workingDaysPerWeek: body.workingDaysPerWeek,
      isActive: body.isActive,
      notes: body.notes,
    });

    return NextResponse.json(capacity);
  } catch (error) {
    console.error('Error updating resource capacity:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update resource capacity' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await ResourceCapacityService.delete(params.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting resource capacity:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete resource capacity' },
      { status: 500 }
    );
  }
}
