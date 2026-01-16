/**
 * WorkUnit API Routes - Single Item Operations
 * 
 * GET /api/work-units/[id] - Get a WorkUnit by ID
 * PATCH /api/work-units/[id] - Update a WorkUnit
 * DELETE /api/work-units/[id] - Delete a WorkUnit
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitService } from '@/lib/services/work-unit.service';
import { WorkUnitStatus } from '@prisma/client';

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

    const workUnit = await WorkUnitService.getById(params.id);

    return NextResponse.json(workUnit);
  } catch (error) {
    console.error('Error getting WorkUnit:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get WorkUnit' },
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

    // Validate status enum if provided
    if (body.status && !Object.values(WorkUnitStatus).includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(WorkUnitStatus).join(', ')}` },
        { status: 400 }
      );
    }

    // Build update input
    const updateInput: Record<string, unknown> = {};

    if (body.ownerId !== undefined) updateInput.ownerId = body.ownerId;
    if (body.plannedStart !== undefined) updateInput.plannedStart = new Date(body.plannedStart);
    if (body.plannedEnd !== undefined) updateInput.plannedEnd = new Date(body.plannedEnd);
    if (body.actualStart !== undefined) updateInput.actualStart = body.actualStart ? new Date(body.actualStart) : null;
    if (body.actualEnd !== undefined) updateInput.actualEnd = body.actualEnd ? new Date(body.actualEnd) : null;
    if (body.quantity !== undefined) updateInput.quantity = body.quantity;
    if (body.weight !== undefined) updateInput.weight = body.weight;
    if (body.status !== undefined) updateInput.status = body.status;

    const workUnit = await WorkUnitService.update(params.id, updateInput);

    return NextResponse.json(workUnit);
  } catch (error) {
    console.error('Error updating WorkUnit:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update WorkUnit' },
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

    const result = await WorkUnitService.delete(params.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting WorkUnit:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete WorkUnit' },
      { status: 500 }
    );
  }
}
